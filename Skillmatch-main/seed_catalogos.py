from app.database.connection import SessionLocal, Base, engine
from app.modules.usuarios.catalogos import Catalogo

Base.metadata.create_all(bind=engine)
db = SessionLocal()

datos = {
    "educacion": ["Bachiller", "Técnico", "Tecnólogo", "Profesional universitario", "Posgrado"],
    "sectores": ["Finanzas", "Comercio", "Tecnología", "Logística", "Servicios", "Salud", "Educación"],
    "tamanosEmpresa": ["1-10 personas", "11-50 personas", "51-200 personas", "201-1000 personas"],
    "modalidades": ["Presencial", "Híbrido", "Remoto"],
    "niveles": ["Practicante", "Junior", "Semi-senior", "Senior"],
    "ciudades": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Remoto"]
}

print("Cargando catálogos...")
for tipo, valores in datos.items():
    for valor in valores:
        existe = db.query(Catalogo).filter(Catalogo.tipo == tipo, Catalogo.valor == valor).first()
        if not existe:
            db.add(Catalogo(tipo=tipo, valor=valor))

db.commit()
db.close()
print("¡Catálogos guardados en la base de datos!")