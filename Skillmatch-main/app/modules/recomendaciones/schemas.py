from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class RecomendacionCreate(BaseModel):
    usuario_id: int
    titulo: str = Field(min_length=3, max_length=150)
    descripcion: str = Field(min_length=5)
    tipo: str = Field(min_length=3, max_length=50)


class RecomendacionUpdate(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=3, max_length=150)
    descripcion: Optional[str] = Field(default=None, min_length=5)
    tipo: Optional[str] = Field(default=None, min_length=3, max_length=50)
    estado: Optional[str] = None

class RecomendacionResponse(BaseModel):
    id: int
    usuario_id: int
    titulo: str
    descripcion: str
    tipo: str
    estado: str

    model_config = ConfigDict(from_attributes=True)
