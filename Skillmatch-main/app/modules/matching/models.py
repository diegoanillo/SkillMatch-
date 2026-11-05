from sqlalchemy import Column, Integer, Float, String, ForeignKey
from app.database.connection import Base



class Matching(Base):
    __tablename__ ="matching"


    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False
    )

    vacante_id = Column(
        Integer,
        ForeignKey("vacantes.id"),
        nullable=False
    )

    porcentaje_compatibilidad = Column(
        Float,
        nullable=False,
        default=0.0
    )

    estado = Column(
        String(30),
        nullable=False,
        default="PENDIENTE"
    )
