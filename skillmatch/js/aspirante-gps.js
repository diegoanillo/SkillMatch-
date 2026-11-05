/* ============================================================
   aspirante-gps.js  →  LA VISTA "CAREER GPS" (RF-03)
   ============================================================
   Muestra el camino desde donde la persona está hoy hasta su meta
   profesional, como un GPS, y SE MUEVE cuando ella avanza:

     1. Las RUTAS alternativas, comparadas. Puede mirarlas todas y
        elegir una como su META.
     2. Un RESUMEN: pasos alcanzados, PROGRESO hacia la meta (con una
        barra que crece) y fecha estimada de llegada.
     3. Un aviso "¡AVANZASTE!" cuando, desde su última visita, subió su
        progreso o alcanzó un paso (por ejemplo, al completar un curso).
     4. Su SIGUIENTE ACCIÓN: el recurso que más le conviene ahora.
     5. La LÍNEA DE TIEMPO: posición actual → pasos → meta. Un tramo
        coloreado de la línea y un punto "Estás aquí" muestran dónde va;
        cada paso tiene su propia barra de progreso.

   CÓMO SE "SIENTE" EL AVANCE
   La vista recuerda, para cada ruta, cómo la vio la última vez
   (localStorage, por usuario). Al volver, dibuja primero el punto de
   partida VIEJO y enseguida el NUEVO: el navegador anima la diferencia
   (la línea se llena, la barra crece). Lo que se anima siempre es
   lo que cambió desde la última vez que la persona miró.

   Los cálculos los hace gps.js (CareerGPS) y recomendador.js. Esta vista
   solo los DIBUJA. Para cambiar algo le pide a Api y llama Aspirante.recargar().
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'gps-contenido';

  // La ruta que se está MIRANDO (puede ser distinta de la meta guardada).
  // null = la meta guardada o, si no hay, la sugerida.
  const local = {
    rutaVista: null,
    avance: null       // aviso "¡Avanzaste!" pendiente de cerrar: { rutaId, de, a, semanasAntes, semanasAhora, pasosNuevos }
  };
  let ultimoEstado = null;


  // ============================================================
  // 1. LO QUE LA PERSONA VIO LA ÚLTIMA VEZ
  // ------------------------------------------------------------
  // Se guarda por usuario y por ruta. Sirve para animar desde ahí y
  // para detectar cuánto avanzó entre una visita y otra.
  // ============================================================
  const CLAVE_VISTO = 'skillmatch_gps_visto_';

  function leerVisto(est) {
    try { return JSON.parse(localStorage.getItem(CLAVE_VISTO + est.sesion.id)) || {}; } catch (e) { return {}; }
  }
  function guardarVisto(est, mapa) {
    try { localStorage.setItem(CLAVE_VISTO + est.sesion.id, JSON.stringify(mapa)); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  // Una "foto" del estado de una ruta (lo que se guarda como "visto")
  function foto(g) {
    return {
      progreso: g.meta.progreso,
      posicion: g.posicion,
      semanas: g.meta.semanas,
      listos: g.pasos.filter(function (p) { return p.estado === 'listo'; }).map(function (p) { return p.indice; }),
      pasos: g.pasos.map(function (p) { return p.progreso; })
    };
  }

  // ¿Avanzó desde la última vez? Devuelve los datos del aviso, o null si no.
  function detectarAvance(previo, g) {
    const nuevos = g.pasos.filter(function (p) { return p.estado === 'listo' && previo.listos.indexOf(p.indice) < 0; })
      .map(function (p) { return p.rol; });
    if (g.meta.progreso <= previo.progreso && nuevos.length === 0) return null;
    return { de: previo.progreso, a: g.meta.progreso, semanasAntes: previo.semanas, semanasAhora: g.meta.semanas, pasosNuevos: nuevos };
  }


  // ============================================================
  // 2. AYUDAS DE TEXTO Y DE DIBUJO
  // ============================================================
  function textoLlegada(fecha) {
    return fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  function limitar(n) { return Math.max(0, Math.min(1, n)); }

  // La pastilla de una habilidad dentro de un paso, según qué tan cerca está la persona
  function chipRequisito(d) {
    if (d.estado === 'cumple')       return '<span class="chip chip-match">' + esc(d.nombre) + ' ✓</span>';
    if (d.estado === 'transferible') return '<span class="chip chip-match" title="Tu ' + esc(d.via.de) + ' te acerca a ' + esc(d.nombre) + '">' + esc(d.via.de) + ' → ' + esc(d.nombre) + '</span>';
    if (d.estado === 'parcial')      return '<span class="chip chip-mid">' + esc(d.nombre) + ' ' + d.nivelUsuario + '/' + d.nivelRequerido + '</span>';
    return '<span class="chip chip-gap">' + (d.nivelUsuario > 0 ? esc(d.nombre) + ' ' + d.nivelUsuario + '/' + d.nivelRequerido : 'Falta ' + esc(d.nombre)) + '</span>';
  }

  const ICONO_CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICONO_AVANCE = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Una barra que CRECE: se dibuja con el ancho de "antes" y el dibujo la lleva
  // al ancho final (data-ancho). Ver animar().
  function htmlBarra(desde, hasta, clase) {
    return '<div class="bar-track"><div class="bar-fill' + (clase || '') + '" style="width:' + desde + '%" data-ancho="' + hasta + '"></div></div>';
  }


  // ============================================================
  // 3. BLOQUES DE LA VISTA
  // ============================================================

  // Las rutas alternativas como tarjetas que se pueden pulsar para mirarlas
  function htmlRutas(est, comparacion, idVista) {
    const metaId = est.perfil.rutaMetaId;
    const sugeridaId = comparacion[0].ruta.id;

    return '<div class="panel"><h2>Rutas posibles</h2>' +
      '<p class="panel-sub">Calculadas con tus habilidades de hoy, de la más corta a la más larga. Pulsa una para verla.</p>' +
      '<div class="rutas-grid">' + comparacion.map(function (c) {
        const esMeta = c.ruta.id === metaId;
        const marca = esMeta ? '<span class="chip chip-match">Tu meta</span>'
                    : (!metaId && c.ruta.id === sugeridaId ? '<span class="chip chip-mid">Sugerida</span>' : '');
        return '<button type="button" class="ruta-card" data-accion="ver-ruta" data-id="' + esc(c.ruta.id) + '" aria-pressed="' + (c.ruta.id === idVista) + '">' +
          '<span class="ruta-card-top"><span class="ruta-card-titulo">' + esc(c.ruta.titulo) + '</span>' + marca + '</span>' +
          '<span class="ruta-card-desc">' + esc(c.ruta.descripcion) + '</span>' +
          '<span class="ruta-card-meta">' + c.progreso + ' % de progreso · ' + c.pasosListos + ' de ' + c.pasosTotal + ' pasos · ' +
            (c.completa ? 'Ya la cumples' : esc(Comun.formatearSemanas(c.semanas)) + ' hasta la meta') + '</span>' +
        '</button>';
      }).join('') + '</div></div>';
  }

  // El aviso "¡Avanzaste!" (queda hasta que la persona lo cierre)
  function htmlAvance(av, titulo) {
    if (!av) return '';
    const puntos = av.a - av.de;
    const semanas = av.semanasAhora < av.semanasAntes
      ? 'Te faltan ≈ ' + esc(Comun.formatearSemanas(av.semanasAhora)) + ' (antes ≈ ' + esc(Comun.formatearSemanas(av.semanasAntes)) + ').'
      : (av.semanasAhora > 0 ? 'Te faltan ≈ ' + esc(Comun.formatearSemanas(av.semanasAhora)) + '.' : '');

    return '<div class="panel gps-avance" role="status">' +
      '<span class="gps-avance-icono" aria-hidden="true">' + ICONO_AVANCE + '</span>' +
      '<div class="gps-avance-texto"><h2>¡Avanzaste en tu ruta!</h2>' +
        (puntos > 0 ? '<p>Tu progreso hacia «' + esc(titulo) + '» pasó de <strong>' + av.de + ' %</strong> a <strong>' + av.a + ' %</strong> (+' + puntos + ' puntos). ' + semanas + '</p>' : '') +
        av.pasosNuevos.map(function (rol) { return '<p>🎉 ¡Alcanzaste el paso «' + esc(rol) + '»!</p>'; }).join('') +
      '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-accion="cerrar-avance">Entendido</button>' +
    '</div>';
  }

  function htmlResumen(est, g, desde) {
    const esMeta = est.perfil.rutaMetaId === g.ruta.id;
    const m = g.meta;
    const av = local.avance && local.avance.rutaId === g.ruta.id ? local.avance : null;

    return '<div class="stat-strip">' +
      '<div class="stat-cell"><span class="stat-value">' + g.pasosListos + ' <small>de ' + g.pasos.length + '</small></span><span class="stat-label">Pasos alcanzados</span></div>' +
      '<div class="stat-cell"><span class="stat-value">' + m.progreso + '<small>%</small></span><span class="stat-label">Progreso hacia la meta</span></div>' +
      '<div class="stat-cell"><span class="stat-value stat-value--texto">' + (g.completa ? '¡Llegaste!' : esc(textoLlegada(m.fechaLlegada))) + '</span>' +
        '<span class="stat-label">' + (g.completa ? 'Cumples todos los pasos' : 'Llegada estimada (en ' + esc(Comun.formatearSemanas(m.semanas)) + ')') + '</span></div>' +
    '</div>' +

    // Barra de progreso: crece desde donde estaba la última vez
    '<div class="gps-progreso" aria-label="Progreso hacia la meta: ' + m.progreso + ' por ciento">' +
      '<div class="gps-progreso-top"><span>Progreso hacia tu meta</span>' +
        '<span>' + (av && av.a > av.de ? '<span class="chip chip-match gps-delta">+' + (av.a - av.de) + '</span> ' : '') + '<strong>' + m.progreso + ' %</strong></span></div>' +
      htmlBarra(desde.progreso, m.progreso) +
    '</div>' +

    '<div class="gps-barra">' +
      '<p class="gps-barra-texto"><strong>' + esc(g.ruta.titulo) + '.</strong> ' + (esMeta ? 'Esta es tu meta actual.' : 'Aún no es tu meta.') +
        ' El progreso mide cuánto de lo que pide la ruta cumples hoy. Las semanas son estimaciones de práctica que asumen dedicación constante; todo se actualiza solo cuando mejoras tus habilidades.</p>' +
      (esMeta ? '' : '<button type="button" class="btn btn-primary btn-sm" data-accion="meta" data-id="' + esc(g.ruta.id) + '">Establecer como mi meta</button>') +
    '</div>';
  }

  // La siguiente acción: el recurso que más conviene para el paso actual
  function htmlSiguienteAccion(est, g) {
    if (g.completa) {
      return '<div class="panel gps-siguiente"><h2>Tu siguiente acción</h2>' +
             '<p class="gps-vacio">Ya cumples todos los requisitos de esta ruta. Puedes elegir otra ruta arriba o postularte a ofertas en <a href="#empleos">Buscar empleos</a>.</p></div>';
    }

    // Solo las necesidades del paso actual (sin oferta de referencia)
    const necesidades = Recomendador.necesidades(null, g.pasoActual);
    const ranking = Recomendador.evaluar(est.cursos, est.perfil, necesidades, null, est.transferencias)
      .filter(function (f) { return f.relevancia > 0 && f.estado !== 'completado'; });
    // Si ya hay uno en curso, ese es el siguiente; si no, el más relevante
    const fila = ranking.find(function (f) { return f.estado === 'en_curso'; }) || ranking[0];

    if (!fila) {
      return '<div class="panel gps-siguiente"><h2>Tu siguiente acción</h2>' +
             '<p class="gps-vacio">Todavía no tenemos recursos para las brechas de este paso. Practica con un proyecto propio y registra tus avances en <a href="#perfil">Mi perfil</a>.</p></div>';
    }

    const r = fila.recurso;
    const mejoras = fila.mejoras.map(function (m) {
      return '<span class="chip chip-neutral">' + esc(m.nombre) + ' ' + m.antes + ' → ' + m.despues + '</span>';
    }).join('');

    return '<div class="panel gps-siguiente"><h2>Tu siguiente acción</h2>' +
      '<p class="panel-sub">Para avanzar en «' + esc(g.pasoActual.rol) + '», esto es lo que más te conviene hacer ahora.</p>' +
      '<div class="gps-accion">' +
        '<div class="gps-accion-info"><p class="reco-titulo"><span class="chip chip-neutral">' + esc(r.tipo) + '</span> ' + esc(r.titulo) + '</p>' +
          '<p class="reco-meta">' + r.horas + ' horas' + (fila.motivos.length ? ' · ' + esc(fila.motivos[0]) : '') + '</p>' +
          '<div class="reco-mejoras">' + mejoras + '</div></div>' +
        '<div class="gps-accion-botones">' +
          (fila.estado === 'en_curso'
            ? '<span class="chip chip-mid">En curso</span><a class="btn btn-secondary btn-sm" href="#recomendaciones">Ver en Recomendaciones</a>'
            : '<button type="button" class="btn btn-primary btn-sm" data-accion="empezar" data-id="' + esc(r.id) + '">Empezar</button>' +
              '<a class="btn btn-secondary btn-sm" href="#recomendaciones">Ver todas</a>') +
        '</div>' +
      '</div></div>';
  }


  // ============================================================
  // 4. LA LÍNEA DE TIEMPO (lo que se mueve)
  // ------------------------------------------------------------
  // La línea se dibuja en TRAMOS: cada punto de la ruta tiene un tramo
  // que baja hasta el siguiente. Cada tramo tiene una variable CSS
  //     --fill  (de 0 a 1) = qué parte del tramo está coloreada
  // y el CSS la anima cuando cambia. El punto "Estás aquí" va dentro
  // del tramo donde está la persona y comparte esa misma variable.
  //
  //   posición 0.35 en una ruta de 2 pasos  →  0.35 × 2 = 0.7
  //   → el tramo 0 está lleno al 70 %, el tramo 1 vacío.
  // ============================================================
  function abrirWaypoint(idx, estadoVisual, g, desde, k) {
    const n = g.pasos.length;
    let atributos = ' data-status="' + estadoVisual + '"';
    let pin = '';

    if (idx < n) {   // el último punto (la meta) no tiene tramo hacia abajo
      const llenoFin = limitar(g.posicion * n - idx);
      const llenoIni = limitar(desde.posicion * n - idx);
      const primerMovido = Math.floor(desde.posicion * n + 1e-9);
      // Los tramos se llenan de arriba hacia abajo, uno tras otro (efecto de "recorrer" la ruta)
      const retraso = idx >= primerMovido ? (idx - primerMovido) * 0.45 : 0;
      atributos += ' data-fill="' + llenoFin.toFixed(3) + '" style="--fill:' + llenoIni.toFixed(3) + ';--retraso:' + retraso.toFixed(2) + 's"';
    }
    if (idx === k) pin = '<span class="route-pin" role="img" aria-label="Estás aquí" title="Estás aquí"></span>';
    return '<div class="waypoint"' + atributos + '>' + pin;
  }

  function htmlPaso(g, paso, desde, k) {
    const estadoVisual = { listo: 'done', actual: 'current', pendiente: 'upcoming' }[paso.estado];
    const r = paso.resultado;

    const etiqueta = paso.estado === 'listo' ? '<span class="chip chip-match">Alcanzado</span>'
                   : (paso.estado === 'actual' ? '<span class="chip chip-mid">Siguiente paso</span>' : '<span class="chip chip-neutral">Más adelante</span>');
    const duracion = paso.estado === 'listo' ? 'Alcanzado' : 'Estimado: ' + esc(Comun.formatearSemanas(r.semanas));
    const antes = desde.pasos && desde.pasos[paso.indice] !== undefined ? desde.pasos[paso.indice] : paso.progreso;

    return abrirWaypoint(paso.indice + 1, estadoVisual, g, desde, k) +
      '<span class="waypoint-marker">' + (paso.estado === 'listo' ? ICONO_CHECK : '') + '</span>' +
      '<div class="waypoint-card">' +
        '<div class="waypoint-top"><span class="waypoint-role">' + esc(paso.rol) + '</span><span class="waypoint-duration">' + duracion + '</span></div>' +
        '<div class="waypoint-estado">' + etiqueta + '<span class="waypoint-compat">' + r.puntaje + ' % de compatibilidad</span></div>' +
        '<p class="waypoint-desc">' + esc(paso.descripcion) + '</p>' +
        // Progreso de ESTE paso: sube cuando mejoras las habilidades que pide
        '<div class="waypoint-prog"><span class="waypoint-prog-texto">' + (paso.estado === 'listo' ? 'Cumplido' : paso.progreso + ' % cumplido') + '</span>' +
          htmlBarra(antes, paso.progreso, paso.estado === 'listo' ? '' : ' bar-fill--mid') + '</div>' +
        '<div class="waypoint-skills">' + r.desglose.map(chipRequisito).join('') + '</div>' +
        (paso.estado === 'actual' ? '<p class="waypoint-link"><a href="#recomendaciones">Ver recursos para este paso →</a></p>' : '') +
      '</div>' +
    '</div>';
  }

  function htmlLineaDeTiempo(g, desde) {
    const n = g.pasos.length;
    // Tramo donde está el punto "Estás aquí" (si ya llegó, el último)
    const k = Math.min(n - 1, Math.floor(g.posicion * n + 1e-9));

    const inicio = abrirWaypoint(0, 'done', g, desde, k) +
      '<span class="waypoint-marker">' + ICONO_CHECK + '</span>' +
      '<div class="waypoint-card">' +
        '<div class="waypoint-top"><span class="waypoint-role">' + esc(g.inicio.titulo) + '</span><span class="waypoint-duration">Posición actual</span></div>' +
        '<p class="waypoint-desc">Tu punto de partida, según tu perfil y las habilidades que más sirven para esta ruta.</p>' +
        '<div class="waypoint-skills">' + (g.inicio.habilidades.length
          ? g.inicio.habilidades.map(function (h) { return '<span class="chip chip-neutral">' + esc(h.nombre) + ' ' + h.nivel + '</span>'; }).join('')
          : '<span class="chip chip-neutral">Aún no registras habilidades</span>') + '</div>' +
      '</div></div>';

    return '<div class="panel"><div class="gps-linea-titulo"><h2>Tu ruta paso a paso</h2><span class="gps-leyenda"><span class="gps-leyenda-punto"></span> Estás aquí</span></div>' +
      '<p class="panel-sub">La línea se colorea a medida que avanzas. Cada paso muestra qué ya cumples, qué está cerca y qué te falta.</p>' +
      '<div class="route">' + inicio + g.pasos.map(function (p) { return htmlPaso(g, p, desde, k); }).join('') + '</div></div>';
  }


  // ============================================================
  // 5. ANIMAR
  // ------------------------------------------------------------
  // El HTML se dibuja con los valores de ANTES (--fill y width). Un
  // instante después (dos "cuadros" de pantalla, para que el navegador
  // ya haya pintado el estado inicial) se ponen los valores FINALES, y
  // el CSS (transition) anima la diferencia.
  // Si no hay diferencia (antes = después) no se nota nada: no hay animación.
  // ============================================================
  function animar(cont) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cont.querySelectorAll('[data-fill]').forEach(function (el) { el.style.setProperty('--fill', el.dataset.fill); });
        cont.querySelectorAll('[data-ancho]').forEach(function (el) { el.style.width = el.dataset.ancho + '%'; });
      });
    });
  }


  // ============================================================
  // 6. DIBUJAR LA VISTA
  // ============================================================
  function dibujar(est) {
    ultimoEstado = est;
    const cont = $(CONTENEDOR);
    const focoAntes = UI.recordarFoco(cont);

    if (est.rutas.length === 0) {
      cont.innerHTML = '<div class="panel empty-state"><p>Todavía no hay rutas profesionales disponibles.</p></div>';
      return;
    }

    const comparacion = CareerGPS.comparar(est.rutas, est.perfil, est.transferencias);

    // Qué ruta mirar: la elegida con un clic, o la meta guardada, o la sugerida (la más corta)
    const existe = function (id) { return est.rutas.some(function (r) { return r.id === id; }); };
    const idVista = existe(local.rutaVista) ? local.rutaVista
                  : (existe(est.perfil.rutaMetaId) ? est.perfil.rutaMetaId : comparacion[0].ruta.id);
    const g = CareerGPS.generar(est.rutas.find(function (r) { return r.id === idVista; }), est.perfil, est.transferencias);

    // ¿La persona está viendo esta vista AHORA? Solo entonces animamos y actualizamos
    // "lo último que vio" (si se dibuja oculta, el avance queda pendiente para su próxima visita).
    const visible = !$('vista-gps').hidden;
    const visto = leerVisto(est);
    const previo = visto[g.ruta.id] || null;
    const actual = foto(g);

    // Desde dónde se anima: lo último que vio; si es la primera vez, desde cero (animación de entrada);
    // si la vista está oculta, no se anima.
    const desde = !visible ? actual
                : (previo || { progreso: 0, posicion: 0, semanas: actual.semanas, listos: [], pasos: g.pasos.map(function () { return 0; }) });

    // ¿Avanzó desde la última visita? Se guarda el aviso hasta que lo cierre.
    if (visible && previo) {
      const av = detectarAvance(previo, g);
      if (av) {
        const antiguo = local.avance && local.avance.rutaId === g.ruta.id ? local.avance : null;
        local.avance = {
          rutaId: g.ruta.id,
          de: antiguo ? antiguo.de : av.de,                                   // si aún no cerró el aviso anterior, se suma
          a: av.a,
          semanasAntes: antiguo ? antiguo.semanasAntes : av.semanasAntes,
          semanasAhora: av.semanasAhora,
          pasosNuevos: (antiguo ? antiguo.pasosNuevos : []).concat(av.pasosNuevos)
        };
      }
    }
    if (visible) { visto[g.ruta.id] = actual; guardarVisto(est, visto); }

    const aviso = !est.perfil.rutaMetaId
      ? '<div class="panel gps-aviso"><p>Aún no has elegido una meta. Te mostramos la ruta más corta para ti: míralas todas y elige la que quieras con «Establecer como mi meta».</p></div>' : '';

    cont.innerHTML = aviso +
      htmlAvance(local.avance && local.avance.rutaId === g.ruta.id ? local.avance : null, g.ruta.titulo) +
      htmlRutas(est, comparacion, idVista) +
      htmlResumen(est, g, desde) +
      htmlSiguienteAccion(est, g) +
      htmlLineaDeTiempo(g, desde);

    UI.restaurarFoco(cont, focoAntes);
    if (visible) animar(cont);
  }


  // ============================================================
  // 7. ACCIONES (delegación de eventos)
  // ============================================================
  const cont = $(CONTENEDOR);

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    // Mirar otra ruta: no guarda nada, solo cambia lo que se ve
    if (accion === 'ver-ruta') { local.rutaVista = id; dibujar(ultimoEstado); return; }

    if (accion === 'cerrar-avance') { local.avance = null; dibujar(ultimoEstado); return; }

    boton.disabled = true;     // evita dobles clics mientras se guarda
    try {
      if (accion === 'meta') {
        await Api.establecerRutaMeta(id);
        local.rutaVista = null;
        await Aspirante.recargar();
        const ruta = ultimoEstado.rutas.find(function (r) { return r.id === id; });
        Comun.mostrarToast('Tu meta ahora es «' + ruta.titulo + '».');
      } else if (accion === 'empezar') {
        await Api.cambiarEstadoCurso(id, 'en_curso');
        await Aspirante.recargar();
        Comun.mostrarToast('¡Empezaste! Márcalo como completado cuando termines.');
      }
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
    }
  });

  // Nos registramos en el armazón: él llama a dibujar() con los datos cada vez que hay cambios
  Aspirante.registrarVista('gps', dibujar);

})();
