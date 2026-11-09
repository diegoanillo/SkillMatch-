from pydantic import BaseModel, ConfigDict
from datetime import datetime

class MensajeCreate(BaseModel):
    remitente_id: int
    destinatario_id: int
    vacante_id: int
    texto: str

class MensajeResponse(BaseModel):
    id: int
    remitente_id: int
    destinatario_id: int
    vacante_id: int
    texto: str
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)