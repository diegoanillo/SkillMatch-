from pydantic import BaseModel, ConfigDict
from typing import Optional

class HabilidadCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class HabilidadResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]= None

    model_config = ConfigDict(from_attributes=True)

class UsuarioHabilidadCreate(BaseModel):
    usuario_id: int
    habilidad_id: int
    nivel: Optional[str] = None

class UsuarioHabilidadResponse(BaseModel):
    id: int
    usuario_id: int
    habilidad_id: int
    nivel: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

