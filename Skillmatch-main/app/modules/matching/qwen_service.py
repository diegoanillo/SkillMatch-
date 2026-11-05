
import ollama
from sentence_transformers import util
from app.modules.matching.ia_service import obtener_modelo


MODELO_QWEN = "qwen2.5:1.5b"


def generar_explicacion_matching(
    perfil: str,
    vacante: str,
    porcentaje: float,
    habilidades_usuario: list[str],
    habilidades_requeridas: list[str],
) -> dict:
    """Genera resultados verificables y una recomendación laboral."""


    modelo = obtener_modelo()

    habilidades_usuario = list(dict.fromkeys(
        h.strip() for h in habilidades_usuario if h.strip()
    ))
    habilidades_requeridas = list(dict.fromkeys(
        h.strip() for h in habilidades_requeridas if h.strip()
    ))

    fortalezas = []
    faltantes = []

    if habilidades_usuario and habilidades_requeridas:
        embeddings_usuario = modelo.encode(
            habilidades_usuario,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        embeddings_requeridos = modelo.encode(
            habilidades_requeridas,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )

        similitudes = util.cos_sim(
            embeddings_requeridos,
            embeddings_usuario,
        )

        for i, requisito in enumerate(habilidades_requeridas):
            mejor_similitud = similitudes[i].max().item()

            print(f"Requisito: {requisito} | Mejor similitud semántica: {mejor_similitud:.3f}")
            if mejor_similitud >= 0.55:
                fortalezas.append(requisito)
            else:
                faltantes.append(requisito)

    else:
        faltantes = habilidades_requeridas.copy()


    if porcentaje < 40:
        nivel = "bajo"
        explicacion = (
            f"La similitud calculada es del {porcentaje}%, "
            "un nivel bajo. Conviene revisar los requisitos de la "
            "vacante y fortalecer el perfil profesional."
        )
    elif porcentaje < 70:
        nivel = "moderado"
        explicacion = (
            f"La similitud calculada es del {porcentaje}%, "
            "un nivel moderado. Conviene revisar los requisitos "
            "de la vacante y las habilidades que se pueden fortalecer."
        )
    else:
        nivel = "alto"
        explicacion = (
            f"La similitud calculada es del {porcentaje}%, "
            "un nivel alto de similitud entre los datos comparados."
        )


    prompt = """
Eres un orientador laboral de SkillMatch.
Escribe una recomendación general, breve y práctica para alguien
que busca empleo. No afirmes nada sobre sus habilidades, experiencia,
estudios ni perfil específico. No inventes datos.
Responde en español en una o dos oraciones.
"""

    respuesta = ollama.chat(
        model=MODELO_QWEN,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0},
    )

    recomendacion = respuesta["message"]["content"].strip()

    return {
        "explicacion_ia": explicacion,
        "recomendacion_ia": recomendacion,
        "nivel_compatibilidad": nivel,
        "fortalezas_verificadas": fortalezas,
        "requisitos_no_registrados": faltantes,
    }
