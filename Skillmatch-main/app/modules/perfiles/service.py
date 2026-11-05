
from sqlalchemy.orm import Session

from app.modules.perfiles.models import Perfil
from app.modules.perfiles.schemas import PerfilCreate


def crear_perfil(db: Session, datos: PerfilCreate):
    perfil_existente = db.query(Perfil).filter(
        Perfil.usuario_id == datos.usuario_id
    ).first()

    if perfil_existente:
        return None

    nuevo_perfil = Perfil(
        **datos.model_dump()
    )

    db.add(nuevo_perfil)
    db.commit()
    db.refresh(nuevo_perfil)

    return nuevo_perfil


def obtener_perfil_por_usuario(db: Session, usuario_id: int):
    return db.query(Perfil).filter(
        Perfil.usuario_id == usuario_id
    ).first()
