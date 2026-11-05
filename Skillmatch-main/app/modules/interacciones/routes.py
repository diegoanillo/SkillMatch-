from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.modules.interacciones.models import Postulacion, OfertaGuardada, Notificacion
from app.modules.interacciones.schemas import (
    PostulacionCreate, PostulacionResponse,
    OfertaGuardadaCreate, OfertaGuardadaResponse
)
from app.modules.vacantes.models import Vacante
from app.modules.usuarios.models import Usuario
from app.modules.usuarios.empresa import Empresa
from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad

router = APIRouter(prefix="/interacciones", tags=["Interacciones"])

@router.post("/postular", response_model=PostulacionResponse)
def postular(datos: PostulacionCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == datos.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El usuario no existe")
    
    vacante = db.query(Vacante).filter(Vacante.id == datos.vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")
    if vacante.estado != "ACTIVA":
        raise HTTPException(status_code=400, detail="Esta vacante ya no recibe postulaciones")

    existe = db.query(Postulacion).filter(
        Postulacion.usuario_id == datos.usuario_id,
        Postulacion.vacante_id == datos.vacante_id
    ).first()
    if existe:
        raise HTTPException(status_code=409, detail="Ya te postulaste a esta oferta")
    
    nueva = Postulacion(usuario_id=datos.usuario_id, vacante_id=datos.vacante_id)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/postulaciones/{usuario_id}", response_model=list[PostulacionResponse])
def listar_postulaciones(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Postulacion).filter(Postulacion.usuario_id == usuario_id).all()

@router.post("/guardar", response_model=OfertaGuardadaResponse)
def guardar_oferta(datos: OfertaGuardadaCreate, db: Session = Depends(get_db)):
    vacante = db.query(Vacante).filter(Vacante.id == datos.vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante no existe")

    existe = db.query(OfertaGuardada).filter(
        OfertaGuardada.usuario_id == datos.usuario_id,
        OfertaGuardada.vacante_id == datos.vacante_id
    ).first()
    
    if existe:
        db.delete(existe)
        db.commit()
        return {"id": existe.id, "usuario_id": existe.usuario_id, "vacante_id": existe.vacante_id}
    
    nueva = OfertaGuardada(usuario_id=datos.usuario_id, vacante_id=datos.vacante_id)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/guardadas/{usuario_id}", response_model=list[OfertaGuardadaResponse])
def listar_guardadas(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(OfertaGuardada).filter(OfertaGuardada.usuario_id == usuario_id).all()

@router.get("/postulantes/vacante/{vacante_id}")
def contar_postulantes_vacante(vacante_id: int, db: Session = Depends(get_db)):
    postulantes = db.query(Postulacion).filter(Postulacion.vacante_id == vacante_id).all()
    return {
        "total": len(postulantes),
        "nuevos": len([p for p in postulantes if p.estado == "Enviada"])
    }

@router.get("/candidatos/vacante/{vacante_id}")
def listar_candidatos_vacante(vacante_id: int, db: Session = Depends(get_db)):
    postulaciones = db.query(Postulacion).filter(Postulacion.vacante_id == vacante_id).all()
    
    resultados = []
    for post in postulaciones:
        usuario = db.query(Usuario).filter(Usuario.id == post.usuario_id).first()
        if not usuario:
            continue
            
        perfil = db.query(Perfil).filter(Perfil.usuario_id == usuario.id).first()
        
        habilidades_usuario = db.query(Habilidad.nombre, UsuarioHabilidad.nivel).join(
            UsuarioHabilidad, UsuarioHabilidad.habilidad_id == Habilidad.id
        ).filter(UsuarioHabilidad.usuario_id == usuario.id).all()
        
        habilidades_formateadas = [{"nombre": h[0], "nivel": h[1]} for h in habilidades_usuario]
        
        resultados.append({
            "id": usuario.id,
            "nombre": usuario.nombre + " " + usuario.apellido,
            "cargoActual": "No especificado",
            "ubicacion": perfil.ubicacion if perfil else "No especificada",
            "educacion": perfil.formacion_academica if perfil else "No especificada",
            "experienciaAnios": int(perfil.experiencia_laboral.split()[0]) if perfil and perfil.experiencia_laboral else 0,
            "sobreMi": perfil.resumen_profesional if perfil else "Sin descripción",
            "habilidades": habilidades_formateadas,
            "postulacion": {
                "fecha": post.fecha,
                "estado": post.estado,
                "mensaje": post.mensaje,
                "respuesta": post.respuesta
            }
        })
        
    return resultados

@router.put("/cambiar-estado")
def cambiar_estado_postulacion(datos: dict, db: Session = Depends(get_db)):
    usuario_id = datos.get("usuario_id")
    vacante_id = datos.get("vacante_id")
    nuevo_estado = datos.get("estado")
    mensaje = datos.get("mensaje")

    postulacion = db.query(Postulacion).filter(
        Postulacion.usuario_id == usuario_id,
        Postulacion.vacante_id == vacante_id
    ).first()
    
    if not postulacion:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    
    postulacion.estado = nuevo_estado
    if mensaje:
        postulacion.mensaje = mensaje

    # Notificar al aspirante
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if vacante:
        empresa = db.query(Empresa).filter(Empresa.usuario_id == vacante.empleador_id).first()
        nombre_empresa = empresa.nombre if empresa else "Una empresa"
        
        if nuevo_estado == "Preseleccionado":
            texto_notif = f"Has sido preseleccionado para la vacante: {vacante.titulo}"
        elif nuevo_estado == "Contactado":
            texto_notif = f"Te han contactado por la vacante: {vacante.titulo}. Revisa el mensaje."
        elif nuevo_estado == "Descartado":
            texto_notif = f"Tu postulación a {vacante.titulo} ha sido descartada."
        else:
            texto_notif = f"Tu postulación a {vacante.titulo} ha cambiado a estado: {nuevo_estado}"

        notificacion = Notificacion(
            usuario_id=usuario_id,
            vacante_id=vacante_id,
            titulo=f"Actualización de {nombre_empresa}",
            texto=texto_notif,
            leida=0
        )
        db.add(notificacion)
    
    db.commit()
    return {"mensaje": "Estado actualizado", "estado": postulacion.estado}

@router.put("/responder-contacto")
def responder_contacto(datos: dict, db: Session = Depends(get_db)):
    usuario_id = datos.get("usuario_id")
    vacante_id = datos.get("vacante_id")
    respuesta = datos.get("respuesta")

    postulacion = db.query(Postulacion).filter(
        Postulacion.usuario_id == usuario_id,
        Postulacion.vacante_id == vacante_id
    ).first()
    
    if not postulacion:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    
    postulacion.respuesta = respuesta
    
    # Notificar al reclutador
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if vacante:
        candidato = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        nombre = f"{candidato.nombre} {candidato.apellido}" if candidato else "Un candidato"
        notificacion = Notificacion(
            usuario_id=vacante.empleador_id,
            vacante_id=vacante_id,
            titulo=f"Respuesta de {nombre}",
            texto=f"Ha respondido a tu mensaje sobre: {vacante.titulo}",
            leida=0
        )
        db.add(notificacion)

    db.commit()
    return {"mensaje": "Respuesta guardada", "estado": postulacion.estado}

@router.get("/notificaciones/{usuario_id}")
def listar_notificaciones(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Notificacion).filter(Notificacion.usuario_id == usuario_id).order_by(Notificacion.fecha.desc()).all()

@router.put("/notificaciones/{notificacion_id}/leer")
def marcar_notificacion_leida(notificacion_id: int, db: Session = Depends(get_db)):
    notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    notificacion.leida = 1
    db.commit()
    db.refresh(notificacion)
    return {"mensaje": "Notificación leída"}

@router.put("/notificaciones/leer-todas/{usuario_id}")
def marcar_todas_leidas(usuario_id: int, db: Session = Depends(get_db)):
    notificaciones = db.query(Notificacion).filter(
        Notificacion.usuario_id == usuario_id,
        Notificacion.leida == 0
    ).all()
    
    for n in notificaciones:
        n.leida = 1
        
    db.commit()
    return {"mensaje": "Todas las notificaciones marcadas como leídas"}