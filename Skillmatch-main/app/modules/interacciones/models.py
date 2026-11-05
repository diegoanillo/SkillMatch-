from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, UniqueConstraint, Text
from datetime import datetime
from app.database.connection import Base

class Postulacion(Base):
    __tablename__ = "postulaciones"
    __table_args__ = (UniqueConstraint('usuario_id', 'vacante_id', name='uq_usuario_vacante'),)

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vacante_id = Column(Integer, ForeignKey("vacantes.id"), nullable=False)
    estado = Column(String(30), default="Enviada")
    fecha = Column(DateTime, default=datetime.utcnow)
    mensaje = Column(Text, nullable=True)
    respuesta = Column(Text, nullable=True) # <--- ESTO DEBE ESTAR

class OfertaGuardada(Base):
    __tablename__ = "ofertas_guardadas"
    __table_args__ = (UniqueConstraint('usuario_id', 'vacante_id', name='uq_usuario_guardada'),)

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vacante_id = Column(Integer, ForeignKey("vacantes.id"), nullable=False)

class Notificacion(Base):
    __tablename__ = "notificaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vacante_id = Column(Integer, ForeignKey("vacantes.id"), nullable=True) # <--- NUEVA COLUMNA
    titulo = Column(String(100), nullable=False)
    texto = Column(Text, nullable=False)
    leida = Column(Integer, default=0)
    fecha = Column(DateTime, default=datetime.utcnow)