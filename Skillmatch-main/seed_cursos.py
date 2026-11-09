from app.database.connection import SessionLocal
from app.modules.cursos.models import Curso, CursoHabilidad
from app.modules.habilidades.models import Habilidad

db = SessionLocal()
cursos_data = [
    {"titulo": "SQL desde cero para análisis de datos", "tipo": "Curso", "horas": 20, "url": "https://www.coursera.org/search?query=sql%20an%C3%A1lisis%20de%20datos", "habilidades": [("SQL", 2)]},
    {"titulo": "Power BI aplicado a reportes de ventas", "tipo": "Curso", "horas": 12, "url": "https://www.coursera.org/search?query=power%20bi", "habilidades": [("Power BI", 2)]},
    {"titulo": "Excel avanzado: tablas dinámicas y funciones", "tipo": "Curso", "horas": 10, "url": "https://www.coursera.org/search?query=excel%20avanzado", "habilidades": [("Excel", 1)]},
    {"titulo": "Limpieza profesional y manejo de químicos", "tipo": "Curso", "horas": 8, "url": "https://www.sena.edu.co/es-co/formacion/Paginas/cursosCortos.aspx", "habilidades": [("Limpieza y aseo", 2), ("Manejo de productos químicos", 2)]}
]

for c in cursos_data:
    if db.query(Curso).filter(Curso.titulo == c["titulo"]).first(): continue
    curso = Curso(titulo=c["titulo"], tipo=c["tipo"], horas=c["horas"], url=c["url"])
    db.add(curso)
    db.commit()
    db.refresh(curso)
    for hab_nombre, boost in c["habilidades"]:
        hab = db.query(Habilidad).filter(Habilidad.nombre == hab_nombre).first()
        if hab:
            db.add(CursoHabilidad(curso_id=curso.id, habilidad_id=hab.id, boost=boost))
    db.commit()
    print(f"Creado: {c['titulo']}")

db.close()
print("¡Listo! Cursos creados.")