from sqlalchemy import Column, Integer, String
from app.database.connection import Base

class Catalogo(Base):
    __tablename__ = "catalogos"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False)  # Ej: 'educacion', 'ciudades', 'sectores'
    valor = Column(String(100), nullable=False) # Ej: 'Bogotá', 'Finanzas'