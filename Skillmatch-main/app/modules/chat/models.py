from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from datetime import datetime
from app.database.connection import Base

class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(Integer, primary_key=True, index=True)
    remitente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    destinatario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vacante_id = Column(Integer, ForeignKey("vacantes.id"), nullable=False)
    texto = Column(Text, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)