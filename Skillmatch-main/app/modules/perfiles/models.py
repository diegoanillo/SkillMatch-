from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database.connection import Base

class Perfil(Base):
    __tablename__ = "perfiles"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
        unique=True
    )

    resumen_profesional = Column(Text, nullable=True)
    formacion_academica = Column(Text, nullable=True)
    experiencia_laboral = Column(Text, nullable=True)
    ubicacion = Column(String(150), nullable=True)
    linkedin = Column(String(255), nullable=True)
    portafolio = Column(String(255), nullable=True)

    # NUEVAS COLUMNAS
    ruta_meta_id = Column(String(50), nullable=True)
    oferta_objetivo_id = Column(String(50), nullable=True)