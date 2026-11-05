from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import get_db
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from app.modules.habilidades.schemas import (
    HabilidadCreate,
    HabilidadResponse,
    UsuarioHabilidadCreate,
    UsuarioHabilidadResponse
)

from app.modules.usuarios.models import Usuario

router = APIRouter(prefix="/habilidades", tags=["Habilidades"])


#Listar Habilidades
@router.get("/", response_model=list[HabilidadResponse])
def listar_habilidades(db: Session = Depends(get_db)):
    habilidades = db.query(Habilidad).all()
    return habilidades

#Crear una habilidad
@router.post("/", response_model=HabilidadResponse, status_code=201)
def crear_habilidad(
    datos: HabilidadCreate,
    db: Session = Depends(get_db)

):
    existente = db.query(Habilidad).filter(
        Habilidad.nombre == datos.nombre
    ).first()

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Esta habilidad ya existe"

        )

    habilidad = Habilidad(
        nombre = datos.nombre,
        descripcion = datos.descripcion
    )

    db.add(habilidad)
    db.commit()
    db.refresh(habilidad)

    return habilidad

# consultar una habilidad por su ID
@router.get("/{habilidad_id}", response_model=HabilidadResponse)
def obtener_habilidad(
    habilidad_id: int,
    db: Session = Depends(get_db)
):
    habilidad = db.query(Habilidad).filter(
        Habilidad.id == habilidad_id
    ).first()

    if not habilidad:
        raise HTTPException(
            status_code=404,
            detail="Habilidad no encontrada"
        )

    return habilidad

# Actualizar una habilidad
@router.put("/{habilidad_id}", response_model=HabilidadResponse)
def actualizar_habilidad(
    habilidad_id: int,
    datos: HabilidadCreate,
    db: Session = Depends(get_db)
):
    habilidad = db.query(Habilidad).filter(
        Habilidad.id == habilidad_id
    ).first()

    if not habilidad:
        raise HTTPException(
            status_code=404,
            detail="Habilidad no encontrada"
        )

    duplicada = db.query(Habilidad).filter(
        Habilidad.nombre ==  datos.nombre,
        Habilidad.id != habilidad_id
    ).first()

    if duplicada:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otra habilidad con ese nombre"
        )

    habilidad.nombre = datos.nombre
    habilidad.descripcion = datos.descripcion

    try:
        db.commit()
        db.refresh(habilidad)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail= "No se pudo actualizar la habilidad"
        )

    return habilidad

#Asociar una habilidad a un usuario
@router.post(
    "/usuarios/",
    response_model=UsuarioHabilidadResponse,
    status_code=201
)
def asociar_habilidad_usuario(
    datos: UsuarioHabilidadCreate,
    db: Session = Depends(get_db)
):

    usuario = db.query(Usuario).filter(
        Usuario.id == datos.usuario_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    habilidad = db.query(Habilidad).filter(
        Habilidad.id == datos.habilidad_id
    ).first()

    if not habilidad:
        raise HTTPException(
            status_code=404,
            detail="Habilidad no encontrada"
        )

    asociacion_existente = db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.usuario_id == datos.habilidad_id
    ).first()

    if asociacion_existente:
        raise HTTPException(
            status_code=409,
            detail="El usuaurio ya tiene asociada esta habilidad"
        )

    asociacion = UsuarioHabilidad(
        usuario_id=datos.usuario_id,
        habilidad_id=datos.habilidad_id,
        nivel=datos.nivel
    )

    db.add(asociacion)

    try:
        db.commit()
        db.refresh(asociacion)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail= "No se pudo asociar la habilidad al usuario"
        )

    return asociacion    

#consultar las habilidades asociadas a un usuario
@router.get(
    "/usuarios/{usuario_id}",
    response_model=list[UsuarioHabilidadResponse]
)
def listar_habilidades_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    return db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.usuario_id == usuario_id
    ).all()

# Actualizar el nivel de una habilidad asociada
@router.put(
    "/usuarios/asociaciones/{asociacion_id}",
    response_model=UsuarioHabilidadResponse
)
def actualizar_nivel_habilidad(
    asociacion_id: int,
    datos: UsuarioHabilidadCreate,
    db: Session = Depends(get_db)
):
    asociacion = db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.id == asociacion_id
    ).first()

    if not asociacion:
        raise HTTPException(
            status_code=404,
            detail="Asociacion no encontrada"
        )

    if (
        asociacion.usuario_id != datos.usuario_id
        or asociacion.habilidad_id != datos.habilidad_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Los IDs de usuario y habilidad no coinciden"
        )

    asociacion.nivel = datos.nivel

    db.commit()
    db.refresh(asociacion)

    return asociacion

#Eliminar una asociacion entre usuario y habilidad
@router.delete(
    "/usuarios/asociaciones/{asociacion_id}",
    status_code=204
)
def eliminar_asociacion(
    asociacion_id: int,
    db: Session = Depends(get_db)
):
    asociacion = db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.id == asociacion_id
    ).first()

    if not asociacion:
        raise HTTPException(
            status_code=404,
            detail="Asociacion no encontrada"
        )

    db.delete(asociacion)
    db.commit()

    return None


# Elimar una habilidad del catalogo
@router.delete("/{habilidad_id}", status_code=204)
def eliminar_habilidad(
    habilidad_id: int,
    db: Session = Depends(get_db)
):
    habilidad = db.query(Habilidad).filter(
        Habilidad.id == habilidad_id
    ).first()

    if not habilidad:
        raise HTTPException(
            status_code=404,
            detail="Habilidad no encontrada"
        )

    asociacion = db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.habilidad_id == habilidad_id
    ).first()

    if asociacion:
        raise HTTPException(
            status_code=409,
            detail=(
                "No se puede eliminar la habilidad porque está "
                "asociada a uno o más usuarios"
            )
        )

    db.delete(habilidad)
    db.commit()

    return None