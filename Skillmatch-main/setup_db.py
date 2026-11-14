from app.database.connection import SessionLocal, Base, engine
from app.modules.usuarios.catalogos import Catalogo

# Importamos todos los modelos para que SQLAlchemy los detecte y cree las tablas
from app.modules.usuarios.models import Usuario
from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from app.modules.vacantes.models import Vacante, VacanteHabilidad
from app.modules.cursos.models import Curso, CursoHabilidad
from app.modules.usuarios.empresa import Empresa
from app.modules.interacciones.models import Postulacion, OfertaGuardada, Notificacion
from app.modules.chat.models import Mensaje

print("Creando todas las tablas...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Cargando catálogos maestros...")
catalogos_data = {
    "educacion": ["Bachiller", "Técnico", "Tecnólogo", "Profesional universitario", "Posgrado"],
    "sectores": [
        "Finanzas", "Comercio", "Tecnología", "Logística", "Servicios", "Salud", "Educación",
        "Manufactura", "Construcción", "Alimentos y restaurantes", "Turismo", "Transporte",
        "Agricultura", "Minería", "Energía", "Telecomunicaciones", "Marketing", "Seguros",
        "Inmobiliario", "Legal", "Consultoría", "Otro"
    ],
    "tamanosEmpresa": [
        "1-10 personas", "11-50 personas", "51-200 personas", "201-1000 personas",
        "1001-5000 personas", "Más de 5000 personas"
    ],
    "modalidades": ["Presencial", "Híbrido", "Remoto"],
    "niveles": ["Practicante", "Junior", "Semi-senior", "Senior"],
    "ciudades": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Remoto"]
}

for tipo, valores in catalogos_data.items():
    for valor in valores:
        existe = db.query(Catalogo).filter(Catalogo.tipo == tipo, Catalogo.valor == valor).first()
        if not existe:
            db.add(Catalogo(tipo=tipo, valor=valor))

db.commit()
print("¡Listo! Tablas creadas y catálogos cargados. La base de datos está lista.")


print("Creando cursos")

# Helper para no repetir tanto código
def crear_curso(titulo, tipo, horas, url, habilidades):
    curso = db.query(Curso).filter(Curso.titulo == titulo).first()
    if not curso:
        curso = Curso(titulo=titulo, tipo=tipo, horas=horas, url=url)
        db.add(curso)
        db.commit()
        db.refresh(curso)
    
    for hab_nombre, boost in habilidades:
        hab = db.query(Habilidad).filter(Habilidad.nombre == hab_nombre).first()
        if not hab:
            hab = Habilidad(nombre=hab_nombre)
            db.add(hab)
            db.commit()
            db.refresh(hab)
            
        asoc = db.query(CursoHabilidad).filter(
            CursoHabilidad.curso_id == curso.id,
            CursoHabilidad.habilidad_id == hab.id
        ).first()
        if not asoc:
            db.add(CursoHabilidad(curso_id=curso.id, habilidad_id=hab.id, boost=boost))
    db.commit()


    print("GUARDANDO CURSOS EN LA TABLA CURSOS")

# ==========================================
# 1. TECNOLOGÍA (12 cursos)
# ==========================================
tecnologia = [
    ("Python desde cero", "Curso", 30, "https://coursera.org", [("Python", 2)]),
    ("Análisis de datos con Python (Pandas)", "Curso", 25, "https://coursera.org", [("Python", 2), ("Análisis de datos", 2)]),
    ("SQL para ciencia de datos", "Curso", 20, "https://coursera.org", [("SQL", 2)]),
    ("Bases de datos relacionales avanzadas", "Curso", 18, "https://coursera.org", [("SQL", 1), ("Modelado de datos", 2)]),
    ("Desarrollo Web con React", "Curso", 35, "https://coursera.org", [("React", 2), ("JavaScript", 1)]),
    ("JavaScript Moderno (ES6+)", "Curso", 20, "https://coursera.org", [("JavaScript", 2)]),
    ("Docker y Kubernetes esencial", "Curso", 15, "https://coursera.org", [("Docker", 2)]),
    ("Power BI para principiantes", "Curso", 12, "https://coursera.org", [("Power BI", 2)]),
    ("Excel Avanzado para análisis", "Curso", 15, "https://coursera.org", [("Excel", 1), ("Análisis de datos", 1)]),
    ("Machine Learning básico", "Curso", 40, "https://coursera.org", [("Python", 2), ("Análisis de datos", 2)]),
    ("Desarrollo Backend con Node.js", "Curso", 30, "https://coursera.org", [("JavaScript", 2)]),
    ("Seguridad informática básica", "Curso", 20, "https://coursera.org", [("Seguridad y salud en el trabajo", 1)]) # Reutilizando habilidad
]

# ==========================================
# 2. FINANZAS (12 cursos)
# ==========================================
finanzas = [
    ("Fundamentos de Contabilidad", "Curso", 15, "https://coursera.org", [("Finanzas", 2)]),
    ("Análisis financiero con Excel", "Curso", 12, "https://coursera.org", [("Finanzas", 1), ("Excel", 1)]),
    ("Matemáticas financieras", "Curso", 20, "https://coursera.org", [("Finanzas", 2)]),
    ("Gestión de presupuestos", "Curso", 10, "https://coursera.org", [("Finanzas", 2)]),
    ("Auditoría interna", "Curso", 25, "https://coursera.org", [("Finanzas", 2), ("Procesos administrativos", 1)]),
    ("Excel para finanzas", "Curso", 15, "https://coursera.org", [("Excel", 2), ("Finanzas", 1)]),
    ("Inversiones en bolsa", "Curso", 30, "https://coursera.org", [("Finanzas", 2)]),
    ("Contabilidad de costos", "Curso", 18, "https://coursera.org", [("Finanzas", 2)]),
    ("Análisis de riesgo financiero", "Curso", 20, "https://coursera.org", [("Finanzas", 2), ("Análisis de datos", 1)]),
    ("Power BI para finanzas", "Curso", 12, "https://coursera.org", [("Power BI", 2), ("Finanzas", 1)]),
    ("Gestión tributaria", "Curso", 22, "https://coursera.org", [("Finanzas", 2)]),
    ("Finanzas personales y ahorro", "Curso", 8, "https://coursera.org", [("Finanzas", 1)])
]

# ==========================================
# 3. LOGÍSTICA (12 cursos)
# ==========================================
logistica = [
    ("Control de inventarios y almacenamiento", "Curso", 12, "https://coursera.org", [("Manejo de inventarios", 2), ("Almacenamiento y despacho", 2)]),
    ("Logística de distribución", "Curso", 15, "https://coursera.org", [("Almacenamiento y despacho", 1)]),
    ("Manejo seguro de montacargas", "Curso", 8, "https://coursera.org", [("Manejo de montacargas", 2), ("Seguridad y salud en el trabajo", 1)]),
    ("Cadena de suministro (Supply Chain)", "Curso", 25, "https://coursera.org", [("Manejo de inventarios", 2)]),
    ("Gestión de almacenes", "Curso", 15, "https://coursera.org", [("Almacenamiento y despacho", 2)]),
    ("Transporte y distribución", "Curso", 10, "https://coursera.org", [("Almacenamiento y despacho", 1)]),
    ("Logística inversa", "Curso", 12, "https://coursera.org", [("Manejo de residuos", 1)]),
    ("Excel para logística", "Curso", 10, "https://coursera.org", [("Excel", 2), ("Manejo de inventarios", 1)]),
    ("Seguridad en bodegas", "Curso", 8, "https://coursera.org", [("Seguridad y salud en el trabajo", 2)]),
    ("Planificación de la demanda", "Curso", 18, "https://coursera.org", [("Análisis de datos", 1), ("Manejo de inventarios", 1)]),
    ("Compras y abastecimiento", "Curso", 15, "https://coursera.org", [("Procesos administrativos", 1)]),
    ("Logística internacional", "Curso", 20, "https://coursera.org", [("Almacenamiento y despacho", 1)])
]

# ==========================================
# 4. SERVICIOS GENERALES (12 cursos)
# ==========================================
servicios = [
    ("Limpieza profesional y manejo de químicos", "Curso", 10, "https://sena.edu.co", [("Limpieza y aseo", 2), ("Manejo de productos químicos", 2)]),
    ("Gestión de residuos y reciclaje", "Curso", 8, "https://sena.edu.co", [("Manejo de residuos", 2)]),
    ("Mantenimiento básico de instalaciones", "Curso", 12, "https://coursera.org", [("Mantenimiento básico", 2)]),
    ("Atención al cliente excepcional", "Curso", 12, "https://coursera.org", [("Atención al cliente", 2), ("Comunicación", 1)]),
    ("Liderazgo de equipos de servicio", "Curso", 15, "https://coursera.org", [("Liderazgo", 2)]),
    ("Seguridad y salud en el trabajo", "Curso", 20, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Manejo de productos de limpieza", "Curso", 6, "https://sena.edu.co", [("Manejo de productos químicos", 1)]),
    ("Resolución de conflictos", "Curso", 10, "https://coursera.org", [("Resolución de problemas", 2)]),
    ("Comunicación asertiva", "Curso", 8, "https://coursera.org", [("Comunicación", 2)]),
    ("Trabajo en equipo", "Curso", 6, "https://coursera.org", [("Trabajo en equipo", 2)]),
    ("Puntualidad y ética laboral", "Curso", 4, "https://coursera.org", [("Responsabilidad", 1), ("Puntualidad", 1)]),
    ("Primeros auxilios básicos", "Curso", 10, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 1)])
]

# ==========================================
# 5. COMERCIO Y VENTAS (12 cursos)
# ==========================================
comercio = [
    ("Técnicas de venta consultiva", "Curso", 15, "https://coursera.org", [("Ventas", 2), ("Comunicación", 1)]),
    ("Atención al cliente excepcional", "Curso", 12, "https://coursera.org", [("Atención al cliente", 2), ("Comunicación", 1)]),
    ("Manejo de caja y punto de venta", "Curso", 8, "https://coursera.org", [("Caja y manejo de dinero", 2)]),
    ("Marketing digital para emprendedores", "Curso", 20, "https://coursera.org", [("Marketing digital", 2)]),
    ("Negociación comercial", "Curso", 15, "https://coursera.org", [("Ventas", 2)]),
    ("Atención al cliente telefónico", "Curso", 10, "https://coursera.org", [("Atención al cliente", 2)]),
    ("Ventas por redes sociales", "Curso", 12, "https://coursera.org", [("Ventas", 1), ("Marketing digital", 1)]),
    ("Servicio al cliente y manejo de quejas", "Curso", 10, "https://coursera.org", [("Atención al cliente", 2), ("Resolución de problemas", 1)]),
    ("Comunicación persuasiva", "Curso", 8, "https://coursera.org", [("Comunicación", 2)]),
    ("Cierre de ventas efectivo", "Curso", 10, "https://coursera.org", [("Ventas", 2)]),
    ("Fidelización de clientes", "Curso", 12, "https://coursera.org", [("Atención al cliente", 1), ("Marketing digital", 1)]),
    ("Excel básico para ventas", "Curso", 10, "https://coursera.org", [("Excel", 1)])
]

# ==========================================
# 6. SALUD Y EDUCACIÓN (12 cursos)
# ==========================================
salud = [
    ("Seguridad y salud en el trabajo", "Curso", 15, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Manipulación higiénica de alimentos", "Curso", 10, "https://sena.edu.co", [("Manipulación de alimentos", 2), ("Limpieza y aseo", 1)]),
    ("Bioseguridad en el entorno laboral", "Curso", 12, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 1)]),
    ("Primeros auxilios avanzados", "Curso", 20, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Higiene y desinfección", "Curso", 8, "https://sena.edu.co", [("Limpieza y aseo", 2)]),
    ("Salud ocupacional", "Curso", 18, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Cocina saludable", "Curso", 10, "https://coursera.org", [("Cocina", 1), ("Manipulación de alimentos", 1)]),
    ("Nutrición básica", "Curso", 12, "https://coursera.org", [("Salud", 2)]),
    ("Educación para la salud", "Curso", 15, "https://coursera.org", [("Comunicación", 1)]),
    ("Atención al adulto mayor", "Curso", 20, "https://sena.edu.co", [("Atención al cliente", 1), ("Responsabilidad", 1)]),
    ("Control de infecciones", "Curso", 15, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 1)]),
    ("Manejo de estrés laboral", "Curso", 8, "https://coursera.org", [("Trabajo bajo presión", 2)])
]

# ==========================================
# 7. CONSTRUCCIÓN Y MANUFACTURA (12 cursos)
# ==========================================
construccion = [
    ("Seguridad en obras de construcción", "Curso", 15, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Mantenimiento de maquinaria", "Curso", 20, "https://sena.edu.co", [("Mantenimiento básico", 2)]),
    ("Electricidad básica", "Curso", 15, "https://sena.edu.co", [("Mantenimiento básico", 1)]),
    ("Plomería básica", "Curso", 10, "https://sena.edu.co", [("Mantenimiento básico", 1)]),
    ("Lectura de planos", "Curso", 18, "https://sena.edu.co", [("Mantenimiento básico", 1)]),
    ("Trabajo en alturas", "Curso", 12, "https://sena.edu.co", [("Seguridad y salud en el trabajo", 2)]),
    ("Soldadura básica", "Curso", 25, "https://sena.edu.co", [("Mantenimiento básico", 2)]),
    ("Carpintería", "Curso", 20, "https://sena.edu.co", [("Mantenimiento básico", 2)]),
    ("Manejo de herramientas", "Curso", 8, "https://sena.edu.co", [("Mantenimiento básico", 1)]),
    ("Control de calidad en manufactura", "Curso", 15, "https://coursera.org", [("Procesos administrativos", 1)]),
    ("Resistencia física y ergonomía", "Curso", 6, "https://sena.edu.co", [("Resistencia física", 2)]),
    ("Gestión de residuos industriales", "Curso", 10, "https://sena.edu.co", [("Manejo de residuos", 2)])
]

# Ejecutamos todos los grupos
todos_los_cursos = tecnologia + finanzas + logistica + servicios + comercio + salud + construccion

for c in todos_los_cursos:
    crear_curso(c[0], c[1], c[2], c[3], c[4])

db.close()
print("¡Listo! Se han creado más de 80 cursos en el catálogo.")
