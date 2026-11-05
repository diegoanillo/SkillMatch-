
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.modules.recomendaciones.schemas import (
    RecomendacionCreate,
    RecomendacionUpdate,
    RecomendacionResponse
)
from app.modules.recomendaciones.service import (
    crear_recomendacion,
    listar_recomendaciones_por_usuario,
    obtener_recomendacion_por_id,
    actualizar_recomendacion,
    eliminar_recomendacion
)

router = APIRouter(
    prefix="/recomendaciones",
    tags=["Recomendaciones"]
)


@router.post("/", response_model=RecomendacionResponse, status_code=201)
def registrar_recomendacion(
    datos: RecomendacionCreate,
    db: Session = Depends(get_db)
):
    recomendacion, error = crear_recomendacion(db, datos)

    if error:
        raise HTTPException(status_code=404, detail=error)

    return recomendacion


@router.get(
    "/usuario/{usuario_id}",
    response_model=list[RecomendacionResponse]
)
def consultar_recomendaciones_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    return listar_recomendaciones_por_usuario(db, usuario_id)


@router.get("/{recomendacion_id}", response_model=RecomendacionResponse)
def consultar_recomendacion(
    recomendacion_id: int,
    db: Session = Depends(get_db)
):
    recomendacion = obtener_recomendacion_por_id(db, recomendacion_id)

    if recomendacion is None:
        raise HTTPException(
            status_code=404,
            detail="La recomendación no existe"
        )

    return recomendacion


@router.put("/{recomendacion_id}", response_model=RecomendacionResponse)
def modificar_recomendacion(
    recomendacion_id: int,
    datos: RecomendacionUpdate,
    db: Session = Depends(get_db)
):
    recomendacion = obtener_recomendacion_por_id(db, recomendacion_id)

    if recomendacion is None:
        raise HTTPException(
            status_code=404,
            detail="La recomendación no existe"
        )

    recomendacion_actualizada, error = actualizar_recomendacion(
        db, recomendacion, datos
    )

    if error:
        raise HTTPException(status_code=400, detail=error)

    return recomendacion_actualizada


@router.delete("/{recomendacion_id}", status_code=204)
def borrar_recomendacion(
    recomendacion_id: int,
    db: Session = Depends(get_db)
):
    recomendacion = obtener_recomendacion_por_id(db, recomendacion_id)

    if recomendacion is None:
        raise HTTPException(
            status_code=404,
            detail="La recomendación no existe"
        )

    eliminar_recomendacion(db, recomendacion)
