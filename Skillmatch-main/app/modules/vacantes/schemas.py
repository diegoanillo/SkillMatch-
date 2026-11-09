from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
import re

class VacanteCreate(BaseModel):
    titulo: str
    descripcion: str
    requisitos: Optional[str]= None
    ubicacion: Optional[str]= None
    modalidad: Optional[str]= None
    salario_min: Optional[Decimal]= None
    salario_max: Optional[Decimal]= None

    @field_validator('ubicacion')
    def validar_ubicacion(cls, v):
        if v is not None and re.search(r'\d', v):
            raise ValueError('La ubicación no puede contener números.')
        return v

class VacanteResponse(BaseModel):
    id: int 
    titulo: str
    descripcion: str
    requisitos:Optional[str] = None   
    ubicacion:Optional[str] = None   
    modalidad:Optional[str] = None   
    salario_min:Optional[Decimal] = None   
    salario_max:Optional[Decimal] = None   
    estado: str
    empleador_id: int
    fecha_publicacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class VacanteHabilidadCreate(BaseModel):
    habilidad_id: int
    nivel_requerido: Optional[int] = None

class VacanteHabilidadResponse(BaseModel):
    id: int
    vacante_id: int
    habilidad_id: int
    nivel_requerido: Optional[int] = None  
    model_config = ConfigDict(from_attributes=True)