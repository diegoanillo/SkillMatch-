from sqlalchemy import Column,Integer, String, Text, ForeignKey
from app.database.connection import Base

class Recomendacion(Base):
    __tablename__ = "recomendaciones"


    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    tipo = Column(String(50), nullable=False)
    estado = Column(String(30), nullable=False, default="PENDIENTE")
