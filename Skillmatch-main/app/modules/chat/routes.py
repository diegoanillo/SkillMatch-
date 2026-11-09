from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.modules.chat.models import Mensaje
from app.modules.chat.schemas import MensajeCreate, MensajeResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/enviar", response_model=MensajeResponse)
def enviar_mensaje(datos: MensajeCreate, db: Session = Depends(get_db)):
    nuevo = Mensaje(
        remitente_id=datos.remitente_id,
        destinatario_id=datos.destinatario_id,
        vacante_id=datos.vacante_id,
        texto=datos.texto
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/historial/{usuario_id}/{otro_id}/{vacante_id}", response_model=list[MensajeResponse])
def obtener_historial(usuario_id: int, otro_id: int, vacante_id: int, db: Session = Depends(get_db)):
    mensajes = db.query(Mensaje).filter(
        Mensaje.vacante_id == vacante_id,
        ((Mensaje.remitente_id == usuario_id) & (Mensaje.destinatario_id == otro_id)) |
        ((Mensaje.remitente_id == otro_id) & (Mensaje.destinatario_id == usuario_id))
    ).order_by(Mensaje.fecha.asc()).all()
    return mensajes