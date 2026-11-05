/* ============================================================
   datos-demo.js  →  LA "BASE DE DATOS FALSA" PARA PRACTICAR
   ============================================================
   Mientras no exista el backend, necesitamos datos con los que
   trabajar: usuarios, empleos, cursos, etc. Este archivo los crea.

   Cada bloque corresponde a una tabla de tu diseño de base de datos:
     usuarios        → tabla  users
     habilidades     → tabla  skills
     transferencias  → relación TRANSFERS_TO del grafo Neo4j
     empleos         → tablas job_offers + job_skills
     cursos          → tabla  recommendations (catálogo de recursos)
     rutas           → catálogo para el generador Career GPS

   IMPORTANTE: el día que exista el backend, ESTE ARCHIVO SE ELIMINA.
   Los datos vendrán de PostgreSQL y Neo4j.

   Si cambias algo aquí, sube el número de DATOS_DEMO_VERSION: así
   el navegador descarta los datos viejos y carga los nuevos.
   ============================================================ */

window.DATOS_DEMO_VERSION = 4;

// Es una FUNCIÓN (y no un objeto fijo) para que cada vez que se llame
// devuelva datos "frescos". Así "Restablecer datos de prueba" funciona.
window.crearDatosDemo = function () {

  // Pequeñas ayudas para escribir fechas relativas ("hace 2 horas")
  const ahora = Date.now();
  const HORA = 3600 * 1000;
  const DIA = 24 * HORA;

  return {
    version: window.DATOS_DEMO_VERSION,

    // ----------------------------------------------------------
    // USUARIOS (tabla users)
    // En una app real la contraseña NUNCA se guarda así: se guarda
    // un "hash" (password_hash) y la comparación la hace el backend.
    // ----------------------------------------------------------
    usuarios: [
      { id: 'u1', email: 'maria@skillmatch.com',      password: '123456', rol: 'aspirante',  nombre: 'María Gómez' },
      { id: 'u2', email: 'reclutador@skillmatch.com', password: '123456', rol: 'reclutador', nombre: 'Carlos Ruiz' },

      // Aspirantes de ejemplo (todos con clave 123456). Tres se postularon a la oferta j1 de Carlos.
      { id: 'u3', email: 'laura@skillmatch.com',  password: '123456', rol: 'aspirante', nombre: 'Laura Pérez' },
      { id: 'u4', email: 'andres@skillmatch.com', password: '123456', rol: 'aspirante', nombre: 'Andrés Ríos' },
      { id: 'u5', email: 'camila@skillmatch.com', password: '123456', rol: 'aspirante', nombre: 'Camila Soto' },
      { id: 'u6', email: 'diego@skillmatch.com',  password: '123456', rol: 'aspirante', nombre: 'Diego Mora' }
    ],

    // ----------------------------------------------------------
    // PERFILES de aspirantes, indexados por el id del usuario.
    // Aquí vive TODO lo que cambia mientras la persona usa la app.
    // ----------------------------------------------------------
    perfiles: {
      u1: {
        cargoActual: 'Asistente administrativo',
        educacion: 'Tecnólogo en Gestión Administrativa',
        experienciaAnios: 1,
        ubicacion: 'Bogotá',

        // Habilidades con nivel de dominio de 1 a 10 (tabla user_skills)
        habilidades: [
          { nombre: 'Excel',                    categoria: 'technical', nivel: 8 },
          { nombre: 'SQL',                      categoria: 'technical', nivel: 3 },
          { nombre: 'Power BI',                 categoria: 'technical', nivel: 2 },
          { nombre: 'Análisis de datos',        categoria: 'technical', nivel: 4 },
          { nombre: 'Organización',             categoria: 'soft',      nivel: 7 },
          { nombre: 'Comunicación',             categoria: 'soft',      nivel: 7 },
          { nombre: 'Trabajo en equipo',        categoria: 'soft',      nivel: 6 },
          { nombre: 'Adaptabilidad',            categoria: 'soft',      nivel: 8 },
          { nombre: 'Ventas',                   categoria: 'domain',    nivel: 6 },
          { nombre: 'Atención al cliente',      categoria: 'domain',    nivel: 7 },
          { nombre: 'Procesos administrativos', categoria: 'domain',    nivel: 5 }
        ],

        rutaMetaId: 'analista-datos',   // la ruta Career GPS que eligió como meta
        ofertaObjetivoId: 'j1',         // la oferta con la que se compara en el Panel
        guardadas: ['j3'],              // ids de ofertas guardadas
        postulaciones: [],              // [{ empleoId, fecha, estado }]
        aprendizaje: {},                // { cursoId: 'en_curso' | 'completado' }

        notificaciones: [
          { id: 'n1', tipo: 'match', titulo: 'Nueva oferta compatible:',
            texto: 'Asistente de datos y reportes en Retail Andina',
            fecha: ahora - 2 * HORA, leida: false, destino: { vista: 'empleos', empleoId: 'j2' } },
          { id: 'n2', tipo: 'gps', titulo: 'Tu Career GPS se actualizó:',
            texto: 'agregamos un paso intermedio.',
            fecha: ahora - 1 * DIA, leida: false, destino: { vista: 'gps' } },
          { id: 'n3', tipo: 'reco', titulo: 'Te falta iniciar',
            texto: '"SQL desde cero para análisis de datos".',
            fecha: ahora - 3 * DIA, leida: false, destino: { vista: 'recomendaciones' } }
        ]
      },

      // ---------- Aspirantes de ejemplo ----------
      u3: {
        cargoActual: 'Auxiliar de aseo', educacion: 'Bachiller', experienciaAnios: 2, ubicacion: 'Bogotá',
        sobreMi: 'Dos años en limpieza de oficinas y edificios. Responsable y puntual.',
        habilidades: [
          { nombre: 'Limpieza y aseo',               categoria: 'domain', nivel: 6 },
          { nombre: 'Manejo de productos químicos',  categoria: 'domain', nivel: 4 },
          { nombre: 'Responsabilidad',               categoria: 'soft',   nivel: 7 },
          { nombre: 'Puntualidad',                   categoria: 'soft',   nivel: 7 },
          { nombre: 'Resistencia física',            categoria: 'soft',   nivel: 6 }
        ],
        rutaMetaId: null, ofertaObjetivoId: null, guardadas: [], postulaciones: [], aprendizaje: {}, notificaciones: []
      },
      u4: {
        cargoActual: 'Analista de reportes', educacion: 'Profesional universitario', experienciaAnios: 2, ubicacion: 'Bogotá',
        sobreMi: 'Ingeniero industrial que trabaja con reportes y consultas. Quiero crecer en análisis de datos.',
        habilidades: [
          { nombre: 'Excel',             categoria: 'technical', nivel: 7 },
          { nombre: 'SQL',               categoria: 'technical', nivel: 6 },
          { nombre: 'Análisis de datos', categoria: 'technical', nivel: 6 },
          { nombre: 'Power BI',          categoria: 'technical', nivel: 4 },
          { nombre: 'Comunicación',      categoria: 'soft',      nivel: 6 }
        ],
        rutaMetaId: null, ofertaObjetivoId: null, guardadas: [], aprendizaje: {}, notificaciones: [],
        postulaciones: [{ empleoId: 'j1', fecha: new Date(ahora - 2 * DIA).toISOString(), estado: 'Enviada' }]
      },
      u5: {
        cargoActual: 'Asesora comercial', educacion: 'Tecnólogo', experienciaAnios: 3, ubicacion: 'Medellín',
        sobreMi: 'Tres años en ventas y atención al cliente. Me gustaría moverme hacia el análisis comercial.',
        habilidades: [
          { nombre: 'Ventas',              categoria: 'domain',    nivel: 7 },
          { nombre: 'Atención al cliente', categoria: 'domain',    nivel: 7 },
          { nombre: 'Comunicación',        categoria: 'soft',      nivel: 7 },
          { nombre: 'Excel',               categoria: 'technical', nivel: 6 },
          { nombre: 'SQL',                 categoria: 'technical', nivel: 2 }
        ],
        rutaMetaId: null, ofertaObjetivoId: null, guardadas: [], aprendizaje: {}, notificaciones: [],
        postulaciones: [{ empleoId: 'j1', fecha: new Date(ahora - 1 * DIA).toISOString(), estado: 'Enviada' }]
      },
      u6: {
        cargoActual: 'Desarrollador junior', educacion: 'Profesional universitario', experienciaAnios: 3, ubicacion: 'Cali',
        sobreMi: 'Programo en Python y me gustan los datos. Busco un rol de análisis.',
        habilidades: [
          { nombre: 'Python',            categoria: 'technical', nivel: 7 },
          { nombre: 'SQL',               categoria: 'technical', nivel: 7 },
          { nombre: 'Análisis de datos', categoria: 'technical', nivel: 7 },
          { nombre: 'Excel',             categoria: 'technical', nivel: 5 },
          { nombre: 'Resolución de problemas', categoria: 'soft', nivel: 7 }
        ],
        rutaMetaId: null, ofertaObjetivoId: null, guardadas: [], aprendizaje: {}, notificaciones: [],
        postulaciones: [{ empleoId: 'j1', fecha: new Date(ahora - 5 * HORA).toISOString(), estado: 'Enviada' }]
      }
    },

    // ----------------------------------------------------------
    // CATÁLOGO DE HABILIDADES (tabla skills)
    // ----------------------------------------------------------
    // El catálogo vive en diccionario.js (una sola fuente de verdad).
    // Crece solo: cuando una persona o un reclutador agrega una habilidad
    // nueva, Api la suma aquí con { personalizada: true }.
    habilidades: window.Diccionario.catalogoSimple(),

    // ----------------------------------------------------------
    // TRANSFERIBILIDAD ENTRE HABILIDADES (el grafo de Neo4j)
    // "de → a": tener la habilidad "de" ayuda a aprender la "a".
    //   fuerza  = qué tanto se transfiere (0 a 1)
    //   semanas = tiempo típico de aprendizaje
    // Ejemplo: quien domina Excel ya tiene el 70% del camino hacia Power BI.
    // ----------------------------------------------------------
    transferencias: [
      { de: 'Excel',                   a: 'Power BI',                 fuerza: 0.7, semanas: 4 },
      { de: 'Excel',                   a: 'Análisis de datos',        fuerza: 0.8, semanas: 3 },
      { de: 'Excel',                   a: 'SQL',                      fuerza: 0.5, semanas: 6 },
      { de: 'SQL',                     a: 'Análisis de datos',        fuerza: 0.9, semanas: 2 },
      { de: 'Power BI',                a: 'Análisis de datos',        fuerza: 0.7, semanas: 3 },
      { de: 'Python',                  a: 'Análisis de datos',        fuerza: 0.8, semanas: 3 },
      { de: 'SQL',                     a: 'Modelado de datos',        fuerza: 0.7, semanas: 5 },
      { de: 'Power BI',                a: 'Modelado de datos',        fuerza: 0.5, semanas: 6 },
      { de: 'Análisis de datos',       a: 'Modelado de datos',        fuerza: 0.6, semanas: 6 },
      { de: 'Comunicación',            a: 'Atención al cliente',      fuerza: 0.6, semanas: 3 },
      { de: 'Atención al cliente',     a: 'Ventas',                   fuerza: 0.6, semanas: 4 },
      { de: 'Comunicación',            a: 'Ventas',                   fuerza: 0.5, semanas: 4 },
      { de: 'Organización',            a: 'Procesos administrativos', fuerza: 0.7, semanas: 3 },
      { de: 'Comunicación',            a: 'Liderazgo',                fuerza: 0.5, semanas: 8 },
      { de: 'Organización',            a: 'Liderazgo',                fuerza: 0.4, semanas: 8 },
      { de: 'Adaptabilidad',           a: 'Resolución de problemas',  fuerza: 0.5, semanas: 4 },

      // --- Servicios generales, logística y servicio (versión 2) ---
      { de: 'Limpieza y aseo',          a: 'Manejo de productos químicos', fuerza: 0.6, semanas: 3 },
      { de: 'Limpieza y aseo',          a: 'Manejo de residuos',           fuerza: 0.6, semanas: 2 },
      { de: 'Limpieza y aseo',          a: 'Mantenimiento básico',         fuerza: 0.4, semanas: 6 },
      { de: 'Organización',             a: 'Limpieza y aseo',              fuerza: 0.4, semanas: 3 },
      { de: 'Organización',             a: 'Manejo de inventarios',        fuerza: 0.6, semanas: 3 },
      { de: 'Procesos administrativos', a: 'Manejo de inventarios',        fuerza: 0.5, semanas: 4 },
      { de: 'Manejo de inventarios',    a: 'Almacenamiento y despacho',    fuerza: 0.7, semanas: 3 },
      { de: 'Atención al cliente',      a: 'Caja y manejo de dinero',      fuerza: 0.6, semanas: 2 },
      { de: 'Ventas',                   a: 'Caja y manejo de dinero',      fuerza: 0.5, semanas: 3 },
      { de: 'Atención al cliente',      a: 'Trabajo bajo presión',         fuerza: 0.4, semanas: 4 },
      { de: 'Responsabilidad',          a: 'Puntualidad',                  fuerza: 0.5, semanas: 2 },
      { de: 'Puntualidad',              a: 'Responsabilidad',              fuerza: 0.5, semanas: 2 }
    ],

    // ----------------------------------------------------------
    // CATÁLOGOS para los formularios (listas de opciones)
    // BACKEND: GET /api/catalogos
    // ----------------------------------------------------------
    catalogos: {
      educacion: ['Bachiller', 'Técnico', 'Tecnólogo', 'Profesional universitario', 'Posgrado', 'Otro'],
      sectores: ['Finanzas', 'Comercio', 'Tecnología', 'Logística', 'Seguros', 'Telecomunicaciones',
                 'Marketing', 'Servicios', 'Salud', 'Educación', 'Manufactura', 'Construcción',
                 'Alimentos y restaurantes', 'Otro'],
      tamanosEmpresa: ['1-10 personas', '11-50 personas', '51-200 personas', '201-1000 personas', 'Más de 1000 personas'],
      modalidades: ['Presencial', 'Híbrido', 'Remoto'],
      niveles: ['Practicante', 'Junior', 'Semi-senior', 'Senior'],
      ciudades: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Remoto']
    },

    // ----------------------------------------------------------
    // EMPRESAS de los reclutadores, indexadas por el id del usuario.
    // Es el equivalente a "perfiles", pero para quien publica vacantes.
    // ----------------------------------------------------------
    empresas: {
      u2: {
        nombre: 'Cooperativa Financiera del Norte', sector: 'Finanzas', ciudad: 'Bogotá',
        tamano: '201-1000 personas', cargo: 'Líder de selección',
        descripcion: 'Cooperativa con presencia en el norte del país, enfocada en servicios financieros para pequeñas empresas.',
        notificaciones: []
      }
    },

    // ----------------------------------------------------------
    // EMPLEOS (tablas job_offers + job_skills)
    // Cada habilidad pide un nivel (1-10) y puede ser obligatoria u opcional.
    // "experienciaMin" cuenta POCO en el match (una penalización suave,
    // configurable en matching.js → PENALIZ_POR_ANIO): la idea de
    // SkillMatch es medir potencial, no solo años.
    // ----------------------------------------------------------
    empleos: [
      {
        // reclutadorId = quién la publicó (aquí, Carlos Ruiz). Las ofertas nuevas lo traen automáticamente.
        id: 'j1', reclutadorId: 'u2', titulo: 'Analista de datos jr.', empresa: 'Cooperativa Financiera del Norte',
        ciudad: 'Bogotá', modalidad: 'Híbrido', nivel: 'Junior', sector: 'Finanzas',
        experienciaMin: 1, publicado: ahora - 3 * DIA,
        descripcion: 'Apoyarás al equipo de riesgo en la preparación de reportes, consultas a bases de datos y tableros para la gerencia.',
        habilidades: [
          { nombre: 'Excel',             nivel: 6, obligatoria: true },
          { nombre: 'SQL',               nivel: 8, obligatoria: true },
          { nombre: 'Power BI',          nivel: 7, obligatoria: true },
          { nombre: 'Análisis de datos', nivel: 8, obligatoria: true },
          { nombre: 'Comunicación',      nivel: 5, obligatoria: false }
        ]
      },
      {
        id: 'j2', titulo: 'Asistente de datos y reportes', empresa: 'Retail Andina S.A.S.',
        ciudad: 'Medellín', modalidad: 'Presencial', nivel: 'Junior', sector: 'Comercio',
        experienciaMin: 0, publicado: ahora - 2 * HORA,
        descripcion: 'Consolidarás cifras de ventas por tienda y prepararás los reportes semanales para los gerentes regionales.',
        habilidades: [
          { nombre: 'Excel',        nivel: 6, obligatoria: true },
          { nombre: 'Organización', nivel: 6, obligatoria: true },
          { nombre: 'Ventas',       nivel: 7, obligatoria: false },
          { nombre: 'Power BI',     nivel: 6, obligatoria: false },
          { nombre: 'SQL',          nivel: 4, obligatoria: false }
        ]
      },
      {
        id: 'j3', titulo: 'Analista de business intelligence', empresa: 'Grupo Saval',
        ciudad: 'Bogotá', modalidad: 'Híbrido', nivel: 'Semi-senior', sector: 'Finanzas',
        experienciaMin: 3, publicado: ahora - 6 * DIA,
        descripcion: 'Diseñarás y mantendrás modelos de datos y tableros ejecutivos que usan las áreas comerciales y de riesgo.',
        habilidades: [
          { nombre: 'Excel',             nivel: 8, obligatoria: true },
          { nombre: 'Power BI',          nivel: 9, obligatoria: true },
          { nombre: 'SQL',               nivel: 9, obligatoria: true },
          { nombre: 'Análisis de datos', nivel: 8, obligatoria: true },
          { nombre: 'Modelado de datos', nivel: 7, obligatoria: false }
        ]
      },
      {
        id: 'j4', titulo: 'Auxiliar administrativo de operaciones', empresa: 'Logística Express',
        ciudad: 'Bogotá', modalidad: 'Presencial', nivel: 'Junior', sector: 'Logística',
        experienciaMin: 1, publicado: ahora - 1 * DIA,
        descripcion: 'Coordinarás la documentación de despachos, el seguimiento a pedidos y la atención a clientes corporativos.',
        habilidades: [
          { nombre: 'Organización',             nivel: 6, obligatoria: true },
          { nombre: 'Procesos administrativos', nivel: 6, obligatoria: true },
          { nombre: 'Excel',                    nivel: 6, obligatoria: true },
          { nombre: 'Atención al cliente',      nivel: 6, obligatoria: false }
        ]
      },
      {
        id: 'j5', titulo: 'Ejecutivo comercial junior', empresa: 'Seguros Horizonte',
        ciudad: 'Cali', modalidad: 'Híbrido', nivel: 'Junior', sector: 'Seguros',
        experienciaMin: 0, publicado: ahora - 4 * DIA,
        descripcion: 'Atenderás clientes nuevos y existentes, explicarás los productos de seguros y darás seguimiento a cotizaciones.',
        habilidades: [
          { nombre: 'Ventas',              nivel: 8, obligatoria: true },
          { nombre: 'Comunicación',        nivel: 7, obligatoria: true },
          { nombre: 'Atención al cliente', nivel: 6, obligatoria: true },
          { nombre: 'Adaptabilidad',       nivel: 6, obligatoria: false },
          { nombre: 'Excel',               nivel: 3, obligatoria: false }
        ]
      },
      {
        id: 'j6', titulo: 'Analista de datos de marketing', empresa: 'Agencia Pixel',
        ciudad: 'Remoto', modalidad: 'Remoto', nivel: 'Semi-senior', sector: 'Marketing',
        experienciaMin: 2, publicado: ahora - 8 * DIA,
        descripcion: 'Medirás el rendimiento de campañas digitales y construirás reportes para clientes de distintas industrias.',
        habilidades: [
          { nombre: 'SQL',               nivel: 6, obligatoria: true },
          { nombre: 'Excel',             nivel: 6, obligatoria: true },
          { nombre: 'Marketing digital', nivel: 5, obligatoria: true },
          { nombre: 'Análisis de datos', nivel: 6, obligatoria: true },
          { nombre: 'Power BI',          nivel: 5, obligatoria: false }
        ]
      },
      {
        id: 'j7', titulo: 'Científico de datos jr.', empresa: 'Tecnova',
        ciudad: 'Remoto', modalidad: 'Remoto', nivel: 'Semi-senior', sector: 'Tecnología',
        experienciaMin: 2, publicado: ahora - 5 * DIA,
        descripcion: 'Participarás en proyectos de analítica avanzada: limpieza de datos, modelos predictivos y visualización de resultados.',
        habilidades: [
          { nombre: 'Python',            nivel: 7, obligatoria: true },
          { nombre: 'SQL',               nivel: 6, obligatoria: true },
          { nombre: 'Análisis de datos', nivel: 7, obligatoria: true },
          { nombre: 'Modelado de datos', nivel: 5, obligatoria: false }
        ]
      },
      {
        id: 'j8', titulo: 'Coordinador de servicio al cliente', empresa: 'Telecom Andes',
        ciudad: 'Barranquilla', modalidad: 'Presencial', nivel: 'Semi-senior', sector: 'Telecomunicaciones',
        experienciaMin: 3, publicado: ahora - 2 * DIA,
        descripcion: 'Liderarás un equipo de agentes, harás seguimiento a indicadores de servicio y resolverás casos escalados.',
        habilidades: [
          { nombre: 'Atención al cliente',     nivel: 7, obligatoria: true },
          { nombre: 'Liderazgo',               nivel: 6, obligatoria: true },
          { nombre: 'Comunicación',            nivel: 7, obligatoria: true },
          { nombre: 'Organización',            nivel: 6, obligatoria: true },
          { nombre: 'Resolución de problemas', nivel: 5, obligatoria: false }
        ]
      },
      {
        id: 'j9', titulo: 'Auxiliar de servicios generales', empresa: 'Edificio Torres del Parque',
        ciudad: 'Bogotá', modalidad: 'Presencial', nivel: 'Junior', sector: 'Servicios',
        experienciaMin: 0, publicado: ahora - 5 * HORA,
        descripcion: 'Mantendrás limpias y ordenadas las zonas comunes y oficinas, manejarás los insumos de aseo y apoyarás el mantenimiento básico.',
        habilidades: [
          { nombre: 'Limpieza y aseo',              nivel: 5, obligatoria: true },
          { nombre: 'Responsabilidad',              nivel: 6, obligatoria: true },
          { nombre: 'Puntualidad',                  nivel: 6, obligatoria: true },
          { nombre: 'Resistencia física',           nivel: 5, obligatoria: true },
          { nombre: 'Manejo de productos químicos', nivel: 4, obligatoria: false },
          { nombre: 'Manejo de residuos',           nivel: 4, obligatoria: false }
        ]
      },
      {
        id: 'j10', titulo: 'Auxiliar de bodega', empresa: 'Distribuciones El Dorado',
        ciudad: 'Bogotá', modalidad: 'Presencial', nivel: 'Junior', sector: 'Logística',
        experienciaMin: 1, publicado: ahora - 2 * DIA,
        descripcion: 'Recibirás y alistarás pedidos, mantendrás el inventario al día y apoyarás el cargue y descargue de mercancía.',
        habilidades: [
          { nombre: 'Almacenamiento y despacho', nivel: 5, obligatoria: true },
          { nombre: 'Manejo de inventarios',     nivel: 5, obligatoria: true },
          { nombre: 'Resistencia física',        nivel: 5, obligatoria: true },
          { nombre: 'Responsabilidad',           nivel: 5, obligatoria: true },
          { nombre: 'Manejo de montacargas',     nivel: 4, obligatoria: false }
        ]
      }
    ],

    // ----------------------------------------------------------
    // CURSOS Y PROYECTOS (catálogo de recursos de aprendizaje)
    // "habilidades" = qué habilidades mejora y cuántos puntos sube
    // el nivel al COMPLETARLO (boost). Es una simulación: en la vida
    // real el nivel lo validaría una prueba, un certificado o un proyecto.
    // ----------------------------------------------------------
    cursos: [
      { id: 'c1',  titulo: 'SQL desde cero para análisis de datos',          tipo: 'Curso',    horas: 20,
        habilidades: [{ nombre: 'SQL', boost: 2 }],
        url: 'https://www.coursera.org/search?query=sql%20an%C3%A1lisis%20de%20datos' },
      { id: 'c2',  titulo: 'Power BI aplicado a reportes de ventas',         tipo: 'Curso',    horas: 12,
        habilidades: [{ nombre: 'Power BI', boost: 2 }],
        url: 'https://www.coursera.org/search?query=power%20bi' },
      { id: 'c3',  titulo: 'Proyecto: tablero de ventas con datos reales',   tipo: 'Proyecto', horas: 10,
        habilidades: [{ nombre: 'Power BI', boost: 1 }, { nombre: 'Análisis de datos', boost: 1 }],
        url: 'https://www.kaggle.com/datasets' },
      { id: 'c4',  titulo: 'Fundamentos de modelado de datos',               tipo: 'Curso',    horas: 15,
        habilidades: [{ nombre: 'Modelado de datos', boost: 2 }],
        url: 'https://www.coursera.org/search?query=modelado%20de%20datos' },
      { id: 'c5',  titulo: 'Python para análisis de datos',                  tipo: 'Curso',    horas: 30,
        habilidades: [{ nombre: 'Python', boost: 3 }, { nombre: 'Análisis de datos', boost: 1 }],
        url: 'https://www.coursera.org/search?query=python%20an%C3%A1lisis%20de%20datos' },
      { id: 'c6',  titulo: 'Estadística básica para tomar decisiones',       tipo: 'Curso',    horas: 18,
        habilidades: [{ nombre: 'Análisis de datos', boost: 2 }],
        url: 'https://www.coursera.org/search?query=estad%C3%ADstica%20b%C3%A1sica' },
      { id: 'c7',  titulo: 'Excel avanzado: tablas dinámicas y funciones',   tipo: 'Curso',    horas: 10,
        habilidades: [{ nombre: 'Excel', boost: 1 }],
        url: 'https://www.coursera.org/search?query=excel%20avanzado' },
      { id: 'c8',  titulo: 'Técnicas de venta consultiva',                   tipo: 'Curso',    horas: 14,
        habilidades: [{ nombre: 'Ventas', boost: 2 }],
        url: 'https://www.coursera.org/search?query=venta%20consultiva' },
      { id: 'c9',  titulo: 'Liderazgo de equipos de servicio',               tipo: 'Curso',    horas: 12,
        habilidades: [{ nombre: 'Liderazgo', boost: 2 }],
        url: 'https://www.coursera.org/search?query=liderazgo%20de%20equipos' },
      { id: 'c10', titulo: 'Marketing digital para analistas',               tipo: 'Curso',    horas: 16,
        habilidades: [{ nombre: 'Marketing digital', boost: 2 }],
        url: 'https://www.coursera.org/search?query=marketing%20digital' },
      { id: 'c11', titulo: 'Proyecto: analiza una base de datos pública con SQL', tipo: 'Proyecto', horas: 12,
        habilidades: [{ nombre: 'SQL', boost: 1 }, { nombre: 'Análisis de datos', boost: 1 }],
        url: 'https://www.datos.gov.co' },
      { id: 'c12', titulo: 'Mejora de procesos para operaciones',            tipo: 'Curso',    horas: 14,
        habilidades: [{ nombre: 'Procesos administrativos', boost: 2 }, { nombre: 'Resolución de problemas', boost: 1 }],
        url: 'https://www.coursera.org/search?query=mejora%20de%20procesos' },
      { id: 'c13', titulo: 'Limpieza profesional y manejo seguro de químicos', tipo: 'Curso', horas: 8,
        habilidades: [{ nombre: 'Limpieza y aseo', boost: 2 }, { nombre: 'Manejo de productos químicos', boost: 2 }],
        url: 'https://www.sena.edu.co/es-co/formacion/Paginas/cursosCortos.aspx' },
      { id: 'c14', titulo: 'Seguridad y salud en el trabajo (curso básico)', tipo: 'Curso', horas: 20,
        habilidades: [{ nombre: 'Seguridad y salud en el trabajo', boost: 3 }],
        url: 'https://www.sena.edu.co/es-co/formacion/Paginas/cursosCortos.aspx' },
      { id: 'c15', titulo: 'Control de inventarios y almacenamiento', tipo: 'Curso', horas: 12,
        habilidades: [{ nombre: 'Manejo de inventarios', boost: 2 }, { nombre: 'Almacenamiento y despacho', boost: 2 }],
        url: 'https://www.coursera.org/search?query=control%20de%20inventarios' }
    ],

    // ----------------------------------------------------------
    // RUTAS CAREER GPS (RF-03 pide al menos 3 rutas alternativas)
    // Cada paso lista los requisitos que habría que cumplir para
    // llegar a ese cargo. El estado de cada paso (listo / en curso /
    // pendiente) NO está aquí: se calcula con las habilidades del usuario.
    // El primer paso ("posición actual") se genera automáticamente.
    // ----------------------------------------------------------
    rutas: [
      {
        id: 'analista-datos', titulo: 'Analista de datos',
        descripcion: 'Pasar de tareas administrativas a trabajar con datos, consultas y análisis.',
        pasos: [
          { rol: 'Analista de datos jr.', descripcion: 'Primer cargo con datos: reportes, tablas y consultas básicas.',
            requisitos: [
              { nombre: 'Excel', nivel: 6, obligatoria: true }, { nombre: 'Power BI', nivel: 5, obligatoria: true },
              { nombre: 'SQL', nivel: 5, obligatoria: true },   { nombre: 'Análisis de datos', nivel: 5, obligatoria: true } ] },
          { rol: 'Analista de datos', descripcion: 'Análisis autónomo: consultas avanzadas, modelos de datos y presentación de hallazgos.',
            requisitos: [
              { nombre: 'SQL', nivel: 7, obligatoria: true }, { nombre: 'Análisis de datos', nivel: 7, obligatoria: true },
              { nombre: 'Modelado de datos', nivel: 5, obligatoria: true }, { nombre: 'Power BI', nivel: 6, obligatoria: true } ] }
        ]
      },
      {
        id: 'bi', titulo: 'Business Intelligence',
        descripcion: 'Especializarte en tableros y reportes que ayudan a decidir a las áreas de negocio.',
        pasos: [
          { rol: 'Asistente de datos y reportes', descripcion: 'Consolidar información y preparar reportes periódicos.',
            requisitos: [
              { nombre: 'Excel', nivel: 6, obligatoria: true }, { nombre: 'Power BI', nivel: 4, obligatoria: true },
              { nombre: 'Organización', nivel: 6, obligatoria: true } ] },
          { rol: 'Analista de reportes BI', descripcion: 'Construir tableros conectados a bases de datos.',
            requisitos: [
              { nombre: 'Power BI', nivel: 6, obligatoria: true }, { nombre: 'SQL', nivel: 5, obligatoria: true },
              { nombre: 'Excel', nivel: 7, obligatoria: true } ] },
          { rol: 'Analista de business intelligence', descripcion: 'Diseñar modelos de datos y tableros ejecutivos.',
            requisitos: [
              { nombre: 'Power BI', nivel: 8, obligatoria: true }, { nombre: 'SQL', nivel: 8, obligatoria: true },
              { nombre: 'Modelado de datos', nivel: 6, obligatoria: true }, { nombre: 'Análisis de datos', nivel: 7, obligatoria: true } ] }
        ]
      },
      {
        id: 'operaciones', titulo: 'Coordinación de operaciones',
        descripcion: 'Crecer hacia la gestión de procesos y equipos aprovechando tu experiencia administrativa.',
        pasos: [
          { rol: 'Auxiliar de operaciones', descripcion: 'Seguimiento de procesos y documentación operativa.',
            requisitos: [
              { nombre: 'Organización', nivel: 6, obligatoria: true }, { nombre: 'Procesos administrativos', nivel: 5, obligatoria: true },
              { nombre: 'Excel', nivel: 5, obligatoria: true } ] },
          { rol: 'Analista de procesos', descripcion: 'Medir y mejorar procesos con datos.',
            requisitos: [
              { nombre: 'Procesos administrativos', nivel: 6, obligatoria: true }, { nombre: 'Excel', nivel: 6, obligatoria: true },
              { nombre: 'Análisis de datos', nivel: 5, obligatoria: true }, { nombre: 'Comunicación', nivel: 6, obligatoria: true } ] },
          { rol: 'Coordinador de operaciones', descripcion: 'Liderar el equipo y los resultados de un área operativa.',
            requisitos: [
              { nombre: 'Liderazgo', nivel: 6, obligatoria: true }, { nombre: 'Procesos administrativos', nivel: 7, obligatoria: true },
              { nombre: 'Resolución de problemas', nivel: 6, obligatoria: true }, { nombre: 'Comunicación', nivel: 7, obligatoria: true } ] }
        ]
      }
    ]
  };
};
