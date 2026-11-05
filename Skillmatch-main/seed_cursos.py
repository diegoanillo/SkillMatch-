from app.database.connection import SessionLocal
from app.modules.cursos.models import Curso, CursoHabilidad
from app.modules.habilidades.models import Habilidad

db = SessionLocal()

cursos_data = [
    {"titulo": "SQL desde cero para análisis de datos", "tipo": "Curso", "horas": 20, "url": "https://coursera.org", "habilidades": [("SQL", 2)]},
    {"titulo": "Power BI aplicado a reportes de ventas", "tipo": "Curso", "horas": 12, "url": "https://coursera.org", "habilidades": [("Power BI", 2)]},
    {"titulo": "Excel avanzado: tablas dinámicas y funciones", "tipo": "Curso", "horas": 10, "url": "https://coursera.org", "habilidades": [("Excel", 1)]},
    {"titulo": "Limpieza profesional y manejo de químicos", "tipo": "Curso", "horas": 8, "url": "https://sena.edu.co", "habilidades": [("Limpieza y aseo", 2), ("Manejo de productos químicos", 2)]},
]

for c in cursos_data:
    curso_existe = db.query(Curso).filter(Curso.titulo == c["titulo"]).first()
    if not curso_existe:
        nuevo_curso = Curso(titulo=c["titulo"], tipo=c["tipo"], horas=c["horas"], url=c["url"])
        db.add(nuevo_curso)
        db.commit()
        db.refresh(nuevo_curso)
        curso_existe = nuevo_curso

    for hab_nombre, boost in c["habilidades"]:
        hab = db.query(Habilidad).filter(Habilidad.nombre == hab_nombre).first()
        if hab:
            asoc_existe = db.query(CursoHabilidad).filter(
                CursoHabilidad.curso_id == curso_existe.id,
                CursoHabilidad.habilidad_id == hab.id
            ).first()
            if not asoc_existe:
                db.add(CursoHabilidad(curso_id=curso_existe.id, habilidad_id=hab.id, boost=boost))
        db.commit()

print("¡Cursos creados!")
db.close()