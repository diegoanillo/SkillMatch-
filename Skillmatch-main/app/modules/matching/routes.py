
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db

from app.modules.matching.schemas import (
    MatchingCreate,
    MatchingResponse,
)
from app.modules.matching.models import Matching
from app.modules.matching.services import (
    crear_matching,
    listar_matching_por_usuario,
)
from app.modules.matching.qwen_service import (
    generar_explicacion_matching,
)

from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import (
    Habilidad,
    UsuarioHabilidad,
)

from app.modules.vacantes.models import (
    Vacante,
    VacanteHabilidad,
)



router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post("/", response_model=MatchingResponse, status_code=201)
def registrar_matching(
    datos: MatchingCreate,
    db: Session = Depends(get_db),
):
    matching, error = crear_matching(db, datos)

    if error:
        if error in ("El usuario no existe", "La vacante no existe"):
            raise HTTPException(status_code=404, detail=error)

        raise HTTPException(status_code=409, detail=error)

    return matching


@router.get(
    "/usuario/{usuario_id}",
    response_model=list[MatchingResponse],
)
def consultar_matching_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
):
    return listar_matching_por_usuario(db, usuario_id)


@router.post("/{matching_id}/explicacion")
def explicar_matching(
    matching_id: int,
    db: Session = Depends(get_db),
):
    matching = db.query(Matching).filter(
        Matching.id == matching_id
    ).first()

    if matching is None:
        raise HTTPException(
            status_code=404,
            detail="La coincidencia no existe",
        )

    if matching.estado != "CALCULADA":
        raise HTTPException(
            status_code=409,
            detail="La coincidencia todavía no tiene un porcentaje calculado",
        )

    perfil = db.query(Perfil).filter(
        Perfil.usuario_id == matching.usuario_id
    ).first()

    if perfil is None:
        raise HTTPException(
            status_code=404,
            detail="El candidato no tiene un perfil registrado",
        )

    vacante = db.query(Vacante).filter(
        Vacante.id == matching.vacante_id
    ).first()

    if vacante is None:
        raise HTTPException(
            status_code=404,
            detail="La vacante no existe",
        )

    habilidades_usuario = (
        db.query(Habilidad.nombre)
        .join(
            UsuarioHabilidad,
            UsuarioHabilidad.habilidad_id == Habilidad.id,
        )
        .filter(
            UsuarioHabilidad.usuario_id == matching.usuario_id
        )
        .all()
    )

    habilidades_vacante = (
        db.query(Habilidad.nombre)
        .join(
            VacanteHabilidad,
            VacanteHabilidad.habilidad_id == Habilidad.id,
        )
        .filter(
            VacanteHabilidad.vacante_id == matching.vacante_id
        )
        .all()
    )


    nombres_usuario = [h[0] for h in habilidades_usuario]
    nombres_requeridos = [h[0] for h in habilidades_vacante]

    if vacante.requisitos:
        requisitos_texto = [
            requisito.strip()
            for requisito in vacante.requisitos.replace(";", ",").split(",")
            if requisito.strip()
        ]
        nombres_requeridos.extend(requisitos_texto)

    nombres_requeridos = list(dict.fromkeys(nombres_requeridos))


    texto_perfil = f"""
Resumen profesional: {perfil.resumen_profesional or ""}
Formación académica: {perfil.formacion_academica or ""}
Experiencia laboral: {perfil.experiencia_laboral or ""}
Habilidades registradas: {", ".join(h[0] for h in habilidades_usuario)}
"""

    texto_vacante = f"""
Cargo: {vacante.titulo}
Descripción: {vacante.descripcion}
Requisitos: {vacante.requisitos or ""}
Habilidades requeridas: {", ".join(nombres_requeridos)}
"""


    try:
        resultado_ia = generar_explicacion_matching(
            perfil=texto_perfil,
            vacante=texto_vacante,
            porcentaje=matching.porcentaje_compatibilidad,
            habilidades_usuario=nombres_usuario,
            habilidades_requeridas=nombres_requeridos,
        )

    except Exception as e:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=503,
            detail=f"{type(e).__name__}: {str(e)}",
        )



    return {
        "matching_id": matching.id,
        "usuario_id": matching.usuario_id,
        "vacante_id": matching.vacante_id,
        "porcentaje_compatibilidad": matching.porcentaje_compatibilidad,
        **resultado_ia,
    }
