
from sentence_transformers import util
from app.modules.matching.ia_service import obtener_modelo

modelo = obtener_modelo()

pares = [
    ("testing", "pruebas de software"),
    ("QA", "aseguramiento de la calidad del software"),
    ("automatización de pruebas", "pruebas automatizadas"),
    ("Python", "Python"),
]

for texto1, texto2 in pares:
    embeddings = modelo.encode(
        [texto1, texto2],
        convert_to_tensor=True,
        normalize_embeddings=True,
    )

    similitud = util.cos_sim(
        embeddings[0],
        embeddings[1],
    ).item()

    print(
        f"{texto1} <-> {texto2}: "
        f"{similitud:.3f}"
    )
