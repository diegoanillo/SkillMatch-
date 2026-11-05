from pydantic import BaseModel, ConfigDict
from typing import Optional

class CursoResponse(BaseModel):
    id: int
    titulo: str
    tipo: str
    horas: int
    url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CursoHabilidadResponse(BaseModel):
    id: int
    curso_id: int
    habilidad_id: int
    boost: int
    model_config = ConfigDict(from_attributes=True)

class UsuarioCursoCreate(BaseModel):
    usuario_id: int
    curso_id: int
    estado: str = "en_curso"