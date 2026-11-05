from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.modules.usuarios.models import Usuario
from app.modules.usuarios.schemas import UsuarioCreate
from app.core.security import hashear_password

def crear_usuario(db: Session, usuario: UsuarioCreate):
    # Verificamos a nivel de backend si el correo ya está registrado
    existe = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if existe:
        raise HTTPException(status_code=409, detail="Este correo ya está registrado.")

    nuevo_usuario = Usuario(
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        password=hashear_password(usuario.password),
        tipo_usuario=usuario.tipo_usuario
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

def obtener_usuarios(db: Session):
    return db.query(Usuario).all()