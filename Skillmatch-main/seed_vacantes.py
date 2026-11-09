from app.database.connection import SessionLocal
from app.modules.vacantes.models import Vacante, VacanteHabilidad
from app.modules.habilidades.models import Habilidad
from app.modules.usuarios.models import Usuario

db = SessionLocal()
nombres_habilidades = [
    "Excel", "SQL", "Power BI", "Análisis de datos", "Comunicación", 
    "Organización", "Ventas", "Modelado de datos", "Procesos administrativos", 
    "Atención al cliente", "Adaptabilidad", "Marketing digital", "Python", 
    "Liderazgo", "Resolución de problemas", "Limpieza y aseo", "Responsabilidad", 
    "Puntualidad", "Resistencia física", "Manejo de productos químicos", 
    "Manejo de residuos", "Almacenamiento y despacho", "Manejo de inventarios",
    "Manejo de montacargas"
]

habilidades_db = {}
for nombre in nombres_habilidades:
    h = db.query(Habilidad).filter(Habilidad.nombre == nombre).first()
    if not h:
        h = Habilidad(nombre=nombre)
        db.add(h)
        db.commit()
        db.refresh(h)
    habilidades_db[nombre] = h.id

vacantes_data = [
    {"titulo": "Analista de datos jr.", "descripcion": "Apoyarás al equipo de riesgo...", "ubicacion": "Bogotá", "modalidad": "Híbrido", "habilidades": [("Excel", 8), ("SQL", 8), ("Power BI", 6), ("Análisis de datos", 8), ("Comunicación", 6)]},
    {"titulo": "Asistente de datos y reportes", "descripcion": "Consolidarás cifras de ventas...", "ubicacion": "Medellín", "modalidad": "Presencial", "habilidades": [("Excel", 6), ("Organización", 8), ("Ventas", 8), ("Power BI", 6)]},
    {"titulo": "Analista de business intelligence", "descripcion": "Diseñarás y mantendrás modelos...", "ubicacion": "Bogotá", "modalidad": "Híbrido", "habilidades": [("Excel", 10), ("Power BI", 10), ("SQL", 10), ("Análisis de datos", 10), ("Modelado de datos", 8)]},
    {"titulo": "Auxiliar administrativo de operaciones", "descripcion": "Coordinarás la documentación...", "ubicacion": "Bogotá", "modalidad": "Presencial", "habilidades": [("Organización", 6), ("Procesos administrativos", 6), ("Excel", 6), ("Atención al cliente", 6)]},
    {"titulo": "Ejecutivo comercial junior", "descripcion": "Atenderás clientes nuevos...", "ubicacion": "Cali", "modalidad": "Híbrido", "habilidades": [("Ventas", 8), ("Comunicación", 8), ("Atención al cliente", 6), ("Adaptabilidad", 6)]},
    {"titulo": "Analista de datos de marketing", "descripcion": "Medirás el rendimiento...", "ubicacion": "Remoto", "modalidad": "Remoto", "habilidades": [("SQL", 6), ("Excel", 6), ("Marketing digital", 6), ("Análisis de datos", 6)]},
    {"titulo": "Científico de datos jr.", "descripcion": "Participarás en proyectos...", "ubicacion": "Remoto", "modalidad": "Remoto", "habilidades": [("Python", 8), ("SQL", 6), ("Análisis de datos", 8), ("Modelado de datos", 6)]},
    {"titulo": "Coordinador de servicio al cliente", "descripcion": "Liderarás un equipo...", "ubicacion": "Barranquilla", "modalidad": "Presencial", "habilidades": [("Atención al cliente", 8), ("Liderazgo", 6), ("Comunicación", 8), ("Organización", 6)]},
    {"titulo": "Auxiliar de servicios generales", "descripcion": "Mantendrás limpias...", "ubicacion": "Bogotá", "modalidad": "Presencial", "habilidades": [("Limpieza y aseo", 6), ("Responsabilidad", 6), ("Puntualidad", 6), ("Resistencia física", 6), ("Manejo de productos químicos", 4)]},
    {"titulo": "Auxiliar de bodega", "descripcion": "Recibirás y alistarás pedidos...", "ubicacion": "Bogotá", "modalidad": "Presencial", "habilidades": [("Almacenamiento y despacho", 6), ("Manejo de inventarios", 6), ("Resistencia física", 6), ("Responsabilidad", 6)]}
]

for v_data in vacantes_data:
    existe = db.query(Vacante).filter(Vacante.titulo == v_data["titulo"]).first()
    if existe: continue
    nueva = Vacante(titulo=v_data["titulo"], descripcion=v_data["descripcion"], ubicacion=v_data["ubicacion"], modalidad=v_data["modalidad"], estado="ACTIVA", empleador_id=2)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    for hab_nombre, nivel in v_data["habilidades"]:
        db.add(VacanteHabilidad(vacante_id=nueva.id, habilidad_id=habilidades_db[hab_nombre], nivel_requerido=nivel))
    db.commit()
    print(f"Creada: {v_data['titulo']}")

db.close()
print("¡Listo! Vacantes creadas.")