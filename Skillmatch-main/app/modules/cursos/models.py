from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.database.connection import Base

class Curso(Base):
    __tablename__ = "cursos"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    tipo = Column(String(50), nullable=False)
    horas = Column(Integer, nullable=False)
    url = Column(String(255), nullable=True)

class CursoHabilidad(Base):
    __tablename__ = "curso_habilidades"
    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    habilidad_id = Column(Integer, ForeignKey("habilidades.id"), nullable=False)
    boost = Column(Integer, nullable=False, default=1) # Cuántos niveles sube

class UsuarioCurso(Base):
    __tablename__ = "usuario_cursos"
    __table_args__ = (UniqueConstraint('usuario_id', 'curso_id', name='uq_usuario_curso'),)
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    estado = Column(String(30), nullable=False, default="en_curso")