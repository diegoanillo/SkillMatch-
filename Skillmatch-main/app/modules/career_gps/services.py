from sqlalchemy.orm import Session

from app.modules.usuarios.models import Usuario
from app.modules.career_gps.models import RutaProfesional
from app.modules.career_gps.schemas import (
    RutaProfesionalCreate,
    RutaProfesionalUpdate
)


def crear_ruta(db: Session, datos: RutaProfesionalCreate):
    usuario = db.query(Usuario).filter(
        Usuario.id == datos.usuario_id
    ).first()

    if usuario is None:
        return None, "El usuario no existe"

    nueva_ruta = RutaProfesional(
        **datos.model_dump(),
        estado="EN_PROGRESO"
    )

    db.add(nueva_ruta)
    db.commit()
    db.refresh(nueva_ruta)

    return nueva_ruta, None


def listar_rutas_por_usuarios(db: Session, usuario_id: int):
    return db.query(RutaProfesional).filter(
        RutaProfesional.usuario_id == usuario_id
    ).all()


def obtener_ruta_por_id(db:Session, ruta_id: int):
    return db.query(RutaProfesional).filter(
        RutaProfesional.id == ruta_id
    ).first()


def actualizar_ruta(
    db: Session,
    ruta: RutaProfesional,
    datos: RutaProfesionalUpdate
):
    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        return None, "Debes enviar al menos un campo para actualizar"

    estados_validos = {"EN_PROGRESO", "COMPLETADA", "PENDIENTE"}

    if "estado" in cambios and cambios["estado"] not in estados_validos:
        return None, "El estado no es valido"

    for campo, valor in cambios.items():
        setattr(ruta, campo, valor)

    db.commit()
    db.refresh(ruta)

    return ruta, None

def eliminar_ruta(db: Session, ruta: RutaProfesional):
    db.delete(ruta)
    db.commit()
    return True
