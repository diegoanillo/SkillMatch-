
from sqlalchemy.orm import Session

from app.modules.usuarios.models import Usuario
from app.modules.vacantes.models import Vacante
from app.modules.matching.models import Matching
from app.modules.matching.schemas import MatchingCreate
from app.modules.matching.ia_service import calcular_compatibilidad


def crear_matching(db: Session, datos: MatchingCreate):
    usuario = db.query(Usuario).filter(
        Usuario.id == datos.usuario_id
    ).first()

    if usuario is None:
        return None, "El usuario no existe"

    vacante = db.query(Vacante).filter(
        Vacante.id == datos.vacante_id
    ).first()

    if vacante is None:
        return None, "La vacante no existe"

    matching_existente = db.query(Matching).filter(
        Matching.usuario_id == datos.usuario_id,
        Matching.vacante_id == datos.vacante_id
    ).first()

    if matching_existente:
        return None, (
            "Ya existe una coincidencia para este usuario y esta vacante"
        )

    try:
        porcentaje = calcular_compatibilidad(
            db=db,
            usuario_id=datos.usuario_id,
            vacante_id=datos.vacante_id,
        )
    except ValueError as error:
        return None, str(error)
    except Exception:
        db.rollback()
        raise

    nuevo_matching = Matching(
        usuario_id=datos.usuario_id,
        vacante_id=datos.vacante_id,
        porcentaje_compatibilidad=porcentaje,
        estado="CALCULADA"
    )

    db.add(nuevo_matching)

    try:
        db.commit()
        db.refresh(nuevo_matching)
    except Exception:
        db.rollback()
        raise

    return nuevo_matching, None


def listar_matching_por_usuario(db: Session, usuario_id: int):
    return db.query(Matching).filter(
        Matching.usuario_id == usuario_id
    ).all()
