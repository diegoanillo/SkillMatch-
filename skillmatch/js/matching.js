/* ============================================================
   matching.js  →  EL MOTOR DE COMPATIBILIDAD, VERSIÓN 2 (RF-02)
   ============================================================
   Responde la pregunta central de SkillMatch:
       "¿Qué tan compatible es ESTA persona con ESTA oferta?"

   Novedades de la versión 2 (respecto a la 1):
     1. Habilidades ABIERTAS: funciona con cualquier habilidad, aunque
        no esté en el catálogo (la oferta puede pedir "limpieza" o
        "manejo de montacargas" y el motor igual la evalúa).
     2. SINÓNIMOS: "MS Excel" y "Excel" cuentan como la misma habilidad
        (usa diccionario.js).
     3. AFINIDAD: si no hay una relación escrita entre dos habilidades
        pero son de la misma "familia" (ej: Limpieza y Manejo de
        residuos), igual se reconoce una cercanía moderada.
     4. DOS NÚMEROS, no uno: "lo que cumples hoy" y "tu potencial".
        El porcentaje final mezcla ambos (ver PESO_POTENCIAL).
     5. EXPERIENCIA: una penalización suave si faltan años (y
        configurable: ponla en 0 si no quieres que cuente).
     6. EXPLICACIONES en español para cada habilidad.

   ------------------------------------------------------------
   CÓMO PIENSA, PARA CADA HABILIDAD QUE PIDE LA OFERTA
   ------------------------------------------------------------
     1. Nivel que la persona tiene DIRECTAMENTE (SQL 3 de 10).
     2. Nivel que podría APORTAR otra habilidad suya:
          nivel de origen × fuerza  (Excel 8 × 0,7 hacia Power BI = 5,6)
     3. Compara contra el nivel pedido:
          crédito actual    = nivel directo   ÷ nivel pedido
          crédito potencial = mejor de (1, 2) ÷ nivel pedido
     4. Promedia (obligatorias pesan el doble) y mezcla:
          base = actual × (1 − PESO_POTENCIAL) + potencial × PESO_POTENCIAL
     5. Si faltan años de experiencia, multiplica por un factor
        levemente menor a 1.

   Todas son "funciones puras": reciben datos y devuelven un
   resultado, sin tocar la pantalla ni guardar nada. Por eso son
   fáciles de probar y de reemplazar por el algoritmo del backend.
   ============================================================ */

(function (global) {
  'use strict';

  // ==========================================================
  // AJUSTES (los "botones de afinación" del algoritmo)
  // ----------------------------------------------------------
  // Están en un objeto para poder cambiarlos en vivo desde
  // probador.html y ver cómo reaccionan los porcentajes.
  // ==========================================================
  const CONFIG = {
    PESO_OBLIGATORIA: 2,       // una habilidad obligatoria pesa el doble...
    PESO_OPCIONAL: 1,          // ...que una opcional

    PESO_POTENCIAL: 0.4,       // 0 = solo cuenta lo que ya sabes · 1 = solo el potencial

    AFINIDAD_FUERZA: 0.4,      // cercanía entre habilidades de la misma familia
    AFINIDAD_SEMANAS: 4,       // semanas típicas para pasar de una a otra

    UMBRAL_CERCA: 0.6,         // desde 60 % del nivel pedido se considera "cerca"

    PENALIZ_POR_ANIO: 0.03,    // cada año de experiencia faltante resta 3 %...
    PENALIZ_MAXIMA: 0.10,      // ...hasta un máximo de 10 % (0 en ambas = ignorar experiencia)

    SEMANAS_DESDE_CERO: 10,    // semanas para aprender algo sin ninguna base

    LIMITE_ALTA: 75,           // 75 % o más = compatibilidad alta
    LIMITE_MEDIA: 55           // 55 % a 74 % = media; menos = baja
  };


  // ==========================================================
  // UTILIDADES
  // ==========================================================

  // Quita tildes y mayúsculas para comparar textos
  function norm(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  // "Clave" de una habilidad: su nombre oficial normalizado.
  // clave('MS Excel') === clave('excel')  →  true
  // Si el Diccionario no está cargado, solo normaliza el texto.
  function clave(nombre) {
    const oficial = global.Diccionario ? global.Diccionario.canonico(nombre) : nombre;
    return norm(oficial);
  }

  function comparteFamilia(a, b) {
    return global.Diccionario ? global.Diccionario.comparteFamilia(a, b) : false;
  }

  function redondear(n, decimales) {
    const f = Math.pow(10, decimales || 0);
    return Math.round(n * f) / f;
  }


  // ==========================================================
  // NIVELES
  // ==========================================================

  // Nivel que la persona tiene DIRECTAMENTE (0 si no la tiene)
  function nivelDirecto(nombre, habilidades) {
    const k = clave(nombre);
    const encontrada = habilidades.find(function (h) { return clave(h.nombre) === k; });
    return encontrada ? encontrada.nivel : 0;
  }

  // Nivel EFECTIVO: el mejor entre lo que tiene directo y lo que
  // le aporta otra habilidad (por transferencia escrita o por afinidad).
  // Devuelve { valor, via, directo }
  //   via = { de, a, fuerza, semanas, tipo: 'transferencia' | 'afinidad' } o null
  function nivelEfectivo(nombre, habilidades, transferencias) {
    const k = clave(nombre);
    const directo = nivelDirecto(nombre, habilidades);
    let mejor = { valor: directo, via: null, directo: directo, camino: null };

    // "camino" = el aprendizaje previo MÁS CORTO que existe para esta habilidad (en semanas),
    // aunque ya la tengas por encima de lo que ese camino aportaría. Sirve para estimar el
    // tiempo que falta (ver semanasParaCerrar). Como solo depende de qué habilidades tienes
    // (no de qué nivel), mejorar un nivel nunca lo empeora.
    function considerarCamino(semanas) {
      if (mejor.camino === null || semanas < mejor.camino) mejor.camino = semanas;
    }

    // --- A) Relaciones escritas en el grafo (transferencias) ---
    transferencias.forEach(function (t) {
      if (clave(t.a) !== k) return;                         // solo las que llegan a esta habilidad
      const nivelOrigen = nivelDirecto(t.de, habilidades);  // ¿tiene la de origen?
      if (nivelOrigen === 0) return;

      considerarCamino(t.semanas);
      const aporte = nivelOrigen * t.fuerza;
      if (aporte > mejor.valor) {
        mejor = { valor: aporte, directo: directo, camino: mejor.camino,
                  via: { de: t.de, a: nombre, fuerza: t.fuerza, semanas: t.semanas, tipo: 'transferencia' } };
      }
    });

    // --- B) Afinidad por familia (no hay relación escrita, pero se parecen) ---
    habilidades.forEach(function (h) {
      if (clave(h.nombre) === k || h.nivel <= 0) return;
      if (!comparteFamilia(h.nombre, nombre)) return;

      considerarCamino(CONFIG.AFINIDAD_SEMANAS);
      const aporte = h.nivel * CONFIG.AFINIDAD_FUERZA;
      if (aporte > mejor.valor) {
        mejor = { valor: aporte, directo: directo, camino: mejor.camino,
                  via: { de: h.nombre, a: nombre, fuerza: CONFIG.AFINIDAD_FUERZA, semanas: CONFIG.AFINIDAD_SEMANAS, tipo: 'afinidad' } };
      }
    });

    return mejor;
  }

  // Semanas estimadas para cerrar la distancia (heurística de práctica:
  // el modelo real del backend la reemplazará).
  //   - Parte del camino de aprendizaje más corto que existe para esa habilidad
  //     (o SEMANAS_DESDE_CERO si la persona no tiene nada relacionado).
  //   - Cuanto más lejos esté la persona, más de ese tiempo necesita.
  // GARANTÍA: mejorar cualquier nivel NUNCA aumenta el tiempo estimado. (Una versión
  // anterior olvidaba el camino corto cuando el nivel directo lo superaba, y el tiempo
  // subía justo cuando la persona avanzaba. Ver la prueba de monotonía.)
  function semanasParaCerrar(nivelRequerido, valorEfectivo, camino) {
    if (valorEfectivo >= nivelRequerido) return 0;
    // Base: el camino de aprendizaje más corto que existe (o, sin ninguno, aprender desde cero)
    const base = camino !== null && camino !== undefined ? Math.min(camino, CONFIG.SEMANAS_DESDE_CERO) : CONFIG.SEMANAS_DESDE_CERO;
    const faltante = (nivelRequerido - valorEfectivo) / nivelRequerido;   // 0 a 1
    return Math.max(1, Math.ceil(base * (0.4 + 0.6 * faltante)));
  }


  // ==========================================================
  // EXPLICACIÓN EN ESPAÑOL (la "IA explicable")
  // ==========================================================
  // "tercera" = true cuando el texto lo lee OTRA persona (un reclutador mirando a un candidato):
  // "Tiene SQL en nivel 3" en lugar de "Tienes SQL en nivel 3".
  function explicar(d, tercera) {
    const n = d.nombre;
    const tiene = tercera ? 'Tiene ' : 'Tienes ';
    if (d.estado === 'cumple') {
      return tiene + n + ' en nivel ' + d.nivelUsuario + ' y se pide ' + d.nivelRequerido + '.';
    }
    if (d.estado === 'parcial') {
      return tiene + n + ' en nivel ' + d.nivelUsuario + ', cerca del ' + d.nivelRequerido + ' que se pide.';
    }
    if (d.via) {
      const origen = d.via.de;
      if (d.via.tipo === 'afinidad') {
        return (tercera ? 'Su experiencia en ' : 'Tu experiencia en ') + origen + ' es del mismo campo que ' + n + ': ' +
               (tercera ? 'tiene una base para aprenderla' : 'tienes una base para aprenderla') + ' en unas ' + d.semanas + ' semanas.';
      }
      return (tercera ? 'Su ' : 'Tu ') + origen + ' se transfiere a ' + n + ': ' + (tercera ? 'podría' : 'podrías') + ' cerrar la distancia en unas ' + d.semanas + ' semanas.';
    }
    if (d.nivelUsuario > 0) {
      return tiene + n + ' en nivel ' + d.nivelUsuario + ', lejos del ' + d.nivelRequerido + ' que se pide.';
    }
    return tercera ? 'No tiene ' + n + ' registrada y ninguna de sus habilidades se le acerca todavía.'
                   : 'No tienes ' + n + ' registrada y ninguna de tus habilidades se le acerca todavía.';
  }


  // ==========================================================
  // FUNCIÓN PRINCIPAL
  //   habilidades    → las del usuario:  [{ nombre, nivel }]
  //   requisitos     → las de la oferta: [{ nombre, nivel, obligatoria }]
  //   transferencias → el grafo:         [{ de, a, fuerza, semanas }]
  //   opciones       → (opcional) { experienciaAnios, experienciaMin, tercera }
  //                    tercera = true redacta las explicaciones sobre la persona ("Tiene...")
  //
  // Devuelve:
  //   puntaje          → 0 a 100, el porcentaje que se muestra
  //   puntajeActual    → 0 a 100, lo que cumples HOY
  //   puntajePotencial → 0 a 100, contando lo que podrías aprender
  //   nivel            → 'alta' | 'media' | 'baja'
  //   desglose         → una fila por habilidad pedida, con explicación
  //   brechas          → habilidades lejanas (estado 'brecha')
  //   porMejorar       → habilidades cercanas ('parcial' y 'transferible')
  //   semanas          → tiempo total estimado para cerrar brechas y mejoras
  //   aniosFaltantes, factorExperiencia, resumen
  //
  // Estados de cada habilidad (campo "estado"):
  //   cumple       → ya tiene el nivel pedido
  //   parcial      → la tiene y está cerca del nivel pedido
  //   transferible → no la domina, pero otra habilidad suya la acerca
  //   brecha       → está lejos: hay que aprenderla
  // ==========================================================
  function calcular(habilidades, requisitos, transferencias, opciones) {
    opciones = opciones || {};
    let sumaActual = 0;
    let sumaPotencial = 0;
    let sumaPesos = 0;

    const desglose = requisitos.map(function (req) {
      const ef = nivelEfectivo(req.nombre, habilidades, transferencias || []);
      const obligatoria = req.obligatoria !== false;

      const creditoActual = Math.min(1, ef.directo / req.nivel);
      const creditoPotencial = Math.min(1, ef.valor / req.nivel);
      const peso = obligatoria ? CONFIG.PESO_OBLIGATORIA : CONFIG.PESO_OPCIONAL;

      sumaActual += creditoActual * peso;
      sumaPotencial += creditoPotencial * peso;
      sumaPesos += peso;

      // Clasificación en uno de 4 estados
      let estado;
      if (ef.directo >= req.nivel)                                   estado = 'cumple';
      else if (ef.directo >= CONFIG.UMBRAL_CERCA * req.nivel)        estado = 'parcial';
      else if (ef.via && ef.valor >= CONFIG.UMBRAL_CERCA * req.nivel) estado = 'transferible';
      else                                                           estado = 'brecha';

      const via = ef.via && ef.valor > ef.directo ? ef.via : null;
      const fila = {
        nombre: global.Diccionario ? global.Diccionario.canonico(req.nombre) : req.nombre,
        obligatoria: obligatoria,
        nivelRequerido: req.nivel,
        nivelUsuario: ef.directo,
        nivelEfectivo: redondear(ef.valor, 1),
        creditoActual: creditoActual,
        creditoPotencial: creditoPotencial,
        credito: creditoActual * (1 - CONFIG.PESO_POTENCIAL) + creditoPotencial * CONFIG.PESO_POTENCIAL,
        estado: estado,
        via: via,
        semanas: semanasParaCerrar(req.nivel, ef.valor, ef.camino)
      };
      fila.explicacion = explicar(fila, !!opciones.tercera);
      return fila;
    });

    // --- Promedios ponderados (0 a 1) ---
    const actual = sumaPesos === 0 ? 0 : sumaActual / sumaPesos;
    const potencial = sumaPesos === 0 ? 0 : sumaPotencial / sumaPesos;
    const base = actual * (1 - CONFIG.PESO_POTENCIAL) + potencial * CONFIG.PESO_POTENCIAL;

    // --- Penalización suave por experiencia ---
    let aniosFaltantes = 0;
    if (typeof opciones.experienciaMin === 'number' && typeof opciones.experienciaAnios === 'number') {
      aniosFaltantes = Math.max(0, opciones.experienciaMin - opciones.experienciaAnios);
    }
    const penalizacion = Math.min(aniosFaltantes * CONFIG.PENALIZ_POR_ANIO, CONFIG.PENALIZ_MAXIMA);
    const factorExperiencia = 1 - penalizacion;

    const puntaje = Math.round(base * factorExperiencia * 100);

    // --- Listas útiles para las pantallas ---
    const brechas = desglose.filter(function (d) { return d.estado === 'brecha'; });
    const porMejorar = desglose.filter(function (d) { return d.estado === 'parcial' || d.estado === 'transferible'; });
    const cumplidas = desglose.filter(function (d) { return d.estado === 'cumple'; });
    const semanas = desglose.reduce(function (total, d) { return total + d.semanas; }, 0);

    return {
      puntaje: puntaje,
      puntajeActual: Math.round(actual * 100),
      puntajePotencial: Math.round(potencial * 100),
      nivel: nivelDePuntaje(puntaje),
      desglose: desglose,
      brechas: brechas,
      porMejorar: porMejorar,
      semanas: semanas,
      aniosFaltantes: aniosFaltantes,
      factorExperiencia: redondear(factorExperiencia, 2),
      resumen: redactarResumen(desglose.length, cumplidas.length, porMejorar.length, brechas.length, semanas, !!opciones.tercera)
    };
  }

  // Una frase que resume el resultado
  function redactarResumen(total, cumple, mejorar, brechas, semanas, tercera) {
    if (total === 0) return 'Esta oferta no tiene habilidades registradas todavía.';
    if (cumple === total) return (tercera ? 'Cumple' : 'Cumples') + ' todos los requisitos de esta oferta.';
    let texto = (tercera ? 'Cumple ' : 'Cumples ') + cumple + ' de ' + total + ' habilidades.';
    if (mejorar > 0) texto += ' ' + mejorar + (mejorar === 1 ? ' está' : ' están') + ' cerca de lograrse.';
    if (brechas > 0) texto += ' ' + brechas + (brechas === 1 ? ' requiere' : ' requieren') + ' aprendizaje nuevo.';
    return texto + (tercera ? ' Tiempo estimado para ponerse al día: ' : ' Tiempo estimado para ponerte al día: ') + semanas + ' semanas.';
  }

  // 75 o más = alta · 55 a 74 = media · menos de 55 = baja
  function nivelDePuntaje(puntaje) {
    if (puntaje >= CONFIG.LIMITE_ALTA) return 'alta';
    if (puntaje >= CONFIG.LIMITE_MEDIA) return 'media';
    return 'baja';
  }


  // ==========================================================
  // RANKINGS (los usan las pantallas de empleos y de candidatos)
  // ==========================================================

  // ASPIRANTE: ordena las ofertas de mayor a menor compatibilidad.
  //   perfil  → { habilidades, experienciaAnios }
  //   empleos → lista de ofertas (con .habilidades y .experienciaMin)
  function rankearEmpleos(perfil, empleos, transferencias) {
    return empleos
      .map(function (empleo) {
        const r = calcular(perfil.habilidades, empleo.habilidades, transferencias, {
          experienciaAnios: perfil.experienciaAnios,
          experienciaMin: empleo.experienciaMin
        });
        return { empleo: empleo, resultado: r };
      })
      .sort(function (a, b) { return b.resultado.puntaje - a.resultado.puntaje; });
  }

  // RECLUTADOR: ordena a los candidatos para UNA oferta.
  //   candidatos → [{ id, nombre, perfil: { habilidades, experienciaAnios } }]
  function rankearCandidatos(empleo, candidatos, transferencias) {
    return candidatos
      .map(function (c) {
        const r = calcular(c.perfil.habilidades, empleo.habilidades, transferencias, {
          experienciaAnios: c.perfil.experienciaAnios,
          experienciaMin: empleo.experienciaMin
        });
        return { candidato: c, resultado: r };
      })
      .sort(function (a, b) { return b.resultado.puntaje - a.resultado.puntaje; });
  }

  // Exponemos lo que otros archivos pueden usar: Matching.calcular(...)
  global.Matching = {
    CONFIG: CONFIG,
    norm: norm,
    nivelEfectivo: nivelEfectivo,
    calcular: calcular,
    nivelDePuntaje: nivelDePuntaje,
    rankearEmpleos: rankearEmpleos,
    rankearCandidatos: rankearCandidatos
  };

})(window);
