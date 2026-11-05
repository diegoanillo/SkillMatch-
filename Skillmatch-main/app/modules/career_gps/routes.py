
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db

from app.modules.career_gps.schemas import (
    RutaProfesionalCreate,
    RutaProfesionalUpdate,
    RutaProfesionalResponse
)

from app.modules.career_gps.services import (
    crear_ruta,
    listar_rutas_por_usuarios,
    obtener_ruta_por_id,
    actualizar_ruta,
    eliminar_ruta
)

from app.modules.career_gps.models import RutaProfesional
from app.modules.matching.models import Matching
from app.modules.matching.qwen_service import generar_explicacion_matching

from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from app.modules.vacantes.models import Vacante, VacanteHabilidad


router = APIRouter(
    prefix="/career-gps",
    tags=["Career GPS"]
)


@router.post(
    "/",
    response_model=RutaProfesionalResponse,
    status_code=201
)
def registrar_ruta(
    datos: RutaProfesionalCreate,
    db: Session = Depends(get_db)
):
    ruta, error = crear_ruta(db, datos)

    if error:
        raise HTTPException(status_code=404, detail=error)

    return ruta


@router.post(
    "/generar/{matching_id}",
    response_model=RutaProfesionalResponse,
    status_code=201
)
def generar_ruta_desde_matching(
    matching_id: int,
    db: Session = Depends(get_db)
):
    # 1. Buscar la coincidencia
    matching = db.query(Matching).filter(
        Matching.id == matching_id
    ).first()

    if matching is None:
        raise HTTPException(
            status_code=404,
            detail="La coincidencia no existe"
        )

    # 2. Comprobar si ya existe una ruta para esta coincidencia
    ruta_existente = db.query(RutaProfesional).filter(
        RutaProfesional.matching_id == matching_id
    ).first()

    if ruta_existente:
        return ruta_existente

    if matching.estado != "CALCULADA":
        raise HTTPException(
            status_code=409,
            detail="La coincidencia todavía no tiene un porcentaje calculado"
        )

    # 3. Buscar el perfil del candidato
    perfil = db.query(Perfil).filter(
        Perfil.usuario_id == matching.usuario_id
    ).first()

    if perfil is None:
        raise HTTPException(
            status_code=404,
            detail="El candidato no tiene un perfil registrado"
        )

    # 4. Buscar la vacante
    vacante = db.query(Vacante).filter(
        Vacante.id == matching.vacante_id
    ).first()

    if vacante is None:
        raise HTTPException(
            status_code=404,
            detail="La vacante no existe"
        )

    # 5. Obtener las habilidades del candidato
    habilidades_usuario = (
        db.query(Habilidad.nombre)
        .join(
            UsuarioHabilidad,
            UsuarioHabilidad.habilidad_id == Habilidad.id
        )
        .filter(
            UsuarioHabilidad.usuario_id == matching.usuario_id
        )
        .all()
    )

    # 6. Obtener las habilidades requeridas por la vacante
    habilidades_vacante = (
        db.query(Habilidad.nombre)
        .join(
            VacanteHabilidad,
            VacanteHabilidad.habilidad_id == Habilidad.id
        )
        .filter(
            VacanteHabilidad.vacante_id == matching.vacante_id
        )
        .all()
    )

    nombres_usuario = [habilidad[0] for habilidad in habilidades_usuario]
    nombres_requeridos = [habilidad[0] for habilidad in habilidades_vacante]

    if vacante.requisitos:
        requisitos_texto = [
            requisito.strip()
            for requisito in vacante.requisitos.replace(";", ",").split(",")
            if requisito.strip()
        ]
        nombres_requeridos.extend(requisitos_texto)

    # Evitar requisitos repetidos
    nombres_requeridos = list(dict.fromkeys(nombres_requeridos))

    # 7. Preparar la información para el análisis
    texto_perfil = f"""
    Resumen profesional: {perfil.resumen_profesional or ""}
    Formación académica: {perfil.formacion_academica or ""}
    Experiencia laboral: {perfil.experiencia_laboral or ""}
    Habilidades registradas: {", ".join(nombres_usuario)}
    """

    texto_vacante = f"""
    Cargo: {vacante.titulo}
    Descripción: {vacante.descripcion or ""}
    Requisitos: {vacante.requisitos or ""}
    Habilidades requeridas: {", ".join(nombres_requeridos)}
    """

    # 8. Identificar las brechas de habilidades
    try:
        resultado_ia = generar_explicacion_matching(
            perfil=texto_perfil,
            vacante=texto_vacante,
            porcentaje=float(matching.porcentaje_compatibilidad),
            habilidades_usuario=nombres_usuario,
            habilidades_requeridas=nombres_requeridos
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="No fue posible analizar las habilidades en este momento"
        )

    brechas = resultado_ia["requisitos_no_registrados"]

    if not brechas:
        raise HTTPException(
            status_code=409,
            detail=(
                "No se identificaron brechas que requieran "
                "una nueva ruta de preparación"
            )
        )

    # 9. Construir actividades de preparación
    actividades = []

    for numero, habilidad in enumerate(brechas, start=1):
        actividades.append(
            f"{numero}. Estudiar los fundamentos de {habilidad}."
        )
        actividades.append(
            f"Practicar {habilidad} mediante ejercicios guiados."
        )
        actividades.append(
            f"Realizar un ejercicio práctico que permita demostrar "
            f"lo aprendido en {habilidad}."
        )

    descripcion = (
        f"Ruta de preparación para el cargo {vacante.titulo}. "
        "Las siguientes actividades se basan en requisitos que no "
        "se encontraron registrados en el perfil. El candidato debe "
        "confirmar cuáles necesita fortalecer."
        + "\n\n"
        + "\n".join(actividades)
    )

    # 10. Crear la ruta asociada a la coincidencia
    datos_ruta = RutaProfesionalCreate(
        usuario_id=matching.usuario_id,
        matching_id=matching.id,
        objetivo_profesional=vacante.titulo[:150],
        descripcion=descripcion,
        habilidades_por_desarrollar=", ".join(brechas)
    )

    ruta, error = crear_ruta(db, datos_ruta)

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return ruta


@router.get(
    "/usuario/{usuario_id}",
    response_model=list[RutaProfesionalResponse]
)
def consultar_rutas_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    return listar_rutas_por_usuarios(db, usuario_id)


@router.get(
    "/{ruta_id}",
    response_model=RutaProfesionalResponse
)
def consultar_ruta(
    ruta_id: int,
    db: Session = Depends(get_db)
):
    ruta = obtener_ruta_por_id(db, ruta_id)

    if ruta is None:
        raise HTTPException(
            status_code=404,
            detail="La ruta profesional no existe"
        )

    return ruta


@router.put(
    "/{ruta_id}",
    response_model=RutaProfesionalResponse
)
def modificar_ruta(
    ruta_id: int,
    datos: RutaProfesionalUpdate,
    db: Session = Depends(get_db)
):
    ruta = obtener_ruta_por_id(db, ruta_id)

    if ruta is None:
        raise HTTPException(
            status_code=404,
            detail="La ruta profesional no existe"
        )

    ruta_actualizada, error = actualizar_ruta(db, ruta, datos)

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return ruta_actualizada


@router.delete("/{ruta_id}", status_code=204)
def borrar_ruta(
    ruta_id: int,
    db: Session = Depends(get_db)
):
    ruta = obtener_ruta_por_id(db, ruta_id)

    if ruta is None:
        raise HTTPException(
            status_code=404,
            detail="La ruta profesional no existe"
        )

    eliminar_ruta(db, ruta)
