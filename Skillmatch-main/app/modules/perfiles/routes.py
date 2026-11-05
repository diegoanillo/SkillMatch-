from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.modules.usuarios.models import Usuario
from app.modules.perfiles.schemas import (
     PerfilCreate,
    PerfilResponse,
    PerfilUpdate
    )
from app.modules.perfiles.service import(
    crear_perfil,
    obtener_perfil_por_usuario
)


router = APIRouter(prefix="/perfiles", tags=["Perfiles"])


@router.post("/", response_model=PerfilResponse, status_code=201)
def registrar_perfil(
    datos: PerfilCreate,
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.id == datos.usuario_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="El usuario no existe"
        )

    perfil = crear_perfil(db, datos)

    if perfil is None:
        raise HTTPException(
            status_code=409,
            detail="Este usuario ya tiene un perfil registrado"
        )
    return perfil
@router.get("/{usuario_id}", response_model=PerfilResponse)
def consultar_perfil(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    perfil = obtener_perfil_por_usuario(db, usuario_id)

    if perfil is None:
        raise HTTPException(
            status_code=404,
            detail="El perfil no existe para este usuario"
        )

    return perfil



@router.put("/{usuario_id}", response_model=PerfilResponse)
def actualizar_perfil(
    usuario_id: int,
    datos: PerfilUpdate,
    db: Session = Depends(get_db)
):
    perfil = obtener_perfil_por_usuario(db, usuario_id)

    if perfil is None:
        raise HTTPException(
            status_code=404,
            detail="El perfil no existe para este usuario"
        )

    datos_actualizados = datos.model_dump(exclude_unset=True)

    if not datos_actualizados:
        raise HTTPException(
            status_code=400,
            detail="Debes enviar al menos un campo para actualizar"
        )

    for campo, valor in datos_actualizados.items():
        setattr(perfil, campo, valor)

    db.commit()
    db.refresh(perfil)

    return perfil