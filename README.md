# SkillMatch - Inteligencia de Talento

SkillMatch es una plataforma que conecta aspirantes con vacantes laborales mediante habilidades y similitud semántica. Permite a los reclutadores publicar ofertas con análisis de texto por IA y a los aspirantes encontrar empleos según su potencial real.

## 🛠️ Tecnologías Utilizadas

**Backend:**
- Python + FastAPI
- SQLAlchemy + PostgreSQL
- Sentence Transformers (IA para similitud semántica)
- Ollama + Qwen 2.5 (IA para análisis de texto)
- Passlib + Bcrypt (Encriptación de contraseñas)

**Frontend:**
- HTML5, CSS3, JavaScript puro (Vanilla JS)
- Diseño responsivo y accesible

## 🚀 Instalación y Ejecución

Sigue estos pasos para ejecutar el proyecto en tu máquina local:

### 1. Requisitos previos
- Python instalado (versión 3.10 o superior)
- PostgreSQL instalado y corriendo
- Ollama instalado (para el análisis de texto con IA)

### 2. Configurar el Backend
1. Abre una terminal en la carpeta del backend.
2. Crea y activa un entorno virtual:
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Mac/Linux:
   source venv/bin/activate
Instala las dependencias:

bash
python -m pip install -r requirements.txt
Crea un archivo .env basado en .env.example y configura tu base de datos PostgreSQL:

env
DATABASE_URL=postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/skillmatch_db
Crea la base de datos en PostgreSQL (si no existe) y ejecuta los scripts de inicialización en orden:

bash
python seed.py
python seed_vacantes.py
python seed_cursos.py
python seed_catalogos.py
Enciende el servidor:

bash
python -m uvicorn app.main:app --reload
3. Configurar la IA (Ollama)
Descarga e instala Ollama desde ollama.com.

En una terminal aparte, descarga el modelo Qwen 2.5:

bash
ollama run qwen2.5:1.5b
(Deja Ollama corriendo en segundo plano).

4. Ejecutar el Frontend
Abre una terminal en la carpeta del frontend.

Enciende un servidor local:

bash
python -m http.server 5500
Abre tu navegador en: http://127.0.0.1:5500/index.html

🔑 Cuentas de Prueba
Aspirante: maria@skillmatch.com / 123456

Reclutador: reclutador@skillmatch.com / 123456

📌 Funcionalidades Principales
Para Aspirantes: Registro, gestión de perfil y habilidades, búsqueda de empleos con cálculo de compatibilidad, postulaciones, recomendaciones de cursos, Career GPS y notificaciones.

Para Reclutadores: Registro de empresa, publicación de vacantes con análisis de texto por IA, visualización de candidatos con su porcentaje de compatibilidad, gestión de postulaciones (preseleccionar, contactar, descartar).

📄 Licencia
Este proyecto es de uso académico y educativo.

text

---

### 2. Guion para la Presentación / Demo

Aquí tienes un guion de lo que puedes decir y hacer en vivo cuando presentes el proyecto (te servirá para sentirte seguro):

**1. Introducción (30 seg):**
> *"SkillMatch es una plataforma que va más allá del currículum tradicional. No solo mide años de experiencia, sino que conecta a las personas con las vacantes usando Inteligencia Artificial para entender sus habilidades y su potencial de aprendizaje."*

**2. Demo como Aspirante (María):**
- Inicia sesión como María.
- Muestra el **Panel**: *"Aquí María ve su compatibilidad con ofertas reales. El sistema le sugiere su siguiente mejor paso."*
- Ve a **Mi perfil**: *"María puede agregar habilidades. Al hacerlo, la compatibilidad sube automáticamente."*
- Ve a **Buscar empleos**: *"Aquí están las 10 ofertas, ordenadas por compatibilidad, no por fecha. El radar muestra qué habilidades le faltan."*
- Postúlate a una oferta.

**3. Demo como Reclutador (Carlos):**
- Cierra sesión y entra como Carlos.
- Ve a **Mis vacantes**: *"Carlos ve cuántas personas se postularon. El sistema le avisa si hay postulantes nuevos."*
- Ve a **Publicar vacante**: *"Aquí es donde la IA brilla. Carlos escribe con sus propias palabras lo que necesita (ej: 'Buscamos un analista de datos con Excel y SQL'). Qwen procesa el texto, extrae las habilidades y le muestra el alcance estimado: cuántos aspirantes encajan."*
- Haz una publicación rápida.

**4. El ciclo de comunicación:**
- En "Mis vacantes", ve a los candidatos de una oferta y contáctala.
- Cierra sesión y vuelve a entrar como María. Muestra la **campanita** de notificaciones, el mensaje del reclutador y responde.

**5. Cierre (30 seg):**
> *"El proyecto está construido con un backend en FastAPI y PostgreSQL, usando modelos de lenguaje (Qwen) para el análisis de texto y embeddings (Sentence Transformers) para la similitud semántica. Todo el sistema está validado y los datos son reales. Cualquier persona puede clonar el repositorio y ejecutarlo siguiendo el README."*

---

### 3. Limpieza Opcional

Ahora que todo funciona, podemos quitar rastros de "modo desarrollo" del frontend:

1. **Quitar el botón "Restablecer datos"**: Si no lo usas, puedes borrarlo del menú o simplemente dejarlo (no afecta).
2. **Quitar el texto "Versión de práctica"**: En el HTML (`dashboard-aspirante.html` y `dashboard-reclutador.html`) hay un texto al pie de la barra lateral que dice *"Versión de práctica. Los datos se guardan solo en este navegador."* Como ahora todo se guarda en PostgreSQL, puedes cambiar ese texto por algo como: *"SkillMatch © 2026. Todos los derechos reservados."* o simplemente borrarlo.
3. **Cambiar el título de la pestaña**: Asegúrate de que las pestañas digan "SkillMatch" en todas las páginas.

---

### 4. Descansar

Ya hiciste un trabajo monumental. Tómate un descanso, celebra y prepárate para la presentación.

¿Quieres que te ayude a hacer alguno de estos 4 pasos en concreto, o prefieres que te dé el visto bueno para terminar aquí? ¡Felicidades por el proyecto!
Quiero que todo esto quede en formato MARKDOWN. Para colocarlo en el readme. Y, que todo sea de acuerdo a lo que yo tengo. Voy a subir este proyecto a GITHUB y que, la persona lo descargue y lo pruebe. Ya pedí permiso
¡Perfecto! Aquí tienes el archivo README.md completo, adaptado exactamente a la estructura de tu proyecto (con el backend en Skillmatch-main y el frontend separado), y en formato Markdown listo para pegar en GitHub.

Solo tienes que crear un archivo llamado README.md en la raíz de tu repositorio y pegar todo esto:

markdown
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

Sigue estos pasos para probar el proyecto en tu máquina local.

### Requisitos Previos
1. **Python** (versión 3.10 o superior).
2. **PostgreSQL** instalado y corriendo.
3. **Ollama** instalado (necesario para la IA de análisis de texto).

### 1. Configurar el Backend (Carpeta `Skillmatch-main`)

1. Abre una terminal y navega a la carpeta del backend.
2. Crea y activa un entorno virtual:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
Instala las dependencias:

powershell
python -m pip install -r requirements.txt
Crea un archivo .env basado en .env.example y configura tu URL de PostgreSQL:

env
DATABASE_URL=postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/skillmatch_db
Crea la base de datos en pgAdmin (llámala skillmatch_db).

Ejecuta los scripts de inicialización en orden (estos crean las tablas y los datos de prueba):

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
La funcionalidad de "Analizar vacante con IA" utiliza el modelo Qwen.

Descarga e instala Ollama.

Abre una terminal y descarga el modelo:

powershell
ollama run qwen2.5:1.5b
(Deja Ollama corriendo en segundo plano mientras usas la plataforma).

3. Ejecutar el Frontend
Abre una nueva terminal en la carpeta del frontend.

Enciende un servidor local:

powershell
python -m http.server 5500
Abre tu navegador en: http://127.0.0.1:5500/index.html

🔑 Cuentas de Prueba
El script seed.py crea dos usuarios por defecto para probar el sistema:

Aspirante: maria@skillmatch.com / 123456

Reclutador: reclutador@skillmatch.com / 123456

(También puedes crear tus propias cuentas desde el botón "Crear cuenta").

📌 Funcionalidades Principales
Para el Aspirante
Mi Perfil: Gestión de habilidades, niveles y datos personales.

Buscar Empleos: Listado de ofertas con cálculo de compatibilidad real (motor híbrido), postulaciones y ofertas guardadas.

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

text

### ¿Qué debes hacer ahora?
1. Crea un archivo llamado `README.md` en la raíz de tu repositorio de GitHub.
2. Pega el contenido de arriba.
3. Haz `git add .`, `git commit -m "docs: README final"` y `git push`.
4. Cuando alguien entre a tu repositorio, verá una página de presentación profesional con todos los pasos para probar tu proyecto.

¡Con esto tu proyecto queda listo para ser evaluado! 🚀