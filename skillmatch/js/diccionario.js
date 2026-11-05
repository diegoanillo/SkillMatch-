/* ============================================================
   diccionario.js  →  EL "VOCABULARIO" DE SKILLMATCH
   ============================================================
   Un computador no sabe que "MS Excel", "excel avanzado" y
   "hojas de cálculo" son la misma cosa, ni que "aseo" y "limpieza"
   hablan de lo mismo. Este archivo se lo enseña.

   Para cada habilidad guardamos, en UN solo lugar:
     nombre     → el nombre oficial (el que se muestra en pantalla)
     categoria  → technical | soft | domain  (igual que la tabla `skills`)
     familias   → "áreas de trabajo" a las que pertenece. Dos
                  habilidades de la misma familia se parecen, y eso
                  permite estimar compatibilidad aunque no exista una
                  relación escrita entre ellas (ver matching.js).
     alias      → otras formas de escribirla (sinónimos)

   También guardamos CARGOS: si un reclutador solo escribe "servicios
   generales", sabemos qué habilidades suele pedir ese cargo.

   ¿Qué pasa con una habilidad que NO está aquí?
   El sistema igual la acepta (analisis.js la propone como "nueva" y
   el reclutador la confirma). Este diccionario crece con el uso.

   IMPORTANTE (para el equipo de backend): este archivo es la versión
   de práctica de dos cosas que en producción serán más potentes:
     - los sinónimos y familias  → Neo4j + embeddings de texto
     - los cargos                → el modelo de lenguaje (IA)
   Las funciones que expone (canonico, familiasDe, etc.) son las que
   el resto del frontend usa, así que el cambio será transparente.
   ============================================================ */

(function (global) {
  'use strict';

  // --------------------------------------------------------
  // Quita tildes y pasa a minúsculas: "Análisis" → "analisis".
  // Así comparamos textos sin que las tildes estorben.
  // --------------------------------------------------------
  function norm(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }


  // ==========================================================
  // 1. CATÁLOGO DE HABILIDADES
  // ==========================================================
  const CATALOGO = [

    // ---------- Técnicas: mundo de los datos ----------
    { nombre: 'Excel', categoria: 'technical', familias: ['datos', 'administrativo'],
      alias: ['microsoft excel', 'ms excel', 'hojas de calculo', 'hoja de calculo', 'tablas dinamicas', 'formulas de excel'] },
    { nombre: 'SQL', categoria: 'technical', familias: ['datos'],
      alias: ['mysql', 'postgresql', 'postgres', 'sql server', 'bases de datos', 'base de datos', 'consultas sql'] },
    { nombre: 'Power BI', categoria: 'technical', familias: ['datos'],
      alias: ['powerbi', 'power-bi', 'business intelligence', 'tableros de control', 'dashboards'] },
    { nombre: 'Análisis de datos', categoria: 'technical', familias: ['datos'],
      alias: ['analitica de datos', 'analisis de informacion', 'data analysis', 'reporteria', 'indicadores de gestion'] },
    { nombre: 'Python', categoria: 'technical', familias: ['datos'],
      alias: ['pandas', 'numpy', 'programacion en python'] },
    { nombre: 'Modelado de datos', categoria: 'technical', familias: ['datos'],
      alias: ['modelo de datos', 'modelos de datos', 'modelamiento de datos', 'diagramas entidad relacion'] },

    // ---------- Blandas ----------
    { nombre: 'Organización', categoria: 'soft', familias: ['administrativo'],
      alias: ['planificacion', 'planeacion', 'gestion del tiempo', 'organizado', 'organizada', 'orden y metodo'] },
    { nombre: 'Comunicación', categoria: 'soft', familias: ['comercial'],
      alias: ['comunicacion efectiva', 'comunicacion asertiva', 'habilidades comunicativas', 'expresion oral', 'redaccion'] },
    { nombre: 'Trabajo en equipo', categoria: 'soft', familias: [],
      alias: ['trabajo colaborativo', 'trabajar en equipo', 'equipo de trabajo', 'colaboracion'] },
    { nombre: 'Adaptabilidad', categoria: 'soft', familias: [],
      alias: ['flexibilidad', 'flexible', 'adaptable', 'adaptarse a los cambios'] },
    { nombre: 'Liderazgo', categoria: 'soft', familias: [],
      alias: ['liderar', 'lider de equipo', 'coordinacion de equipos', 'direccion de equipos', 'manejo de personal'] },
    { nombre: 'Resolución de problemas', categoria: 'soft', familias: [],
      alias: ['solucion de problemas', 'resolver problemas', 'pensamiento critico'] },
    { nombre: 'Puntualidad', categoria: 'soft', familias: [],
      alias: ['puntual', 'cumplimiento de horarios', 'cumplimiento de horario'] },
    { nombre: 'Responsabilidad', categoria: 'soft', familias: [],
      alias: ['responsable', 'comprometido', 'compromiso', 'honestidad', 'honesto', 'confiable'] },
    { nombre: 'Trabajo bajo presión', categoria: 'soft', familias: [],
      alias: ['bajo presion', 'manejo del estres', 'manejo de estres', 'alta carga de trabajo'] },
    { nombre: 'Resistencia física', categoria: 'soft', familias: ['servicios_generales', 'logistica'],
      alias: ['fuerza fisica', 'esfuerzo fisico', 'buena condicion fisica', 'levantar peso', 'carga de peso'] },

    // ---------- De dominio: comercial y servicio ----------
    { nombre: 'Ventas', categoria: 'domain', familias: ['comercial'],
      alias: ['venta', 'cierre de ventas', 'ventas consultivas', 'prospeccion de clientes', 'negociacion comercial'] },
    { nombre: 'Atención al cliente', categoria: 'domain', familias: ['comercial'],
      alias: ['servicio al cliente', 'atencion a clientes', 'atencion al publico', 'atencion al usuario', 'call center', 'trato con clientes'] },
    { nombre: 'Marketing digital', categoria: 'domain', familias: ['comercial'],
      alias: ['marketing', 'mercadeo', 'redes sociales', 'community manager', 'campanas digitales', 'seo'] },
    { nombre: 'Caja y manejo de dinero', categoria: 'domain', familias: ['comercial'],
      alias: ['caja', 'cajero', 'cajera', 'manejo de dinero', 'arqueo de caja', 'punto de venta', 'cobro a clientes'] },

    // ---------- De dominio: administración y logística ----------
    { nombre: 'Procesos administrativos', categoria: 'domain', familias: ['administrativo', 'logistica'],
      alias: ['gestion administrativa', 'apoyo administrativo', 'gestion documental', 'tramites administrativos', 'archivo', 'facturacion'] },
    { nombre: 'Finanzas', categoria: 'domain', familias: ['administrativo'],
      alias: ['contabilidad', 'finanzas basicas', 'analisis financiero', 'presupuestos', 'tesoreria', 'conciliaciones'] },
    { nombre: 'Manejo de inventarios', categoria: 'domain', familias: ['logistica', 'administrativo'],
      alias: ['inventario', 'control de inventarios', 'control de stock', 'stock', 'kardex'] },
    { nombre: 'Almacenamiento y despacho', categoria: 'domain', familias: ['logistica'],
      alias: ['bodega', 'almacen', 'despacho', 'picking', 'alistamiento de pedidos', 'cargue y descargue', 'recepcion de mercancia'] },
    { nombre: 'Manejo de montacargas', categoria: 'technical', familias: ['logistica'],
      alias: ['montacargas', 'autoelevador', 'traspaleta', 'estibador'] },

    // ---------- De dominio: servicios generales y mantenimiento ----------
    { nombre: 'Limpieza y aseo', categoria: 'domain', familias: ['servicios_generales', 'gastronomia'],
      alias: ['limpieza', 'aseo', 'limpieza general', 'limpieza de oficinas', 'desinfeccion', 'barrido', 'trapeado', 'oficios varios'] },
    { nombre: 'Manejo de productos químicos', categoria: 'domain', familias: ['servicios_generales'],
      alias: ['productos quimicos', 'productos de limpieza', 'insumos de aseo', 'sustancias quimicas', 'quimicos de limpieza'] },
    { nombre: 'Manejo de residuos', categoria: 'domain', familias: ['servicios_generales'],
      alias: ['residuos', 'manejo de basuras', 'basuras', 'reciclaje', 'clasificacion de residuos', 'disposicion de residuos'] },
    { nombre: 'Mantenimiento básico', categoria: 'domain', familias: ['servicios_generales'],
      alias: ['mantenimiento', 'mantenimiento locativo', 'reparaciones locativas', 'arreglos locativos', 'plomeria basica', 'electricidad basica'] },
    { nombre: 'Seguridad y salud en el trabajo', categoria: 'domain', familias: ['servicios_generales', 'logistica'],
      alias: ['sst', 'seguridad industrial', 'seguridad y salud', 'normas de seguridad', 'elementos de proteccion', 'bioseguridad', 'trabajo en alturas'] },

    // ---------- De dominio: gastronomía ----------
    { nombre: 'Manipulación de alimentos', categoria: 'domain', familias: ['gastronomia'],
      alias: ['manipulacion de alimentos', 'buenas practicas de manufactura', 'bpm', 'inocuidad', 'higiene de alimentos'] },
    { nombre: 'Cocina', categoria: 'domain', familias: ['gastronomia'],
      alias: ['cocinero', 'cocinera', 'preparacion de alimentos', 'auxiliar de cocina', 'chef'] },

    // ---------- Idiomas ----------
    { nombre: 'Inglés', categoria: 'domain', familias: [],
      alias: ['ingles', 'english', 'bilingue', 'idioma ingles'] }
  ];


  // ==========================================================
  // 2. CARGOS: qué habilidades suele pedir cada tipo de trabajo
  // ------------------------------------------------------------
  // Si el texto menciona uno de los "patrones", asumimos estas
  // habilidades (con un nivel típico). Es lo que haría una persona
  // con experiencia en selección al leer "servicios generales".
  // ==========================================================
  const CARGOS = [
    { nombre: 'Servicios generales',
      patrones: ['servicios generales', 'aseador', 'aseadora', 'personal de aseo', 'auxiliar de aseo', 'oficios varios'],
      habilidades: [
        { nombre: 'Limpieza y aseo',               nivel: 5, obligatoria: true },
        { nombre: 'Responsabilidad',               nivel: 6, obligatoria: true },
        { nombre: 'Puntualidad',                   nivel: 6, obligatoria: true },
        { nombre: 'Resistencia física',            nivel: 5, obligatoria: true },
        { nombre: 'Manejo de productos químicos',  nivel: 4, obligatoria: false },
        { nombre: 'Manejo de residuos',            nivel: 4, obligatoria: false },
        { nombre: 'Mantenimiento básico',          nivel: 3, obligatoria: false },
        { nombre: 'Trabajo en equipo',             nivel: 4, obligatoria: false }
      ] },
    { nombre: 'Auxiliar de bodega',
      patrones: ['auxiliar de bodega', 'bodeguero', 'operario de bodega', 'auxiliar logistico', 'auxiliar de almacen'],
      habilidades: [
        { nombre: 'Almacenamiento y despacho',  nivel: 5, obligatoria: true },
        { nombre: 'Manejo de inventarios',      nivel: 5, obligatoria: true },
        { nombre: 'Resistencia física',         nivel: 5, obligatoria: true },
        { nombre: 'Responsabilidad',            nivel: 5, obligatoria: true },
        { nombre: 'Manejo de montacargas',      nivel: 4, obligatoria: false },
        { nombre: 'Seguridad y salud en el trabajo', nivel: 4, obligatoria: false }
      ] },
    { nombre: 'Auxiliar administrativo',
      patrones: ['auxiliar administrativo', 'auxiliar administrativa', 'asistente administrativo', 'asistente administrativa'],
      habilidades: [
        { nombre: 'Procesos administrativos', nivel: 6, obligatoria: true },
        { nombre: 'Excel',                    nivel: 5, obligatoria: true },
        { nombre: 'Organización',             nivel: 6, obligatoria: true },
        { nombre: 'Atención al cliente',      nivel: 5, obligatoria: false },
        { nombre: 'Comunicación',             nivel: 5, obligatoria: false }
      ] },
    { nombre: 'Mesero',
      patrones: ['mesero', 'mesera', 'camarero', 'auxiliar de servicio en restaurante'],
      habilidades: [
        { nombre: 'Atención al cliente',        nivel: 6, obligatoria: true },
        { nombre: 'Trabajo en equipo',          nivel: 5, obligatoria: true },
        { nombre: 'Trabajo bajo presión',       nivel: 5, obligatoria: true },
        { nombre: 'Manipulación de alimentos',  nivel: 4, obligatoria: false },
        { nombre: 'Puntualidad',                nivel: 5, obligatoria: false }
      ] },
    { nombre: 'Auxiliar de cocina',
      patrones: ['auxiliar de cocina', 'ayudante de cocina', 'cocinero', 'cocinera'],
      habilidades: [
        { nombre: 'Cocina',                     nivel: 5, obligatoria: true },
        { nombre: 'Manipulación de alimentos',  nivel: 6, obligatoria: true },
        { nombre: 'Limpieza y aseo',            nivel: 5, obligatoria: true },
        { nombre: 'Trabajo en equipo',          nivel: 5, obligatoria: false }
      ] },
    { nombre: 'Cajero',
      patrones: ['cajero', 'cajera', 'auxiliar de caja'],
      habilidades: [
        { nombre: 'Caja y manejo de dinero', nivel: 6, obligatoria: true },
        { nombre: 'Atención al cliente',     nivel: 6, obligatoria: true },
        { nombre: 'Responsabilidad',         nivel: 6, obligatoria: true }
      ] },
    { nombre: 'Asesor comercial',
      patrones: ['asesor comercial', 'asesora comercial', 'vendedor', 'vendedora', 'ejecutivo comercial', 'ejecutiva comercial'],
      habilidades: [
        { nombre: 'Ventas',              nivel: 6, obligatoria: true },
        { nombre: 'Atención al cliente', nivel: 6, obligatoria: true },
        { nombre: 'Comunicación',        nivel: 6, obligatoria: true }
      ] },
    { nombre: 'Recepcionista',
      patrones: ['recepcionista', 'auxiliar de recepcion'],
      habilidades: [
        { nombre: 'Atención al cliente', nivel: 6, obligatoria: true },
        { nombre: 'Comunicación',        nivel: 6, obligatoria: true },
        { nombre: 'Organización',        nivel: 5, obligatoria: true },
        { nombre: 'Excel',               nivel: 3, obligatoria: false }
      ] },
    { nombre: 'Analista de datos',
      patrones: ['analista de datos', 'analista de informacion', 'analista de reportes'],
      habilidades: [
        { nombre: 'Excel',             nivel: 6, obligatoria: true },
        { nombre: 'SQL',               nivel: 6, obligatoria: true },
        { nombre: 'Análisis de datos', nivel: 6, obligatoria: true },
        { nombre: 'Power BI',          nivel: 5, obligatoria: false },
        { nombre: 'Comunicación',      nivel: 5, obligatoria: false }
      ] }
  ];


  // ==========================================================
  // 3. ÍNDICES (se construyen UNA vez, al cargar el archivo)
  // ------------------------------------------------------------
  // Convertimos las listas de arriba en estructuras de búsqueda
  // rápida, para no recorrerlas completas en cada consulta.
  // ==========================================================

  // nombre normalizado o alias normalizado → entrada del catálogo
  const porAlias = {};
  CATALOGO.forEach(function (h) {
    porAlias[norm(h.nombre)] = h;
    h.alias.forEach(function (a) { porAlias[norm(a)] = h; });
  });

  // Escapa caracteres especiales para usar un texto dentro de una expresión regular
  function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Lista de { alias, habilidad, regex } para buscar menciones dentro de un texto.
  // Se ordena de la frase más larga a la más corta, para que
  // "limpieza de oficinas" se detecte antes que solo "limpieza".
  const indiceBusqueda = Object.keys(porAlias)
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (alias) {
      // (^|no-letra) alias (s|es)? (no-letra)  → palabra completa, con plural opcional
      const patron = '(^|[^a-z0-9])' + escaparRegex(alias).replace(/\s+/g, '\\s+') + '(?:s|es)?(?![a-z0-9])';
      return { alias: alias, habilidad: porAlias[alias], regex: new RegExp(patron) };
    });


  // ==========================================================
  // 4. FUNCIONES PÚBLICAS
  // ==========================================================

  // Devuelve la entrada del catálogo para un nombre o alias, o null si es desconocida.
  function buscar(nombre) {
    return porAlias[norm(nombre)] || null;
  }

  // Nombre oficial: canonico('ms excel') → 'Excel'.
  // Si no la conocemos, devolvemos el mismo nombre (habilidad abierta).
  function canonico(nombre) {
    const h = buscar(nombre);
    return h ? h.nombre : String(nombre).trim();
  }

  function categoriaDe(nombre) {
    const h = buscar(nombre);
    return h ? h.categoria : null;
  }

  function familiasDe(nombre) {
    const h = buscar(nombre);
    return h ? h.familias : [];
  }

  // ¿Dos habilidades pertenecen a alguna familia en común?
  function comparteFamilia(a, b) {
    const fa = familiasDe(a);
    const fb = familiasDe(b);
    return fa.some(function (f) { return fb.indexOf(f) >= 0; });
  }

  // Cargos cuyos patrones aparecen en un texto YA normalizado.
  function detectarCargos(textoNormalizado) {
    return CARGOS.filter(function (cargo) {
      return cargo.patrones.some(function (p) {
        return new RegExp('(^|[^a-z0-9])' + escaparRegex(p) + '(?![a-z0-9])').test(textoNormalizado);
      });
    });
  }

  // ----------------------------------------------------------
  // SUGERENCIAS PARA UN BUSCADOR DE HABILIDADES
  // Lo usan el registro y "Mi perfil", así se comportan igual.
  //   texto           lo que la persona lleva escrito
  //   nombresCatalogo todos los nombres oficiales disponibles
  //   excluidos       nombres que ya tiene (no se vuelven a sugerir)
  // Encuentra por nombre y también por sinónimo: "ms ex" → Excel.
  // ----------------------------------------------------------
  function sugerir(texto, nombresCatalogo, excluidos, limite) {
    const q = norm(texto);
    if (q.length < 2) return [];

    const yaTiene = (excluidos || []).map(function (n) { return norm(canonico(n)); });
    const porSinonimo = CATALOGO
      .filter(function (h) { return h.alias.some(function (a) { return norm(a).indexOf(q) >= 0; }); })
      .map(function (h) { return h.nombre; });

    return nombresCatalogo
      .filter(function (n) {
        return yaTiene.indexOf(norm(n)) < 0 && (norm(n).indexOf(q) >= 0 || porSinonimo.indexOf(n) >= 0);
      })
      .slice(0, limite || 8);
  }

  // ¿Lo escrito es algo que el sistema no conoce? (candidato a "habilidad nueva")
  function esDesconocida(texto, nombresCatalogo) {
    const t = String(texto).trim();
    return t.length >= 3 && t.length <= 40 && !buscar(t) &&
           !nombresCatalogo.some(function (n) { return norm(n) === norm(t); });
  }

  // Copia simple del catálogo para guardar en la "base de datos" demo
  function catalogoSimple() {
    return CATALOGO.map(function (h) { return { nombre: h.nombre, categoria: h.categoria }; });
  }

  global.Diccionario = {
    norm: norm,
    catalogo: CATALOGO,
    cargos: CARGOS,
    indiceBusqueda: indiceBusqueda,
    buscar: buscar,
    canonico: canonico,
    categoriaDe: categoriaDe,
    familiasDe: familiasDe,
    comparteFamilia: comparteFamilia,
    detectarCargos: detectarCargos,
    sugerir: sugerir,
    esDesconocida: esDesconocida,
    catalogoSimple: catalogoSimple
  };

})(window);
