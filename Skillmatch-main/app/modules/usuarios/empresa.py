from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.connection import Base

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    sector = Column(String(50), nullable=True)
    ciudad = Column(String(50), nullable=True)