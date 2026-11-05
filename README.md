# 🧠 SkillMatch --- Inteligencia de Talento con IA

> **Conectando talento con oportunidades.**\
> Plataforma web que conecta aspirantes con vacantes laborales mediante
> inteligencia artificial, análisis de habilidades y similitud
> semántica.

------------------------------------------------------------------------

## 📌 Tabla de contenido

-   [Descripción del proyecto](#-descripción-del-proyecto)
-   [Tecnologías utilizadas](#️-tecnologías-utilizadas)
-   [Requisitos previos](#-requisitos-previos)
-   [Instalación y ejecución](#-instalación-y-ejecución)
-   [Cuentas de prueba](#-cuentas-de-prueba)
-   [Funcionalidades principales](#-funcionalidades-principales)
-   [Motor de
    compatibilidad](#-cómo-funciona-el-motor-de-compatibilidad)
-   [Licencia y consideraciones](#-licencia-y-consideraciones)

------------------------------------------------------------------------

## 📖 Descripción del proyecto

**SkillMatch** es una plataforma web que conecta aspirantes con vacantes
laborales mediante un motor de compatibilidad basado en habilidades y
similitud semántica.

A diferencia de los portales tradicionales de empleo, SkillMatch no se
limita a evaluar los años de experiencia laboral: busca identificar el
**potencial de las personas**, considerando sus conocimientos,
habilidades y posibilidades de adaptación a diferentes oportunidades
laborales.

La plataforma cuenta con dos entornos principales:

  -----------------------------------------------------------------------
  Entorno                             Descripción
  ----------------------------------- -----------------------------------
  👤 **Panel de Aspirantes**          Permite buscar empleos, gestionar
                                      el perfil profesional, consultar
                                      cursos y utilizar Career GPS para
                                      avanzar hacia objetivos laborales.

  🏢 **Panel de Reclutadores**        Permite publicar vacantes mediante
                                      análisis de texto con IA, gestionar
                                      candidatos y establecer
                                      comunicación directa con los
                                      aspirantes.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🛠️ Tecnologías utilizadas

### Backend

  Tecnología                 Función
  -------------------------- ---------------------------------------
  Python 3                   Lenguaje principal
  FastAPI                    Desarrollo de API REST
  PostgreSQL                 Gestión de base de datos
  SQLAlchemy                 ORM y conexión con la base de datos
  Sentence Transformers      Cálculo de similitud semántica
  Ollama + Qwen 2.5 (1.5b)   Extracción de habilidades mediante IA
  Passlib + Bcrypt           Protección de contraseñas

### Frontend

  Tecnología             Función
  ---------------------- ------------------------------------------
  HTML5                  Estructura de la aplicación
  CSS3                   Diseño y estilos visuales
  JavaScript Vanilla     Lógica e interactividad
  Responsive Design      Adaptación a diferentes dispositivos
  Arquitectura modular   Organización de vistas y funcionalidades

------------------------------------------------------------------------

## 💻 Requisitos previos

Antes de instalar el proyecto, asegúrate de contar con:

-   **Python 3.10** o superior.
-   **PostgreSQL**.
-   **pgAdmin**.
-   **Ollama**.

------------------------------------------------------------------------

## 🚀 Instalación y ejecución

Sigue estos pasos para ejecutar SkillMatch en un entorno local.

### 1. Configuración del backend

**Paso 1. Ubicar la carpeta del proyecto**

``` powershell
cd Skillmatch-main
```

**Paso 2. Crear y activar el entorno virtual**

``` powershell
python -m venv venv
.\venv\Scripts\activate
```

**Paso 3. Instalar las dependencias**

``` powershell
python -m pip install -r requirements.txt
```

**Paso 4. Configurar la conexión a PostgreSQL**

Dentro de la carpeta `Skillmatch-main`, localiza o crea el archivo
`.env` y agrega:

``` env
DATABASE_URL=postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/skillmatch_db
```

Reemplaza `TU_CONTRASEÑA` por la contraseña de tu usuario de PostgreSQL.

**Paso 5. Crear la base de datos**

Desde **pgAdmin**:

1.  Conéctate a tu servidor PostgreSQL.
2.  Haz clic derecho sobre **Databases**.
3.  Selecciona **Create → Database**.
4.  Asigna el nombre `skillmatch_db`.

**Paso 6. Ejecutar los scripts de inicialización**

Desde la carpeta principal del backend, ejecuta los comandos en este
orden:

``` powershell
python seed.py
python seed_vacantes.py
python seed_cursos.py
python seed_catalogos.py
```

Estos scripts cargan los datos iniciales del sistema.

**Paso 7. Iniciar el servidor backend**

``` powershell
python -m uvicorn app.main:app --reload
```

El backend estará disponible en:

  -----------------------------------------------------------------------
  Recurso                             Dirección
  ----------------------------------- -----------------------------------
  API                                 <http://127.0.0.1:8000>

  Documentación interactiva           <http://127.0.0.1:8000/docs>
  -----------------------------------------------------------------------

### 2. Configuración de la inteligencia artificial (Ollama)

SkillMatch utiliza **Ollama** junto con **Qwen 2.5 (1.5b)** para
analizar descripciones de vacantes y extraer habilidades.

**Paso 1. Instalar Ollama**

Descarga e instala Ollama desde su página oficial:
<https://ollama.com/>.

**Paso 2. Descargar y ejecutar el modelo**

Abre una nueva terminal y ejecuta:

``` powershell
ollama run qwen2.5:1.5b
```

**Paso 3. Esperar la descarga**

Espera a que el modelo termine de descargarse y quede disponible. Mantén
Ollama ejecutándose mientras utilizas las funcionalidades de análisis de
texto de SkillMatch.

### 3. Ejecución del frontend

**Paso 1. Abrir una nueva terminal**

``` powershell
cd Frontend-Skillmatch
```

**Paso 2. Iniciar el servidor local**

``` powershell
python -m http.server 5500
```

**Paso 3. Abrir la aplicación**

Accede desde tu navegador a:

<http://127.0.0.1:5500/index.html>

¡Listo! SkillMatch estará disponible en tu entorno local.

------------------------------------------------------------------------

## 🔑 Cuentas de prueba

El proyecto incluye dos cuentas predeterminadas para probar ambos
perfiles:

  Tipo de cuenta   Correo                        Contraseña
  ---------------- ----------------------------- ------------
  👤 Aspirante     `maria@skillmatch.com`        `123456`
  🏢 Reclutador    `reclutador@skillmatch.com`   `123456`

También es posible registrar nuevas cuentas desde el botón **Crear
cuenta**, disponible en la página de inicio.

> **Nota:** Las credenciales anteriores corresponden a cuentas de prueba
> incluidas en el proyecto.

------------------------------------------------------------------------

## ✨ Funcionalidades principales

### 👤 Panel de Aspirantes

  -----------------------------------------------------------------------
  Funcionalidad                       Descripción
  ----------------------------------- -----------------------------------
  **Mi perfil**                       Permite administrar la información
                                      personal, las habilidades
                                      profesionales y sus respectivos
                                      niveles de dominio.

  **Buscar empleos**                  Permite visualizar vacantes con
                                      porcentajes de compatibilidad,
                                      gestionar postulaciones y guardar
                                      ofertas.

  **Career GPS**                      Permite seleccionar una meta
                                      profesional y consultar el progreso
                                      necesario para alcanzarla.

  **Recomendaciones**                 Sugiere cursos y proyectos que
                                      ayudan a cerrar las brechas de
                                      habilidades identificadas.

  **Notificaciones**                  Permite recibir mensajes de
                                      reclutadores y enviar respuestas
                                      directamente desde la plataforma.
  -----------------------------------------------------------------------

### 🏢 Panel de Reclutadores

  -----------------------------------------------------------------------
  Funcionalidad                       Descripción
  ----------------------------------- -----------------------------------
  **Mis vacantes**                    Permite visualizar y administrar
                                      las ofertas laborales publicadas,
                                      incluido el contador de
                                      postulantes.

  **Publicar vacante con IA**         Permite redactar una descripción
                                      laboral en texto libre. Qwen 2.5
                                      extrae las habilidades y Sentence
                                      Transformers calcula el alcance
                                      estimado de la vacante.

  **Gestión de candidatos**           Permite consultar perfiles y
                                      porcentajes de compatibilidad,
                                      preseleccionar candidatos,
                                      contactarlos mediante mensajes o
                                      descartarlos.

  **Notificaciones**                  Permite recibir alertas cuando un
                                      aspirante responde a un mensaje.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🧠 ¿Cómo funciona el motor de compatibilidad?

El motor de compatibilidad de SkillMatch identifica coincidencias entre
las habilidades de los aspirantes y los requisitos de las vacantes. El
proceso se desarrolla en cuatro etapas:

### 1. Extracción de habilidades mediante IA

Cuando un reclutador publica una vacante, su descripción se envía al
backend. Allí, **Qwen 2.5** analiza el texto libre e identifica las
habilidades requeridas.

### 2. Normalización semántica

El sistema utiliza un mecanismo de equivalencias para transformar
términos coloquiales en nombres oficiales del catálogo.

**Ejemplo:**

  Término original   Término normalizado
  ------------------ ---------------------
  Hojas de cálculo   Excel

Esto permite reconocer habilidades equivalentes aunque se expresen con
palabras diferentes.

### 3. Cálculo del alcance estimado

**Sentence Transformers** compara semánticamente las habilidades de la
vacante con las de los aspirantes registrados en la base de datos.

Los resultados se clasifican en tres niveles:

-   🟢 **Alta compatibilidad**
-   🟡 **Media compatibilidad**
-   🔴 **Baja compatibilidad**

Así, el reclutador obtiene una referencia del número de aspirantes que
podrían ajustarse al perfil solicitado.

### 4. Cálculo del Match en el frontend

Cuando un aspirante consulta las ofertas laborales, puede visualizar su
porcentaje de compatibilidad. Este se calcula mediante el diccionario de
sinónimos y los mecanismos de transferencia de habilidades del sistema.

### 🔄 Flujo general del motor de compatibilidad

``` text
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
```

------------------------------------------------------------------------

## 📄 Licencia y consideraciones

Este proyecto ha sido desarrollado con fines académicos y educativos.

-   Los datos incluidos en el sistema son datos de prueba.
-   Las cuentas predeterminadas están destinadas a facilitar la
    evaluación de las funcionalidades.
-   El proyecto demuestra la aplicación de inteligencia artificial,
    procesamiento semántico y desarrollo web en procesos de selección de
    talento.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
`<strong>`{=html}SkillMatch --- Conectando talento con
oportunidades.`</strong>`{=html}
```{=html}
</p>
```
