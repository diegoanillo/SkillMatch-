
from app.services.ia_service import analizar_compatibilidad

resultado = analizar_compatibilidad(
    habilidades_candidato=["Python", "SQL"],
    habilidades_vacante=["Python", "SQL", "Docker"]
)

print(resultado)
