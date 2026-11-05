from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.modules.cursos.models import Curso, CursoHabilidad, UsuarioCurso
from app.modules.cursos.schemas import CursoResponse, CursoHabilidadResponse, UsuarioCursoCreate

router = APIRouter(prefix="/cursos", tags=["Cursos y Recomendaciones"])

@router.get("/", response_model=list[CursoResponse])
def listar_cursos(db: Session = Depends(get_db)):
    return db.query(Curso).all()

@router.get("/{curso_id}/habilidades", response_model=list[CursoHabilidadResponse])
def listar_habilidades_curso(curso_id: int, db: Session = Depends(get_db)):
    return db.query(CursoHabilidad).filter(CursoHabilidad.curso_id == curso_id).all()

@router.post("/usuarios/")
def cambiar_estado_curso(datos: UsuarioCursoCreate, db: Session = Depends(get_db)):
    existe = db.query(UsuarioCurso).filter(
        UsuarioCurso.usuario_id == datos.usuario_id,
        UsuarioCurso.curso_id == datos.curso_id
    ).first()
    
    if existe:
        existe.estado = datos.estado
    else:
        nuevo = UsuarioCurso(usuario_id=datos.usuario_id, curso_id=datos.curso_id, estado=datos.estado)
        db.add(nuevo)
    
    db.commit()
    return {"mensaje": "Estado actualizado"}

@router.get("/usuarios/{usuario_id}")
def listar_cursos_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(UsuarioCurso).filter(UsuarioCurso.usuario_id == usuario_id).all()