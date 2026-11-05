
from functools import lru_cache

from sentence_transformers import SentenceTransformer, util

from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import (
    Habilidad,
    UsuarioHabilidad,
)
from app.modules.vacantes.models import (
    Vacante,
    VacanteHabilidad,
)


# Modelo multilingüe compatible con textos en español.
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


@lru_cache(maxsize=1)
def obtener_modelo():
    """Carga el modelo una sola vez por proceso."""
    return SentenceTransformer(MODEL_NAME)


def calcular_compatibilidad(db, usuario_id: int, vacante_id: int) -> float:
    """Calcula un índice de compatibilidad entre 0 y 100."""

    modelo = obtener_modelo()

    perfil = db.query(Perfil).filter(
        Perfil.usuario_id == usuario_id
    ).first()

    vacante = db.query(Vacante).filter(
        Vacante.id == vacante_id
    ).first()

    if perfil is None:
        raise ValueError("El candidato no tiene un perfil registrado.")

    if vacante is None:
        raise ValueError("La vacante no existe.")

    # Obtener las habilidades del candidato.
    habilidades_usuario = (
        db.query(Habilidad.nombre)
        .join(
            UsuarioHabilidad,
            UsuarioHabilidad.habilidad_id == Habilidad.id,
        )
        .filter(UsuarioHabilidad.usuario_id == usuario_id)
        .all()
    )

    nombres_usuario = [fila[0] for fila in habilidades_usuario]

    # Obtener las habilidades requeridas por la vacante.
    habilidades_vacante = (
        db.query(Habilidad.nombre)
        .join(
            VacanteHabilidad,
            VacanteHabilidad.habilidad_id == Habilidad.id,
        )
        .filter(VacanteHabilidad.vacante_id == vacante_id)
        .all()
    )

    nombres_requeridos = [fila[0] for fila in habilidades_vacante]

    texto_perfil = " ".join(filter(None, [
        perfil.resumen_profesional,
        perfil.formacion_academica,
        perfil.experiencia_laboral,
        "Habilidades: " + ", ".join(nombres_usuario),
    ])).strip()

    texto_vacante = " ".join(filter(None, [
        vacante.titulo,
        vacante.descripcion,
        vacante.requisitos,
        "Habilidades requeridas: " + ", ".join(nombres_requeridos),
    ])).strip()

    if not texto_perfil:
        raise ValueError(
            "El perfil no tiene información suficiente para comparar."
        )

    if not texto_vacante:
        raise ValueError(
            "La vacante no tiene información suficiente para comparar."
        )

    # Comparación semántica del perfil completo con la vacante.
    embedding_perfil = modelo.encode(
        texto_perfil,
        convert_to_tensor=True,
        normalize_embeddings=True,
    )

    embedding_vacante = modelo.encode(
        texto_vacante,
        convert_to_tensor=True,
        normalize_embeddings=True,
    )

    similitud = util.cos_sim(
        embedding_perfil,
        embedding_vacante,
    ).item()

    similitud = max(0.0, min(1.0, similitud))

    # Si hay habilidades requeridas, calcular su cobertura semántica.
    if nombres_requeridos:
        if nombres_usuario:
            embeddings_usuario = modelo.encode(
                nombres_usuario,
                convert_to_tensor=True,
                normalize_embeddings=True,
            )

            embeddings_requeridos = modelo.encode(
                nombres_requeridos,
                convert_to_tensor=True,
                normalize_embeddings=True,
            )

            matriz = util.cos_sim(
                embeddings_requeridos,
                embeddings_usuario,
            )

            # Cada habilidad requerida cuenta como cubierta si
            # encuentra una habilidad del candidato con similitud >= 0.55.
            cubiertas = (
                matriz.max(dim=1).values >= 0.55
            ).sum().item()

            cobertura = cubiertas / len(nombres_requeridos)
        else:
            cobertura = 0.0

        puntuacion = (
            0.60 * similitud
            + 0.40 * cobertura
        )
    else:
        # Sin habilidades explícitas, usar solamente el texto.
        puntuacion = similitud

    return round(max(0.0, min(100.0, puntuacion * 100)), 2)
