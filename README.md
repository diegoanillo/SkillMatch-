# SkillMatch — Inteligencia de Talento con IA

SkillMatch es una plataforma web que conecta aspirantes con vacantes laborales mediante un motor de compatibilidad basado en habilidades y similitud semántica. A diferencia de los portales tradicionales, no solo mide años de experiencia, sino el **potencial real** de las personas.

El sistema incluye un panel completo para **Aspirantes** (búsqueda de empleo, perfil, cursos, Career GPS) y un panel para **Reclutadores** (publicación de vacantes con análisis de texto por IA, gestión de candidatos y comunicación directa).

---

## 🛠️ Tecnologías Utilizadas

**Backend:**
- Python 3 + FastAPI
- PostgreSQL + SQLAlchemy (ORM)
- **Sentence Transformers** (Similitud semántica para el cálculo de alcance)
- **Ollama + Qwen 2.5 (1.5b)** (Análisis de texto libre para extraer habilidades)
- Passlib + Bcrypt (Encriptación de contraseñas)

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Diseño responsivo (Mobile First)
- Arquitectura de vistas modulares y motor de compatibilidad local.

---

## 🚀 Instalación y Ejecución

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### Requisitos Previos
1. **Python** (versión 3.10 o superior).
2. **PostgreSQL** instalado y corriendo.
3. **Ollama** instalado (necesario para la IA de análisis de texto).

### 1. Configurar el Backend

1. Abre una terminal y navega a la carpeta del backend:
   ```
   cd Skillmatch-main
   ```
Crea y activa un entorno virtual:
```
python -m venv venv


.\venv\Scripts\activate
```
Instala las dependencias:
```
python -m pip install -r requirements.txt
```

En tu archivo .env, de la carpeta Skillmatch-main configura tu URL de PostgreSQL:

```
DATABASE_URL=postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/skillmatch_db
```
Cambia TU_CONTRASEÑA, por la correspondiente.

Crea la base de datos en pgAdmin (llámala skillmatch_db).

Ejecuta los scripts de inicialización en orden:

powershell
python seed.py
python seed_vacantes.py
python seed_cursos.py
python seed_catalogos.py
Enciende el servidor de desarrollo:

powershell
python -m uvicorn app.main:app --reload
(El backend estará disponible en http://127.0.0.1:8000 y su documentación en /docs).

2. Configurar la IA (Ollama)
Descarga e instala Ollama.

Abre una terminal (nueva) y descarga el modelo:

powershell
ollama run qwen2.5:1.5b
(Deja Ollama corriendo en segundo plano mientras usas la plataforma).

3. Ejecutar el Frontend
Abre una nueva terminal y navega a la carpeta del frontend:

powershell
cd Frontend-Skillmatch
Enciende un servidor local:

powershell
python -m http.server 5500
Abre tu navegador en: http://127.0.0.1:5500/index.html

🔑 Cuentas de Prueba
El sistema incluye dos cuentas por defecto para probar todas las funcionalidades:

Aspirante: maria@skillmatch.com / 123456

Reclutador: reclutador@skillmatch.com / 123456

(También puedes crear tus propias cuentas desde el botón "Crear cuenta" en la página de inicio).

📌 Funcionalidades Principales
Para el Aspirante
Mi Perfil: Gestión de habilidades, niveles y datos personales.

Buscar Empleos: Listado de ofertas con cálculo de compatibilidad real, postulaciones y ofertas guardadas.

Career GPS: Elección de una meta profesional con cálculo de progreso.

Recomendaciones: Cursos y proyectos sugeridos para cerrar brechas de habilidades.

Notificaciones: Recepción de mensajes de reclutadores y respuestas directas.

Para el Reclutador
Mis Vacantes: Visualización de ofertas publicadas con contador de postulantes.

Publicar Vacante (IA): Escribe la descripción en texto libre. El backend usa Qwen 2.5 para extraer las habilidades y Sentence Transformers para calcular el "Alcance estimado" (cuántos aspirantes encajan).

Candidatos: Ver perfiles con porcentaje de compatibilidad, preseleccionar, contactar (enviar mensajes) o descartar.

Notificaciones: Alertas cuando un aspirante responde a un mensaje.

🧠 ¿Cómo funciona el motor de compatibilidad?
Extracción con IA: Cuando un reclutador publica una vacante, el texto viaja al backend donde Qwen analiza las habilidades requeridas.

Limpieza semántica: El frontend traduce términos coloquiales (ej: "hojas de cálculo") a los nombres oficiales del catálogo ("Excel").

Cálculo del Alcance: El backend usa Sentence Transformers para comparar semánticamente las habilidades de la vacante con las de todos los aspirantes en la base de datos, determinando cuántos tienen compatibilidad "alta", "media" o "baja".

Match en el Frontend: Al buscar empleos, el aspirante ve un porcentaje de compatibilidad calculado con el mismo diccionario de sinónimos y transferencia de habilidades.

📄 Licencia
Este proyecto es de uso académico y educativo. Todos los datos generados son de prueba.
