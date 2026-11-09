from app.database.connection import SessionLocal
from app.modules.usuarios.catalogos import Catalogo

db = SessionLocal()
nuevos_datos = {
    "sectores": [
        "Finanzas", "Comercio", "Tecnología", "Logística", "Servicios", "Salud", "Educación",
        "Manufactura", "Construcción", "Alimentos y restaurantes", "Turismo", "Transporte",
        "Agricultura", "Minería", "Energía", "Telecomunicaciones", "Marketing", "Seguros",
        "Inmobiliario", "Legal", "Consultoría", "Otro"
    ],
    "tamanosEmpresa": [
        "1-10 personas", "11-50 personas", "51-200 personas", "201-1000 personas", 
        "1001-5000 personas", "Más de 5000 personas"
    ]
}
print("Actualizando catálogos...")
for tipo, valores in nuevos_datos.items():
    for valor in valores:
        existe = db.query(Catalogo).filter(Catalogo.tipo == tipo, Catalogo.valor == valor).first()
        if not existe:
            db.add(Catalogo(tipo=tipo, valor=valor))
db.commit()
db.close()
print("¡Catálogos actualizados!")