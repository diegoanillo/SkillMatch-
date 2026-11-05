
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class RutaProfesionalCreate(BaseModel):
    usuario_id: int
    matching_id: Optional[int] = None
    objetivo_profesional: str = Field(min_length=3, max_length=150)
    descripcion: Optional[str] = None
    habilidades_por_desarrollar: Optional[str] = None


class RutaProfesionalUpdate(BaseModel):
    objetivo_profesional: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=150
    )
    descripcion: Optional[str] = None
    habilidades_por_desarrollar: Optional[str] = None
    estado: Optional[str] = None


class RutaProfesionalResponse(BaseModel):
    id: int
    usuario_id: int
    matching_id: Optional[int] = None
    objetivo_profesional: Optional[str] = None
    descripcion: Optional[str] = None
    habilidades_por_desarrollar: Optional[str] = None
    estado: str

    model_config = ConfigDict(from_attributes=True)
