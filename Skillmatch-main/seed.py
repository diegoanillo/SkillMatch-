from app.database.connection import SessionLocal, Base, engine
from app.modules.usuarios.models import Usuario
from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from app.core.security import hashear_password
from app.modules.usuarios.empresa import Empresa



Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Creando usuarios...")
usuarios = [
    ("María", "Gómez", "maria@skillmatch.com", "123456", "ASPIRANTE"),
    ("Carlos", "Ruiz", "reclutador@skillmatch.com", "123456", "EMPLEADOR"),
]

usuarios_db = {}
for nombre, apellido, email, password, tipo in usuarios:
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if not u:
        u = Usuario(nombre=nombre, apellido=apellido, email=email, password=hashear_password(password), tipo_usuario=tipo)
        db.add(u)
        db.commit()
        db.refresh(u)
    usuarios_db[email] = u

print("Creando perfil de María...")
maria = usuarios_db["maria@skillmatch.com"]
perfil = db.query(Perfil).filter(Perfil.usuario_id == maria.id).first()
if not perfil:
    perfil = Perfil(
        usuario_id=maria.id,
        resumen_profesional="Asistente administrativa con interés en análisis de datos.",
        formacion_academica="Tecnóloga en Gestión Administrativa",
        experiencia_laboral="1 años",
        ubicacion="Bogotá"
    )
    db.add(perfil)
    db.commit()

print("Creando habilidades base y asociándolas a María...")
habilidades_base = [
    ("Excel", "Avanzado"),
    ("SQL", "Intermedio"),
    ("Power BI", "Básico"),
    ("Análisis de datos", "Intermedio"),
    ("Comunicación", "Avanzado")
]

for nombre_hab, nivel in habilidades_base:
    h = db.query(Habilidad).filter(Habilidad.nombre == nombre_hab).first()
    if not h:
        h = Habilidad(nombre=nombre_hab)
        db.add(h)
        db.commit()
        db.refresh(h)
    
    asociacion = db.query(UsuarioHabilidad).filter(
        UsuarioHabilidad.usuario_id == maria.id,
        UsuarioHabilidad.habilidad_id == h.id
    ).first()
    
    if not asociacion:
        nueva_asoc = UsuarioHabilidad(usuario_id=maria.id, habilidad_id=h.id, nivel=nivel)
        db.add(nueva_asoc)
        db.commit()

print("¡Listo! Usuarios y perfil de María creados con éxito.")

print("Creando empresa de Carlos...")
carlos = usuarios_db["reclutador@skillmatch.com"]
empresa_existente = db.query(Empresa).filter(Empresa.usuario_id == carlos.id).first()
if not empresa_existente:
    nueva_empresa = Empresa(
        usuario_id=carlos.id,
        nombre="Cooperativa Financiera del Norte",
        sector="Finanzas",
        ciudad="Bogotá"
    )
    db.add(nueva_empresa)
    db.commit()

db.close()
print("¡Listo! Usuarios, perfil de María y empresa de Carlos creados.")