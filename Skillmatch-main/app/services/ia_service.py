import json
import requests


OLLAMA_URL = "http://localhost:11434/api/generate"
MODELO_IA = "qwen2.5:1.5b"


def analizar_compatibilidad(habilidades_candidato, habilidades_vacante):
    prompt =  f"""
Eres el asistente de inteligencia artificial de SkillMatch,
una plataforma que ayuda a conectar candidatos con vacantes laborales
según sus habilidades y conocimientos.

Tu tarea es analizar la compatibilidad entre un candidato y una vacante.

Habilidades que posee el candidato:
{json.dumps(habilidades_candidato, ensure_ascii=False)}

Habilidades requeridadas por la vacante:
{json.dumps(habilidades_vacante, ensure_ascii=False)}

Instrucciones:
1. Compara las habilidades del candidato con las requeridas por la vacante.
2. Identifica las habilidades que coinciden, teniendo en cuenta su significado.
3. Identifica las habilidades requeridas que le faltan al candidato.
4. No inventes habilidades, experiencia ni conocimientos.
5. Calcula un porcentaje de compatibilidad entre 0 y 100, considerando
   cuántos requisitos cumple el candidato.
6. Explica brevemente el resultado en español.
7. Devuelve únicamente un objeto JSON válido, sin texto adicional.

Utiliza exactamente esta estructura:
{{
    "porcentaje_compatibilidad": 0,
    "habilidades_coincidentes": [],
    "habilidades_faltantes": [],
    "explicacion": ""
}}
"""

    respuesta = requests.post(
        OLLAMA_URL,
        json={
            "model": MODELO_IA,
            "prompt": prompt,
            "format": "json",
            "stream": False
        },
        timeout=120
    )

    respuesta.raise_for_status()


    contenido = respuesta.json()["response"]
    resultado = json.loads(contenido)

    porcentaje = resultado.get("porcentaje_compatibilidad")

    if (
        not isinstance(porcentaje, (int, float))
        or isinstance(porcentaje, bool)
        or not 0 <= porcentaje <= 100
    ):
        raise ValueError("La IA devolcio un porcentaje invalido.")

    for campo in (
        "habilidades_coincidentes",
        "habilidades_faltantes"
    ):

        if not isinstance(resultado.get(campo), list):
            raise ValueError(
                f"La IA devolvió un formato inválido en el campo: {campo}."
            )

    if not isinstance(resultado.get("explicacion"), str):
        raise ValueError("La IA devolvió una explicación inválida.")

    return resultado
