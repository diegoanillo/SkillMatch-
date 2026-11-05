from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import requests
from app.modules.matching.ia_service import obtener_modelo
from app.database.connection import get_db
from app.modules.usuarios.models import Usuario
from app.modules.usuarios.empresa import Empresa
from app.modules.vacantes.models import Vacante, VacanteHabilidad
from app.modules.vacantes.schemas import (
    VacanteCreate,
    VacanteResponse,
    VacanteHabilidadCreate,
    VacanteHabilidadResponse
)
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from sentence_transformers import util

router = APIRouter(prefix="/vacantes", tags=["Vacantes"])

# --- ESQUEMAS (Deben ir arriba para que Python los lea primero) ---
class EmpresaNombreResponse(BaseModel):
    nombre: str

class HabilidadInput(BaseModel):
    nombre: str
    nivel: Optional[str] = "Intermedio"

class VacanteCreateCompleta(BaseModel):
    titulo: str
    descripcion: str
    requisitos: Optional[str] = None
    ubicacion: Optional[str] = None
    modalidad: Optional[str] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    habilidades: List[HabilidadInput] = []

class AlcanceRequest(BaseModel):
    habilidades: List[HabilidadInput] = []
    experienciaMin: Optional[int] = 0
# -----------------------------------------------------------------

@router.get("/{vacante_id}/empresa")
def obtener_empresa_de_vacante(vacante_id: int, db: Session = Depends(get_db)):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    
    empresa = db.query(Empresa).filter(Empresa.usuario_id == vacante.empleador_id).first()
    if not empresa:
        return {"nombre": "Empresa Confidencial"}
    
    return {"nombre": empresa.nombre}

@router.post("/alcance")
def estimar_alcance(datos: AlcanceRequest, db: Session = Depends(get_db)):
    # 1. Obtener todos los aspirantes
    aspirantes = db.query(Usuario).filter(Usuario.tipo_usuario == "ASPIRANTE").all()
    total = len(aspirantes)
    
    if total == 0:
        return {"total": 0, "alta": 0, "media": 0, "baja": 0}

    # 2. Obtener los nombres de las habilidades requeridas
    req_nombres = [h.nombre for h in datos.habilidades if h.nombre]
    
    if not req_nombres:
        return {"total": total, "alta": 0, "media": 0, "baja": 0}

    # 3. Cargar el modelo de IA (Sentence Transformers) que ya usa el backend
    modelo = obtener_modelo()
    
    # 4. Pre-calcular los embeddings de las habilidades requeridas
    embeddings_req = modelo.encode(req_nombres, convert_to_tensor=True, normalize_embeddings=True)

    conteo = {"total": total, "alta": 0, "media": 0, "baja": 0}
    
    for aspirante in aspirantes:
        # Obtener las habilidades del aspirante
        habs_usuario = db.query(Habilidad.nombre).join(
            UsuarioHabilidad, UsuarioHabilidad.habilidad_id == Habilidad.id
        ).filter(UsuarioHabilidad.usuario_id == aspirante.id).all()
        
        nombres_usuario = [h[0] for h in habs_usuario]
        
        if not nombres_usuario:
            conteo["baja"] += 1
            continue
            
        # Calcular embeddings de las habilidades del aspirante
        embeddings_user = modelo.encode(nombres_usuario, convert_to_tensor=True, normalize_embeddings=True)
        
        # Calcular matriz de similitud (requisitos vs habilidades del aspirante)
        matriz = util.cos_sim(embeddings_req, embeddings_user)
        
        # Contar cuántos requisitos tienen una similitud >= 0.55 (el umbral que usa el backend)
        coincidencias = (matriz.max(dim=1).values >= 0.55).sum().item()
        
        # Lógica de clasificación (similar a la que tenías, pero basada en similitud)
        if coincidencias >= len(req_nombres) / 2:  # Si cumple al menos la mitad de los requisitos
            conteo["alta"] += 1
        elif coincidencias > 0:  # Si cumple al menos uno
            conteo["media"] += 1
        else:
            conteo["baja"] += 1

    return conteo

@router.post("/con-habilidades", response_model=VacanteResponse)
def crear_vacante_con_habilidades(
    vacante: VacanteCreateCompleta,
    empleador_id: int,
    db: Session = Depends(get_db)
):
    empleador = db.query(Usuario).filter(Usuario.id == empleador_id).first()
    if not empleador or empleador.tipo_usuario != "EMPLEADOR":
        raise HTTPException(status_code=403, detail="Solo los empleadores pueden publicar vacantes")

    nueva_vacante = Vacante(
        titulo=vacante.titulo,
        descripcion=vacante.descripcion,
        requisitos=vacante.requisitos,
        ubicacion=vacante.ubicacion,
        modalidad=vacante.modalidad,
        salario_min=vacante.salario_min,
        salario_max=vacante.salario_max,
        empleador_id=empleador_id,
        estado="ACTIVA"
    )
    db.add(nueva_vacante)
    db.commit()
    db.refresh(nueva_vacante)

    for h in vacante.habilidades:
        habilidad_db = db.query(Habilidad).filter(Habilidad.nombre == h.nombre).first()
        if not habilidad_db:
            habilidad_db = Habilidad(nombre=h.nombre)
            db.add(habilidad_db)
            db.commit()
            db.refresh(habilidad_db)

        asociacion = VacanteHabilidad(
            vacante_id=nueva_vacante.id,
            habilidad_id=habilidad_db.id,
            nivel_requerido=h.nivel
        )
        db.add(asociacion)
    
    db.commit()
    return nueva_vacante

@router.post("/", response_model=VacanteResponse)
def crear_vacante(
    vacante: VacanteCreate,
    empleador_id: int,
    db: Session = Depends(get_db)
):
    empleador = db.query(Usuario).filter(Usuario.id == empleador_id).first()
    if not empleador:
        raise HTTPException(status_code=404, detail="El usuario empleador no existe")
    if empleador.tipo_usuario != "EMPLEADOR":
         raise HTTPException(status_code=403, detail="Solo los empleadores pueden publicar vacantes")

    nueva_vacante = Vacante(**vacante.model_dump(), empleador_id=empleador_id)
    db.add(nueva_vacante)
    db.commit()
    db.refresh(nueva_vacante)
    return nueva_vacante

@router.get("/", response_model=list[VacanteResponse])
def listar_vacantes(db: Session = Depends(get_db)):
    return db.query(Vacante).order_by(Vacante.fecha_publicacion.desc()).all()

@router.get("/{vacante_id}", response_model=VacanteResponse)
def obtener_vacante(vacante_id: int, db: Session = Depends(get_db)):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")
    return vacante

@router.put("/{vacante_id}", response_model=VacanteResponse)
def actualizar_vacante(
    vacante_id: int,
    datos: VacanteCreate,
    db: Session = Depends(get_db)
):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")

    datos_actualizados = datos.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizados.items():
        setattr(vacante, campo, valor)

    db.commit()
    db.refresh(vacante)
    return vacante    

@router.post("/{vacante_id}/habilidades", response_model=VacanteHabilidadResponse, status_code=201)
def asociar_habilidad_vacantes(
    vacante_id: int,
    datos: VacanteHabilidadCreate,
    db: Session = Depends(get_db)
):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")

    habilidad = db.query(Habilidad).filter(Habilidad.id == datos.habilidad_id).first()
    if not habilidad:
        raise HTTPException(status_code=404, detail="La habilidad no existe")

    asociacion_existente = db.query(VacanteHabilidad).filter(
        VacanteHabilidad.vacante_id == vacante_id,
        VacanteHabilidad.habilidad_id == datos.habilidad_id
    ).first()

    if asociacion_existente:
        raise HTTPException(status_code=409, detail="Esta habilidad ya está asociada a la vacante")

    asociacion = VacanteHabilidad(
        vacante_id=vacante_id,
        habilidad_id=datos.habilidad_id,
        nivel_requerido=datos.nivel_requerido
    )
    db.add(asociacion)
    db.commit()
    db.refresh(asociacion)
    return asociacion

@router.get("/{vacante_id}/habilidades", response_model=list[VacanteHabilidadResponse])
def listar_habilides_vacante(vacante_id: int, db: Session = Depends(get_db)):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")
    return db.query(VacanteHabilidad).filter(VacanteHabilidad.vacante_id == vacante_id).all()

@router.delete("/{vacante_id}/habilidades/{habilidad_id}")
def eliminar_habilidad_vacante(vacante_id: int, habilidad_id: int, db: Session = Depends(get_db)):
    asociacion = db.query(VacanteHabilidad).filter(
        VacanteHabilidad.vacante_id == vacante_id,
        VacanteHabilidad.habilidad_id == habilidad_id
    ).first()

    if not asociacion:
        raise HTTPException(status_code=404, detail="La habilidad no esta asociada a esta vacante")

    db.delete(asociacion)
    db.commit()
    return {"mensaje": "Habilidad eliminada de la vacante correctamente", "vacante_id": vacante_id, "habilidad_id": habilidad_id}

@router.delete("/{vacante_id}")
def eliminar_vacante(vacante_id: int, db: Session = Depends(get_db)):
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if vacante is None:
        raise HTTPException(status_code=404, detail="La vacante no existe")

    db.query(VacanteHabilidad).filter(VacanteHabilidad.vacante_id == vacante_id).delete(synchronize_session=False)
    db.delete(vacante)
    db.commit()
    return {"mensaje": "Vacante eliminada correctamente", "vacante_id": vacante_id}

class TextoRequest(BaseModel):
    texto: str

@router.post("/analizar")
def analizar_texto_vacante(datos: TextoRequest):
    prompt = f"""
Eres un asistente experto en recursos humanos. Analiza la siguiente descripción de una vacante y extrae las habilidades requeridas.
Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{{
    "cargoDetectado": "Nombre del cargo o null",
    "experienciaMin": 0,
    "modalidad": "Presencial" | "Remoto" | "Híbrido" | null,
    "habilidades": [
        {{"nombre": "Nombre de la habilidad", "nivel": 5, "obligatoria": true}}
    ],
    "resumen": "Breve resumen de lo que pide la vacante",
    "advertencias": []
}}

REGLAS IMPORTANTES PARA LAS HABILIDADES:
1. Usa nombres CORTOS y TÉCNICOS (Ej: "Excel" en lugar de "manejo de hojas de cálculo", "SQL" en lugar de "bases de datos relacionales", "Power BI", "Python").
2. Si el texto menciona herramientas específicas, úsalas tal cual.
3. Si es una habilidad blanda, usa el término estándar (Ej: "Trabajo en equipo", "Liderazgo").

Texto de la vacante:
"{datos.texto}"
"""
    
    try:
        respuesta = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:1.5b",
                "prompt": prompt,
                "format": "json",
                "stream": False
            },
            timeout=60
        )
        respuesta.raise_for_status()
        contenido = respuesta.json()["response"]
        resultado = json.loads(contenido)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error al analizar con IA: {str(e)}")