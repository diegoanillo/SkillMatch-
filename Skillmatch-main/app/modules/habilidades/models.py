
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    UniqueConstraint
)

from app.database.connection import Base


class Habilidad(Base):
    __tablename__ = "habilidades"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    descripcion = Column(String(250), nullable=True)


class UsuarioHabilidad(Base):
    __tablename__ = "usuario_habilidades"

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "habilidad_id",
            name="uq_usuario_habilidad"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False
    )

    habilidad_id = Column(
        Integer,
        ForeignKey("habilidades.id"),
        nullable=False
    )

    nivel = Column(String(30), nullable=True)
