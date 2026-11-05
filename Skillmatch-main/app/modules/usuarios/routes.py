from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from app.services.usuario_service import crear_usuario, obtener_usuarios
from app.modules.usuarios.schemas import UsuarioCreate, UsuarioResponse
from app.database.connection import get_db
from app.modules.usuarios.empresa import Empresa

from typing import Optional


router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.post("/", response_model=UsuarioResponse)
def registrar_usuario(
    usuario: UsuarioCreate,
    db = Depends(get_db)
):
    return crear_usuario(db, usuario)

@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(db = Depends(get_db)):
    return obtener_usuarios(db)

class EmpresaResponse(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    sector: str
    ciudad: str
    model_config = ConfigDict(from_attributes=True)

@router.get("/{usuario_id}/empresa", response_model=EmpresaResponse)
def obtener_empresa_usuario(usuario_id: int, db = Depends(get_db)):
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="El usuario no tiene empresa registrada")
    return empresa

class EmpresaCreate(BaseModel):
    usuario_id: int
    nombre: str
    sector: Optional[str] = None
    ciudad: Optional[str] = None

@router.post("/empresas/")
def crear_empresa(datos: EmpresaCreate, db = Depends(get_db)):
    # Verificar si el usuario ya tiene una empresa
    existe = db.query(Empresa).filter(Empresa.usuario_id == datos.usuario_id).first()
    if existe:
        raise HTTPException(status_code=409, detail="Este usuario ya tiene una empresa registrada")
    
    nueva = Empresa(
        usuario_id=datos.usuario_id,
        nombre=datos.nombre,
        sector=datos.sector,
        ciudad=datos.ciudad
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva