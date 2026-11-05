
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database.connection import Base


class RutaProfesional(Base):
    __tablename__ = "rutas_profesionales"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False
    )

    matching_id = Column(
    Integer,
    ForeignKey("matching.id"),
    nullable=True,
    unique=True
)

    objetivo_profesional = Column(
        Text,
        nullable=True
    )

    descripcion = Column(
        Text,
        nullable=True
    )

    habilidades_por_desarrollar = Column(
        Text,
        nullable=True
    )

    estado = Column(
        String(30),
        nullable=False,
        default="EN_PROGRESO"
    )
