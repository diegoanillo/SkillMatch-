
from fastapi import FastAPI
from app.database.connection import Base, engine
from app.modules.chat import models as chat_models
from app.modules.chat.routes import router as chat_router
from app.modules.interacciones import models as interacciones_models
from app.modules.interacciones.routes import router as interacciones_router
from app.modules.cursos import models as cursos_models
from app.modules.cursos.routes import router as cursos_router

from app.modules.usuarios.catalogos_routes import router as catalogos_router

# Modelos
from app.modules.usuarios import models as usuarios_models
from app.modules.vacantes import models as vacantes_models
from app.modules.habilidades import models as habilidades_models
from app.modules.perfiles import models as perfiles_models
from app.modules.matching import models as matching_models
from app.modules.career_gps import models as career_gps_models
from app.modules.recomendaciones import models as recomendaciones_models
from app.modules.usuarios.catalogos import Catalogo

# Routers
from app.modules.usuarios.routes import router as usuarios_router
from app.modules.vacantes.routes import router as vacantes_router
from app.modules.habilidades.routes import router as habilidades_router
from app.modules.perfiles.routes import router as perfiles_router
from app.modules.matching.routes import router as matching_router
from app.modules.career_gps.routes import router as career_gps_router
from app.modules.recomendaciones.routes import router as recomendaciones_router
from app.modules.usuarios.empresa import Empresa
from fastapi.middleware.cors import CORSMiddleware
from app.modules.usuarios.auth_routes import router as auth_router

app = FastAPI(
    title="Skill Match API",
    description="API para la plataforma de inteligencia de talento Skill Match",
    version="1.0.0"
)

# Registrar los modelos y crear las tablas
Base.metadata.create_all(bind=engine)


# CORS: permite que el frontend (en otro puerto) hable con el backend.
# En producción, cambia allow_origins por el dominio real del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # dev: cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar los routers
app.include_router(usuarios_router)
app.include_router(vacantes_router)
app.include_router(habilidades_router)
app.include_router(perfiles_router)
app.include_router(matching_router)
app.include_router(career_gps_router)
app.include_router(recomendaciones_router)
app.include_router(auth_router)
app.include_router(interacciones_router)
app.include_router(cursos_router)
app.include_router(catalogos_router)
app.include_router(chat_router)

@app.get("/")
def inicio():
    return {
        "mensaje": "Skill Match funcionando"
    }
