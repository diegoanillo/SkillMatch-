from pydantic import BaseModel, ConfigDict, Field

class MatchingCreate (BaseModel):
    usuario_id: int
    vacante_id: int

class MatchingResponse(BaseModel):
    id: int
    usuario_id: int
    vacante_id: int
    porcentaje_compatibilidad: float = Field(ge=0, le=100)
    estado:str

    model_config = ConfigDict(from_attributes=True)
