# 🧠 SkillMatch — Inteligencia de Talento con IA

> **Conectando talento con oportunidades.**
>
> SkillMatch es una plataforma inteligente que conecta aspirantes con vacantes laborales mediante inteligencia artificial, análisis de habilidades y similitud semántica.

---

## 📖 1. Descripción del proyecto

**SkillMatch** es una plataforma web que conecta aspirantes con vacantes laborales mediante un motor de compatibilidad basado en habilidades y similitud semántica.

A diferencia de los portales tradicionales de empleo, SkillMatch no se limita a evaluar los años de experiencia laboral: busca identificar el **potencial real de las personas**, considerando sus conocimientos, habilidades y posibilidades de adaptación a diferentes oportunidades laborales.

La plataforma cuenta con dos entornos principales:

- 👤 **Panel de Aspirantes:** permite buscar empleos, gestionar el perfil profesional, consultar cursos y utilizar Career GPS para alcanzar objetivos laborales.
- 🏢 **Panel de Reclutadores:** permite publicar vacantes mediante análisis de texto con IA, gestionar candidatos y establecer comunicación directa con los aspirantes.

---

## 🛠️ 2. Tecnologías utilizadas

### Backend

| Tecnología | Función |
|---|---|
| Python 3 | Lenguaje principal |
| FastAPI | Desarrollo de API REST |
| PostgreSQL | Gestión de base de datos |
| SQLAlchemy | ORM y conexión con la base de datos |
| Sentence Transformers | Cálculo de similitud semántica |
| Ollama + Qwen 2.5 (1.5b) | Extracción de habilidades mediante IA |
| Passlib + Bcrypt | Protección de contraseñas |

### Frontend

| Tecnología | Función |
|---|---|
| HTML5 | Estructura de la aplicación |
| CSS3 | Diseño y estilos visuales |
| JavaScript Vanilla | Lógica e interactividad |
| Responsive Design | Adaptación a diferentes dispositivos |
| Arquitectura modular | Organización de vistas y funcionalidades |

---

## 🚀 3. Instalación y ejecución

A continuación, se describen los pasos necesarios para instalar y ejecutar SkillMatch en un entorno local.

### 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas:

- Python 3.10 o superior.
- PostgreSQL.
- pgAdmin.
- Ollama.

### 3.1. Configuración del Backend

**Paso 1. Ubicar la carpeta del proyecto**

Abre una terminal y navega hasta la carpeta principal:

```powershell
cd Skillmatch-main
Paso 2. Crear el entorno virtual


powershell
python -m venv venv
Activa el entorno virtual:


powershell
.\venv\Scripts\activate
Paso 3. Instalar las dependencias


powershell
python -m pip install -r requirements.txt
Paso 4. Configurar la conexión a PostgreSQL

Dentro de la carpeta Skillmatch-main, localiza o crea el archivo .env y configura la siguiente variable:


env
DATABASE_URL=postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/skillmatch_db
Reemplaza TU_CONTRASEÑA por la contraseña correspondiente a tu usuario de PostgreSQL.

Paso 5. Crear la base de datos

Desde pgAdmin:

Conéctate a tu servidor PostgreSQL.

Haz clic derecho sobre Databases.

Selecciona Create → Database.

Asigna el nombre:


text
skillmatch_db
Paso 6. Ejecutar los scripts de inicialización

Ejecuta los siguientes comandos en el orden indicado:


powershell
python seed.py
python seed_vacantes.py
python seed_cursos.py
python seed_catalogos.py
Estos scripts permiten cargar los datos iniciales del sistema.

Paso 7. Iniciar el servidor Backend


powershell
python -m uvicorn app.main:app --reload
Una vez iniciado, el backend estará disponible en:

API: http://127.0.0.1:8000 

Documentación: http://127.0.0.1:8000/docs 

3.2. Configuración de la inteligencia artificial (Ollama)
SkillMatch utiliza Ollama junto con el modelo Qwen 2.5 (1.5b) para analizar descripciones de vacantes y extraer habilidades relevantes.

Paso 1. Descarga e instala Ollama desde su página oficial:

https://ollama.com/ 

Paso 2. Abre una nueva terminal y ejecuta:


powershell
ollama run qwen2.5:1.5b
Paso 3. Espera a que el modelo termine de descargarse y quede disponible.

Mantén Ollama ejecutándose mientras utilizas las funcionalidades de análisis de texto de SkillMatch.

3.3. Ejecución del Frontend
Paso 1. Abre una nueva terminal y navega hasta la carpeta del frontend:


powershell
cd Frontend-Skillmatch
Paso 2. Inicia el servidor local:


powershell
python -m http.server 5500
Paso 3. Abre tu navegador y accede a:

http://127.0.0.1:5500/index.html 

¡Listo! SkillMatch estará disponible para su utilización en tu entorno local.

🔑 4. Cuentas de prueba
El proyecto incluye dos cuentas predeterminadas para probar las funcionalidades de ambos perfiles.

👤 Cuenta de Aspirante
Correo: maria@skillmatch.com

Contraseña: 123456

🏢 Cuenta de Reclutador
Correo: reclutador@skillmatch.com

Contraseña: 123456

También es posible registrar nuevas cuentas desde el botón Crear cuenta, disponible en la página de inicio.

✨ 5. Funcionalidades principales
👤 Panel de Aspirantes
Funcionalidad

Descripción

Mi perfil

Permite administrar la información personal, las habilidades profesionales y sus respectivos niveles de dominio.

Buscar empleos

Visualización de vacantes con porcentajes de compatibilidad, postulaciones y ofertas guardadas.

Career GPS

Permite seleccionar una meta profesional y consultar el progreso necesario para alcanzarla.

Recomendaciones

Sugiere cursos y proyectos que ayudan a cerrar las brechas de habilidades identificadas.

Notificaciones

Permite recibir mensajes de reclutadores y enviar respuestas directamente desde la plataforma.

🏢 Panel de Reclutadores
Funcionalidad

Descripción

Mis vacantes

Visualización y administración de las ofertas laborales publicadas, incluyendo el contador de postulantes.

Publicar vacante con IA

Permite redactar una descripción laboral en texto libre. El sistema utiliza Qwen 2.5 para extraer habilidades y Sentence Transformers para calcular el alcance estimado de la vacante.

Gestión de candidatos

Permite consultar perfiles y porcentajes de compatibilidad, preseleccionar candidatos, contactarlos mediante mensajes o descartarlos.

Notificaciones

Recepción de alertas cuando un aspirante responde a un mensaje.

🧠 6. ¿Cómo funciona el motor de compatibilidad?
Uno de los componentes principales de SkillMatch es su motor inteligente de compatibilidad, diseñado para identificar coincidencias entre las habilidades de los aspirantes y los requisitos de las vacantes.

El proceso se desarrolla en cuatro etapas:

1. Extracción de habilidades mediante IA
Cuando un reclutador publica una vacante, su descripción se envía al backend. Allí, Qwen 2.5 analiza el texto libre e identifica las habilidades requeridas.

2. Normalización semántica
El frontend utiliza un mecanismo de equivalencias para transformar términos coloquiales en nombres oficiales del catálogo.

Ejemplo:

Término original: Hojas de cálculo.

Término normalizado: Excel.

Esto permite reconocer habilidades equivalentes aunque se expresen con palabras diferentes.

3. Cálculo del alcance estimado
Sentence Transformers compara semánticamente las habilidades de la vacante con las de los aspirantes registrados en la base de datos.

Los resultados se clasifican en tres niveles:

🟢 Alta compatibilidad.

🟡 Media compatibilidad.

🔴 Baja compatibilidad.

De esta manera, el reclutador puede conocer el alcance estimado de su vacante y tener una referencia de cuántos aspirantes podrían ajustarse al perfil solicitado.

4. Cálculo del Match en el Frontend
Cuando un aspirante consulta las ofertas laborales, puede visualizar su porcentaje de compatibilidad, calculado mediante el diccionario de sinónimos y los mecanismos de transferencia de habilidades del sistema.

🔄 Flujo general del motor de compatibilidad

text
       DESCRIPCIÓN DE LA VACANTE
                   |
                   v
          ANÁLISIS CON QWEN 2.5
                   |
                   v
        EXTRACCIÓN DE HABILIDADES
                   |
                   v
          NORMALIZACIÓN SEMÁNTICA
                   |
                   v
       COMPARACIÓN CON LOS PERFILES
                   |
                   v
        SENTENCE TRANSFORMERS
                   |
                   v
        RESULTADOS DE COMPATIBILIDAD
                   |
          +--------+--------+
          |        |        |
          v        v        v
         ALTA    MEDIA    BAJA
📄 7. Licencia y consideraciones
Este proyecto ha sido desarrollado con fines académicos y educativos.

Los datos incluidos en el sistema son datos de prueba.

Las cuentas predeterminadas están destinadas a facilitar la evaluación de las funcionalidades.

El proyecto está orientado a demostrar la aplicación de inteligencia artificial, procesamiento semántico y desarrollo web en procesos de selección de talento.
