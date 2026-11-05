from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class PostulacionCreate(BaseModel):
    usuario_id: int
    vacante_id: int

class PostulacionResponse(BaseModel):
    id: int
    usuario_id: int
    vacante_id: int
    estado: str
    fecha: datetime
    mensaje: Optional[str] = None      # <--- AGREGA ESTO
    respuesta: Optional[str] = None    # <--- AGREGA ESTO
    model_config = ConfigDict(from_attributes=True)

# ... (el resto de esquemas)

class OfertaGuardadaCreate(BaseModel):
    usuario_id: int
    vacante_id: int

class OfertaGuardadaResponse(BaseModel):
    id: int
    usuario_id: int
    vacante_id: int
    model_config = ConfigDict(from_attributes=True)