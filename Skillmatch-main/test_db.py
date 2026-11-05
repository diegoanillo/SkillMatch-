
from app.database.connection import Base, engine
from app.modules.usuarios import models

try:
    Base.metadata.drop_all(bind=engine)
    print("Tablas eliminadas correctamente")

    Base.metadata.create_all(bind=engine)
    print("Tablas creadas correctamente")

except Exception as e:
    print("Error al crear las tablas")
    print(e)