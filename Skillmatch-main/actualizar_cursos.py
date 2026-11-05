from app.database.connection import SessionLocal
from app.modules.cursos.models import Curso

db = SessionLocal()

# Buscamos los cursos y les asignamos URLs reales de búsqueda en Coursera
actualizaciones = {
    "SQL desde cero para análisis de datos": "https://www.coursera.org/search?query=sql%20an%C3%A1lisis%20de%20datos",
    "Power BI aplicado a reportes de ventas": "https://www.coursera.org/search?query=power%20bi",
    "Excel avanzado: tablas dinámicas y funciones": "https://www.coursera.org/search?query=excel%20avanzado",
    "Limpieza profesional y manejo de químicos": "https://www.sena.edu.co/es-co/formacion/Paginas/cursosCortos.aspx",
    "Python para análisis de datos": "https://www.coursera.org/search?query=python%20an%C3%A1lisis%20de%20datos",
    "Fundamentos de modelado de datos": "https://www.coursera.org/search?query=modelado%20de%20datos"
}

for titulo, url in actualizaciones.items():
    curso = db.query(Curso).filter(Curso.titulo == titulo).first()
    if curso:
        curso.url = url
        print(f"Actualizado: {titulo}")

db.commit()
db.close()
print("¡URLs actualizadas con éxito!")