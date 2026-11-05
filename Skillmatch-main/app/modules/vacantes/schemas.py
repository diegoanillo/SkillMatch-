from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal

class VacanteCreate(BaseModel):
    titulo: str
    descripcion: str
    requisitos: Optional[str]= None
    ubicacion: Optional[str]= None
    modalidad: Optional[str]= None
    salario_min: Optional[Decimal]= None
    salario_max: Optional[Decimal]= None


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
    nivel_requerido: Optional[str] = None

class VacanteHabilidadResponse(BaseModel):
    id: int
    vacante_id: int
    habilidad_id: int
    nivel_requerido: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)