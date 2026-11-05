from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal

class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8) # Exige mínimo 8 caracteres
    # Literal obliga a que solo sean estos dos valores exactos
    tipo_usuario: Literal["ASPIRANTE", "EMPLEADOR"] 

    @field_validator('password')
    def validar_password_segura(cls, v):
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe tener letras y números')
        return v

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: EmailStr
    tipo_usuario: str
    fecha_registro: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str