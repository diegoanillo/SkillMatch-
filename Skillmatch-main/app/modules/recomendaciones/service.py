from sqlalchemy.orm import Session

from app.modules.usuarios.models import Usuario
from app.modules.recomendaciones.models import Recomendacion
from app.modules.recomendaciones.schemas import(
    RecomendacionCreate,
    RecomendacionUpdate
)


def crear_recomendacion(db: Session, datos: RecomendacionCreate):
    usuario = db.query(Usuario).filter(
        Usuario.id == datos.usuario_id
    ).first()

    if usuario is None:
        return None, "El usuario no existe"

    recomendacion = Recomendacion(**datos.model_dump())

    db.add(recomendacion)
    db.commit()
    db.refresh(recomendacion)

    return recomendacion, None


def listar_recomendaciones_por_usuario(db:Session, usuario_id: int):
    return db.query(Recomendacion).filter(
        Recomendacion.usuario_id == usuario_id
    ).all()


def obtener_recomendacion_por_id(db: Session, recomendacion_id: int):
    return db.query(Recomendacion).filter(
        Recomendacion.id == recomendacion_id
    ).first()



def actualizar_recomendacion(
        db: Session,
        recomendacion: Recomendacion,
        datos: RecomendacionUpdate
):

    cambios = datos.model_dump(exclude_unset=True)

    if not cambios:
        return None, "Debes enviar al menos un campo para actualizar"

    estados_validos = {"PENDIENTE", "ATENDIDA"}

    if "estados" in cambios and cambios["estado"] not in estados_validos:
        return None, "El estado no es valido"

    for campo, valor in cambios.items():
        setattr(recomendacion, campo, valor)

    db.commit()
    db.refresh(recomendacion)

    return recomendacion, None


def eliminar_recomendacion(db:Session, recomendacion: Recomendacion):
    db.delete(recomendacion)
    db.commit()
    return True
