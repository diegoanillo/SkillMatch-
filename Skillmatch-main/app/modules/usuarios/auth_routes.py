from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.modules.usuarios.models import Usuario
from app.modules.usuarios.schemas import LoginRequest, UsuarioResponse
from app.core.security import verificar_password

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=UsuarioResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if usuario is None or not verificar_password(datos.password, usuario.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    return usuario

@router.get("/email-disponible")
def email_disponible(email: str, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == email.lower().strip()).first()
    return {"disponible": existe is None}