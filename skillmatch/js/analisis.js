/* ============================================================
   analisis.js  →  "LA IA" DE PRÁCTICA (texto libre → habilidades)
   ============================================================
   Un reclutador escribe:
       "Se busca persona para servicios generales en una empresa..."
   y el sistema debe convertirlo en una lista estructurada:
       Limpieza y aseo (nivel 5, obligatoria), Puntualidad, ...

   En producción, esa conversión la hará un modelo de lenguaje (IA)
   en el BACKEND. Este archivo es un SUSTITUTO para poder construir
   y probar todas las pantallas desde ya. Funciona con reglas:
     1. Busca en el texto las habilidades del diccionario (y sus sinónimos).
     2. Si el texto nombra un cargo conocido, suma las habilidades típicas.
     3. Detecta niveles ("avanzado", "básico", "3 años de..."),
        si es obligatoria o deseable, la experiencia y la modalidad.
     4. Propone como "nuevas" las frases de una lista de requisitos
        que el diccionario no conoce.

   Es menos inteligente que un LLM, pero entrega el MISMO FORMATO.
   Las pantallas no notan la diferencia: cuando exista el backend,
   solo cambia el interior de Api.analizarVacante / analizarPerfil.

   ------------------------------------------------------------
   CONTRATO DE ENTRADA Y SALIDA  (para el equipo de backend)
   ------------------------------------------------------------
   POST /api/ia/analizar-vacante
     Entrada:  { "texto": "Se busca persona para servicios generales..." }
     Salida:
       {
         "cargoDetectado": "Servicios generales" | null,
         "experienciaMin": 1 | null,              // años; null = no se mencionó
         "modalidad": "Presencial" | "Remoto" | "Híbrido" | null,
         "habilidades": [
           {
             "nombre": "Limpieza y aseo",
             "categoria": "technical" | "soft" | "domain",
             "nivel": 5,                          // 1 a 10
             "obligatoria": true,
             "origen": "texto" | "cargo" | "frase",
             "confianza": "alta" | "media" | "baja",
             "enCatalogo": true,                  // false = habilidad nueva
             "evidencia": "frase del texto o explicación"
           }
         ],
         "advertencias": ["texto para mostrar al reclutador", ...],
         "resumen": "Detectamos 6 habilidades..."
       }

   POST /api/ia/analizar-perfil
     Entrada:  { "texto": "Trabajé 2 años como mesero..." }
     Salida:   igual, pero sin cargoDetectado/modalidad y con
               "experienciaAnios" en lugar de "experienciaMin".

   Reglas del contrato:
     - Es una SUGERENCIA: el frontend siempre muestra el resultado
       a la persona para que lo revise y corrija antes de guardar.
     - "origen": "texto" = nombrada en el texto; "cargo" = inferida
       del cargo; "frase" = propuesta de habilidad nueva (confianza baja).
   ============================================================ */

(function (global) {
  'use strict';

  const D = global.Diccionario;

  // Palabras que indican que algo es solo deseable (no obligatorio)
  const PISTAS_DESEABLE = ['deseable', 'se valora', 'valorable', 'sera un plus', 'es un plus', 'un plus',
                           'preferiblemente', 'de preferencia', 'opcional', 'ideal que'];

  // Palabras que indican un nivel
  const PISTAS_NIVEL = [
    { nivel: 8, palabras: ['avanzado', 'avanzada', 'experto', 'experta', 'alto nivel', 'dominio', 'solido', 'solida', 'amplia experiencia'] },
    { nivel: 6, palabras: ['intermedio', 'intermedia', 'buen manejo', 'buen nivel'] },
    { nivel: 4, palabras: ['basico', 'basica', 'nociones', 'principiante', 'conocimientos basicos'] }
  ];

  // Frases que introducen una lista de requisitos ("Requisitos: a, b, c")
  const ENCABEZADOS_LISTA = /(requisitos|se requiere|requerimos|conocimientos|habilidades|funciones|perfil)\s*:/;


  // ==========================================================
  // UTILIDADES DE TEXTO
  // ==========================================================

  // Parte el texto en "frases" (por punto, salto de línea o punto y coma).
  // Guardamos la frase original (para mostrarla) y la normalizada (para buscar).
  function dividirEnFrases(texto) {
    return texto
      .split(/[.!?;\n]+/)
      .map(function (f) { return f.trim(); })
      .filter(function (f) { return f.length > 0; })
      .map(function (f) { return { original: f, norm: D.norm(f) }; });
  }

  function contieneAlguna(textoNorm, lista) {
    return lista.some(function (p) { return textoNorm.indexOf(p) >= 0; });
  }

  // Recorta una frase larga para mostrarla como evidencia
  function recortar(frase) {
    return frase.length > 110 ? frase.slice(0, 107) + '…' : frase;
  }

  // Convierte "2 años" o "6 meses" en años (número)
  function aAnios(cantidad, unidad) {
    const n = parseFloat(String(cantidad).replace(',', '.'));
    return unidad.indexOf('mes') === 0 ? Math.round((n / 12) * 10) / 10 : n;
  }

  // Nivel sugerido a partir de palabras clave y de "N años de ..." en la frase
  function nivelDeFrase(frase, nivelPorDefecto) {
    for (let i = 0; i < PISTAS_NIVEL.length; i++) {
      if (contieneAlguna(frase.norm, PISTAS_NIVEL[i].palabras)) return PISTAS_NIVEL[i].nivel;
    }
    const m = frase.norm.match(/(\d+(?:[.,]\d+)?)\s*(anos?|meses|mes)/);
    if (m) {
      const anios = aAnios(m[1], m[2]);
      if (anios >= 5) return 8;
      if (anios >= 3) return 7;
      if (anios >= 1) return 6;
      return 4;
    }
    return nivelPorDefecto;
  }


  // ==========================================================
  // EXPERIENCIA Y MODALIDAD
  // ==========================================================

  // Busca "N años de experiencia", "experiencia de N años", "sin experiencia"...
  // Devuelve un número de años o null si no se mencionó.
  function detectarExperiencia(textoNorm) {
    if (/sin experiencia|no se requiere experiencia|no requiere experiencia|no necesita experiencia|primer empleo/.test(textoNorm)) {
      return 0;
    }
    const patrones = [
      /(\d+(?:[.,]\d+)?)\s*(anos?|meses|mes)\s*(?:de|en)?\s*experiencia/,
      /experiencia\s*(?:minima\s*)?(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(anos?|meses|mes)/,
      /(?:tengo|cuento con|llevo)\s*(\d+(?:[.,]\d+)?)\s*(anos?|meses|mes)/,
      /(\d+(?:[.,]\d+)?)\s*(anos?|meses|mes)\s*(?:trabajando|laborando|en el sector)/
    ];
    for (let i = 0; i < patrones.length; i++) {
      const m = textoNorm.match(patrones[i]);
      if (m) return aAnios(m[1], m[2]);
    }
    return null;
  }

  function detectarModalidad(textoNorm) {
    if (/hibrido|semipresencial/.test(textoNorm)) return 'Híbrido';
    if (/remoto|teletrabajo|trabajo en casa|home office/.test(textoNorm)) return 'Remoto';
    if (/presencial/.test(textoNorm)) return 'Presencial';
    return null;
  }


  // ==========================================================
  // EXTRACCIÓN DE HABILIDADES
  // ==========================================================

  // Paso 1: habilidades NOMBRADAS en el texto (con sus sinónimos).
  // Devuelve un objeto { nombreOficial: {…datos…} }
  function extraerMencionadas(frases, nivelPorDefecto, modoVacante) {
    const encontradas = {};
    let enSeccionDeseable = false;   // ¿estamos bajo un encabezado tipo "Deseable:"?

    frases.forEach(function (frase) {
      // Un encabezado "Deseable:" (solo) activa el modo deseable para las frases siguientes;
      // un encabezado "Requisitos:" lo desactiva.
      if (/^(deseable|deseables|se valora|valorable|opcional)s?\s*:?\s*$/.test(frase.norm)) { enSeccionDeseable = true; return; }
      if (/^(requisitos|se requiere|requerimos|obligatorio)s?\s*:?\s*$/.test(frase.norm)) { enSeccionDeseable = false; return; }

      const esDeseable = enSeccionDeseable || contieneAlguna(frase.norm, PISTAS_DESEABLE);

      D.indiceBusqueda.forEach(function (entrada) {
        if (!entrada.regex.test(frase.norm)) return;

        const nombre = entrada.habilidad.nombre;

        // El nivel se busca SOLO en el fragmento de la frase donde aparece esta
        // habilidad (separado por comas o " y "). Así, en "Excel avanzado y SQL
        // intermedio", cada una recibe su propio nivel.
        // Si la habilidad lleva una "y" dentro ("Limpieza y aseo") no se parte bien
        // y usamos la frase completa.
        const fragmento = frase.norm.split(/,| y | e /).find(function (c) { return entrada.regex.test(c); });
        const nivel = nivelDeFrase({ norm: fragmento || frase.norm }, nivelPorDefecto);

        if (!encontradas[nombre]) {
          encontradas[nombre] = {
            nombre: nombre,
            categoria: entrada.habilidad.categoria,
            nivel: nivel,
            obligatoria: modoVacante ? !esDeseable : true,
            origen: 'texto',
            confianza: 'alta',
            enCatalogo: true,
            evidencia: recortar(frase.original)
          };
        } else {
          // Si ya estaba, conservamos el nivel más alto, y es obligatoria
          // si ALGUNA mención lo es.
          const previa = encontradas[nombre];
          previa.nivel = Math.max(previa.nivel, nivel);
          if (modoVacante && !esDeseable) previa.obligatoria = true;
        }
      });
    });

    return encontradas;
  }

  // Paso 2: habilidades típicas de los CARGOS nombrados en el texto.
  // (En perfiles, el nivel se rebaja 1 punto: sabemos que trabajó en eso,
  // pero no qué tan bien lo hacía.)
  function aplicarCargos(textoNorm, encontradas, esPerfil) {
    const cargos = D.detectarCargos(textoNorm);

    cargos.forEach(function (cargo) {
      cargo.habilidades.forEach(function (h) {
        if (encontradas[h.nombre]) return;   // lo explícito en el texto manda sobre lo inferido

        encontradas[h.nombre] = {
          nombre: h.nombre,
          categoria: D.categoriaDe(h.nombre) || 'domain',
          nivel: esPerfil ? Math.max(1, h.nivel - 1) : h.nivel,
          obligatoria: esPerfil ? true : h.obligatoria,
          origen: 'cargo',
          confianza: 'media',
          enCatalogo: true,
          evidencia: 'Suele pedirse en el cargo "' + cargo.nombre + '".'
        };
      });
    });

    return cargos;
  }

  // Paso 3: frases de una lista ("Requisitos: a, b, c" o viñetas) que el
  // diccionario NO conoce. Se proponen como habilidades nuevas, con
  // confianza baja, para que la persona las confirme o las descarte.
  const PALABRAS_VACIAS = ['experiencia', 'conocimiento', 'conocimientos', 'manejo', 'buena', 'buen', 'persona', 'personas', 'empresa', 'trabajo', 'disponibilidad'];

  function proponerNuevas(textoOriginal, encontradas) {
    const candidatas = [];
    const lineas = textoOriginal.split('\n');

    lineas.forEach(function (linea) {
      const esVineta = /^\s*([-\u2022*\u00b7]|\d+[.)])\s+/.test(linea);
      const lineaNorm = D.norm(linea);
      const encabezado = lineaNorm.match(ENCABEZADOS_LISTA);

      let trozo = null;
      if (esVineta) trozo = linea.replace(/^\s*([-\u2022*\u00b7]|\d+[.)])\s+/, '');
      else if (encabezado) trozo = linea.slice(linea.indexOf(':') + 1);
      if (trozo === null) return;

      trozo.split(/[,;]| y /).forEach(function (parte) {
        const limpia = parte.replace(/[.\s]+$/, '').trim();
        const n = D.norm(limpia);
        const palabras = n.split(/\s+/).filter(function (w) { return w.length > 0; });

        if (limpia.length < 4 || limpia.length > 45) return;     // muy corta o muy larga
        if (palabras.length > 6) return;                          // parece una oración, no una habilidad
        if (palabras.every(function (w) { return PALABRAS_VACIAS.indexOf(w) >= 0; })) return;
        if (D.buscar(limpia)) return;                             // ya la conocemos
        // Si contiene algo que el diccionario ya detectó, no la repetimos
        const yaCubierta = D.indiceBusqueda.some(function (e) { return e.regex.test(n); });
        if (yaCubierta) return;
        if (/\d+\s*(anos?|meses)/.test(n)) return;                // es experiencia, no habilidad

        const nombre = limpia.charAt(0).toUpperCase() + limpia.slice(1);
        if (encontradas[nombre] || candidatas.some(function (c) { return c.nombre === nombre; })) return;

        candidatas.push({
          nombre: nombre,
          categoria: 'domain',
          nivel: 5,
          obligatoria: true,
          origen: 'frase',
          confianza: 'baja',
          enCatalogo: false,
          evidencia: 'Aparece en la lista: "' + recortar(linea.trim()) + '"'
        });
      });
    });

    return candidatas.slice(0, 8);   // máximo 8 propuestas, para no abrumar
  }


  // ==========================================================
  // FUNCIONES PRINCIPALES
  // ==========================================================

  // Ordena: primero las obligatorias, luego por nivel
  function ordenar(lista) {
    return lista.sort(function (a, b) {
      if (a.obligatoria !== b.obligatoria) return a.obligatoria ? -1 : 1;
      return b.nivel - a.nivel;
    });
  }

  function analizarVacante(texto) {
    texto = String(texto || '');
    const textoNorm = D.norm(texto);
    const advertencias = [];

    if (texto.trim().length < 20) {
      return { cargoDetectado: null, experienciaMin: null, modalidad: null, habilidades: [],
               advertencias: ['El texto es muy corto. Describe el cargo y lo que se necesita.'],
               resumen: 'No hay suficiente información para analizar.' };
    }

    const encontradas = extraerMencionadas(dividirEnFrases(texto), 5, true);
    const cargos = aplicarCargos(textoNorm, encontradas, false);
    const nuevas = proponerNuevas(texto, encontradas);

    let habilidades = ordenar(Object.keys(encontradas).map(function (k) { return encontradas[k]; }));
    habilidades = habilidades.concat(nuevas);

    const experienciaMin = detectarExperiencia(textoNorm);

    // --- Advertencias para el reclutador ---
    if (habilidades.length === 0) {
      advertencias.push('No reconocimos habilidades en el texto. Agrégalas manualmente o describe mejor las funciones del cargo.');
    }
    if (cargos.length > 0) {
      advertencias.push('Algunas habilidades se infirieron del cargo "' + cargos[0].nombre + '". Revísalas y quita las que no apliquen.');
    }
    if (nuevas.length > 0) {
      advertencias.push('Propusimos ' + nuevas.length + (nuevas.length === 1 ? ' habilidad nueva' : ' habilidades nuevas') +
                        ' que no estaban en el catálogo. Confirma las que sean correctas; se agregarán al catálogo al publicar.');
    }
    if (experienciaMin === null) {
      advertencias.push('No encontramos cuántos años de experiencia se piden. Indícalo en el formulario (puedes poner 0).');
    }

    return {
      cargoDetectado: cargos.length > 0 ? cargos[0].nombre : null,
      experienciaMin: experienciaMin,
      modalidad: detectarModalidad(textoNorm),
      habilidades: habilidades,
      advertencias: advertencias,
      resumen: 'Detectamos ' + habilidades.length + (habilidades.length === 1 ? ' habilidad' : ' habilidades') +
               (cargos.length > 0 ? ' para el cargo "' + cargos[0].nombre + '"' : '') + '. Revisa y ajusta antes de publicar.'
    };
  }

  function analizarPerfil(texto) {
    texto = String(texto || '');
    const textoNorm = D.norm(texto);
    const advertencias = [];

    if (texto.trim().length < 20) {
      return { experienciaAnios: null, habilidades: [],
               advertencias: ['El texto es muy corto. Cuéntanos qué has hecho y qué sabes hacer.'],
               resumen: 'No hay suficiente información para analizar.' };
    }

    // En perfiles, el nivel por defecto es 6 (la persona se describe a sí misma), y todo cuenta como "lo que tiene" (no hay obligatorias)
    const encontradas = extraerMencionadas(dividirEnFrases(texto), 6, false);
    const cargos = aplicarCargos(textoNorm, encontradas, true);
    const nuevas = proponerNuevas(texto, encontradas);

    let habilidades = Object.keys(encontradas).map(function (k) { return encontradas[k]; })
      .sort(function (a, b) { return b.nivel - a.nivel; });
    habilidades = habilidades.concat(nuevas);

    const experienciaAnios = detectarExperiencia(textoNorm);

    if (habilidades.length === 0) {
      advertencias.push('No reconocimos habilidades. Prueba con frases como "manejo Excel avanzado" o "trabajé 2 años en ventas".');
    }
    if (cargos.length > 0) {
      advertencias.push('Inferimos habilidades de tu experiencia como "' + cargos[0].nombre + '". Ajusta el nivel de cada una según tu dominio real.');
    }
    if (nuevas.length > 0) {
      advertencias.push('Hay ' + nuevas.length + (nuevas.length === 1 ? ' habilidad nueva' : ' habilidades nuevas') + ' que no conocíamos. Confirma las que quieras añadir.');
    }
    if (experienciaAnios === null) {
      advertencias.push('No vimos cuántos años de experiencia tienes. Puedes indicarlos en tu perfil.');
    }

    return {
      experienciaAnios: experienciaAnios,
      habilidades: habilidades,
      advertencias: advertencias,
      resumen: 'Detectamos ' + habilidades.length + (habilidades.length === 1 ? ' habilidad' : ' habilidades') + ' en tu descripción. Revisa los niveles antes de guardarlas.'
    };
  }

  global.Analisis = {
    analizarVacante: analizarVacante,
    analizarPerfil: analizarPerfil
  };

})(window);
