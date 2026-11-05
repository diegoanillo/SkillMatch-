import app.main  
from app.database.connection import SessionLocal
from app.modules.vacantes.models import Vacante, VacanteHabilidad
from app.modules.habilidades.models import Habilidad

db = SessionLocal()

# 1. Las habilidades que usaremos (si no existen, se crean)
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

# 2. Definir las vacantes iguales a las del frontend
# (Titulo, Descripción, Ubicación, Modalidad, Empleador ID, [Habilidades])
# Usamos Empleador ID = 2 (Carlos) para todas.
vacantes_data = [
    {
        "titulo": "Analista de datos jr.",
        "descripcion": "Apoyarás al equipo de riesgo en la preparación de reportes, consultas a bases de datos y tableros para la gerencia.",
        "ubicacion": "Bogotá", "modalidad": "Híbrido",
        "habilidades": [("Excel", "Avanzado"), ("SQL", "Avanzado"), ("Power BI", "Intermedio"), ("Análisis de datos", "Avanzado"), ("Comunicación", "Intermedio")]
    },
    {
        "titulo": "Asistente de datos y reportes",
        "descripcion": "Consolidarás cifras de ventas por tienda y prepararás los reportes semanales para los gerentes regionales.",
        "ubicacion": "Medellín", "modalidad": "Presencial",
        "habilidades": [("Excel", "Intermedio"), ("Organización", "Avanzado"), ("Ventas", "Avanzado"), ("Power BI", "Intermedio")]
    },
    {
        "titulo": "Analista de business intelligence",
        "descripcion": "Diseñarás y mantendrás modelos de datos y tableros ejecutivos que usan las áreas comerciales y de riesgo.",
        "ubicacion": "Bogotá", "modalidad": "Híbrido",
        "habilidades": [("Excel", "Experto"), ("Power BI", "Experto"), ("SQL", "Experto"), ("Análisis de datos", "Experto"), ("Modelado de datos", "Avanzado")]
    },
    {
        "titulo": "Auxiliar administrativo de operaciones",
        "descripcion": "Coordinarás la documentación de despachos, el seguimiento a pedidos y la atención a clientes corporativos.",
        "ubicacion": "Bogotá", "modalidad": "Presencial",
        "habilidades": [("Organización", "Intermedio"), ("Procesos administrativos", "Intermedio"), ("Excel", "Intermedio"), ("Atención al cliente", "Intermedio")]
    },
    {
        "titulo": "Ejecutivo comercial junior",
        "descripcion": "Atenderás clientes nuevos y existentes, explicarás los productos de seguros y darás seguimiento a cotizaciones.",
        "ubicacion": "Cali", "modalidad": "Híbrido",
        "habilidades": [("Ventas", "Avanzado"), ("Comunicación", "Avanzado"), ("Atención al cliente", "Intermedio"), ("Adaptabilidad", "Intermedio")]
    },
    {
        "titulo": "Analista de datos de marketing",
        "descripcion": "Medirás el rendimiento de campañas digitales y construirás reportes para clientes de distintas industrias.",
        "ubicacion": "Remoto", "modalidad": "Remoto",
        "habilidades": [("SQL", "Intermedio"), ("Excel", "Intermedio"), ("Marketing digital", "Intermedio"), ("Análisis de datos", "Intermedio")]
    },
    {
        "titulo": "Científico de datos jr.",
        "descripcion": "Participarás en proyectos de analítica avanzada: limpieza de datos, modelos predictivos y visualización de resultados.",
        "ubicacion": "Remoto", "modalidad": "Remoto",
        "habilidades": [("Python", "Avanzado"), ("SQL", "Intermedio"), ("Análisis de datos", "Avanzado"), ("Modelado de datos", "Intermedio")]
    },
    {
        "titulo": "Coordinador de servicio al cliente",
        "descripcion": "Liderarás un equipo de agentes, harás seguimiento a indicadores de servicio y resolverás casos escalados.",
        "ubicacion": "Barranquilla", "modalidad": "Presencial",
        "habilidades": [("Atención al cliente", "Avanzado"), ("Liderazgo", "Intermedio"), ("Comunicación", "Avanzado"), ("Organización", "Intermedio")]
    },
    {
        "titulo": "Auxiliar de servicios generales",
        "descripcion": "Mantendrás limpias y ordenadas las zonas comunes y oficinas, manejarás los insumos de aseo y apoyarás el mantenimiento básico.",
        "ubicacion": "Bogotá", "modalidad": "Presencial",
        "habilidades": [("Limpieza y aseo", "Intermedio"), ("Responsabilidad", "Intermedio"), ("Puntualidad", "Intermedio"), ("Resistencia física", "Intermedio"), ("Manejo de productos químicos", "Básico")]
    },
    {
        "titulo": "Auxiliar de bodega",
        "descripcion": "Recibirás y alistarás pedidos, mantendrás el inventario al día y apoyarás el cargue y descargue de mercancía.",
        "ubicacion": "Bogotá", "modalidad": "Presencial",
        "habilidades": [("Almacenamiento y despacho", "Intermedio"), ("Manejo de inventarios", "Intermedio"), ("Resistencia física", "Intermedio"), ("Responsabilidad", "Intermedio")]
    }
]

# 3. Insertar en la base de datos
for v_data in vacantes_data:
    # Evitar duplicados si corres el script dos veces
    existe = db.query(Vacante).filter(Vacante.titulo == v_data["titulo"]).first()
    if existe:
        print(f"Ya existe: {v_data['titulo']}")
        continue

    nueva_vacante = Vacante(
        titulo=v_data["titulo"],
        descripcion=v_data["descripcion"],
        ubicacion=v_data["ubicacion"],
        modalidad=v_data["modalidad"],
        estado="ACTIVA",
        empleador_id=2 # Carlos Ruiz
    )
    db.add(nueva_vacante)
    db.commit()
    db.refresh(nueva_vacante)

    # Asociar habilidades
    for hab_nombre, nivel in v_data["habilidades"]:
        hab_id = habilidades_db[hab_nombre]
        nueva_asoc = VacanteHabilidad(
            vacante_id=nueva_vacante.id,
            habilidad_id=hab_id,
            nivel_requerido=nivel
        )
        db.add(nueva_asoc)
    
    db.commit()
    print(f"Creada: {v_data['titulo']}")

db.close()
print("¡Listo! Todas las vacantes han sido creadas.")