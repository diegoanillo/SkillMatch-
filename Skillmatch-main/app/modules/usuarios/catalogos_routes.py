from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.modules.usuarios.catalogos import Catalogo

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])

@router.get("/")
def obtener_catalogos(db: Session = Depends(get_db)):
    resultados = db.query(Catalogo).all()
    
    agrupados = {
        "educacion": [],
        "sectores": [],
        "tamanosEmpresa": [],
        "modalidades": [],
        "niveles": [],
        "ciudades": []
    }
    
    for item in resultados:
        if item.tipo in agrupados:
            agrupados[item.tipo].append(item.valor)
            
    return agrupados