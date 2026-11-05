from pydantic import BaseModel, ConfigDict
from typing import Optional

class PerfilCreate(BaseModel):
    usuario_id: int
    resumen_profesional: Optional[str] = None
    formacion_academica: Optional[str] = None
    experiencia_laboral: Optional[str] = None
    ubicacion: Optional[str] = None
    linkedin: Optional[str] = None
    portafolio: Optional[str] = None
    ruta_meta_id: Optional[str] = None
    oferta_objetivo_id: Optional[str] = None

class PerfilResponse(BaseModel):
    id: int
    usuario_id: int
    resumen_profesional: Optional[str] = None
    formacion_academica: Optional[str] = None
    experiencia_laboral: Optional[str] = None
    ubicacion: Optional[str] = None
    linkedin: Optional[str] = None
    portafolio: Optional[str] = None
    ruta_meta_id: Optional[str] = None
    oferta_objetivo_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PerfilUpdate(BaseModel):
    resumen_profesional: Optional[str] = None
    formacion_academica: Optional[str] = None
    experiencia_laboral: Optional[str] = None
    ubicacion: Optional[str] = None
    linkedin: Optional[str] = None
    portafolio: Optional[str] = None
    ruta_meta_id: Optional[str] = None
    oferta_objetivo_id: Optional[str] = None