from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime, func
from app.database.connection import Base


class Vacante(Base):
    __tablename__= "vacantes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    requisitos = Column(Text, nullable=True)
    ubicacion = Column(String(150), nullable=True)
    modalidad = Column(String(30), nullable=True)
    salario_min = Column(Numeric(12, 2), nullable=True)
    salario_max = Column(Numeric(12, 2), nullable=True)
    estado = Column(String(20), nullable=False, default="ACTIVA")
    empleador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_publicacion = Column(DateTime, server_default=func.now())

class VacanteHabilidad(Base):
    __tablename__ = "vacante_habilidades"

    id = Column(Integer, primary_key=True, index=True)

    vacante_id = Column(
        Integer,
        ForeignKey("vacantes.id"),
        nullable=False
    )

    habilidad_id = Column(
        Integer,
        ForeignKey("habilidades.id"),
        nullable=False
    )

    nivel_requerido = Column(
        String(30),
        nullable=True
    )    