from datetime import datetime

from sqlalchemy import  String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base

class Usuario(Base):
    __tablename__= "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    apellido: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    tipo_usuario: Mapped[str] = mapped_column (String(20))
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
