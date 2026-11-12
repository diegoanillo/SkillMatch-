from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
import re

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

    @field_validator('ubicacion')
    def validar_ubicacion(cls, v):
        if v is not None and re.search(r'\d', v):
            raise ValueError('La ciudad no puede contener números.')
        return v

class PerfilUpdate(BaseModel):
    resumen_profesional: Optional[str] = None
    formacion_academica: Optional[str] = None
    experiencia_laboral: Optional[str] = None
    ubicacion: Optional[str] = None
    linkedin: Optional[str] = None
    portafolio: Optional[str] = None
    ruta_meta_id: Optional[str] = None
    oferta_objetivo_id: Optional[str] = None

    @field_validator('ubicacion')
    def validar_ubicacion(cls, v):
        if v is not None and re.search(r'\d', v):
            raise ValueError('La ciudad no puede contener números.')
        return v

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