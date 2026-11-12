/* ============================================================
   aspirante-gps.js  →  LA VISTA "CAREER GPS" (RF-03)
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'gps-contenido';

  const local = {
    rutaVista: null,   // La oferta que se está mirando
    avance: null       // Aviso "¡Avanzaste!" pendiente
  };
  let ultimoEstado = null;

  // ============================================================
  // 1. LO QUE LA PERSONA VIO LA ÚLTIMA VEZ (Para animar)
  // ============================================================
  const CLAVE_VISTO = 'skillmatch_gps_visto_';

  function leerVisto(est) {
    try { return JSON.parse(localStorage.getItem(CLAVE_VISTO + est.sesion.id)) || {}; } catch (e) { return {}; }
  }
  function guardarVisto(est, mapa) {
    try { localStorage.setItem(CLAVE_VISTO + est.sesion.id, JSON.stringify(mapa)); } catch (e) { /* ignorar */ }
  }

  function foto(g) {
    return {
      progreso: g.meta.progreso,
      posicion: g.posicion,
      semanas: g.meta.semanas,
      listos: g.pasos.filter(function (p) { return p.estado === 'listo'; }).map(function (p) { return p.indice; }),
      pasos: g.pasos.map(function (p) { return p.progreso; })
    };
  }

  function detectarAvance(previo, g) {
    const nuevos = g.pasos.filter(function (p) { return p.estado === 'listo' && previo.listos.indexOf(p.indice) < 0; })
      .map(function (p) { return p.rol; });
    if (g.meta.progreso <= previo.progreso && nuevos.length === 0) return null;
    return { de: previo.progreso, a: g.meta.progreso, semanasAntes: previo.semanas, semanasAhora: g.meta.semanas, pasosNuevos: nuevos };
  }


  // ============================================================
  // 2. AYUDAS DE TEXTO Y DIBUJO
  // ============================================================
  function textoLlegada(fecha) {
    return fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  function limitar(n) { return Math.max(0, Math.min(1, n)); }

  function chipRequisito(d) {
    if (d.estado === 'cumple')       return '<span class="chip chip-match">' + esc(d.nombre) + ' ✓</span>';
    if (d.estado === 'transferible') return '<span class="chip chip-match" title="Tu ' + esc(d.via.de) + ' te acerca a ' + esc(d.nombre) + '">' + esc(d.via.de) + ' → ' + esc(d.nombre) + '</span>';
    if (d.estado === 'parcial')      return '<span class="chip chip-mid">' + esc(d.nombre) + ' ' + d.nivelUsuario + '/' + d.nivelRequerido + '</span>';
    return '<span class="chip chip-gap">' + (d.nivelUsuario > 0 ? esc(d.nombre) + ' ' + d.nivelUsuario + '/' + d.nivelRequerido : 'Falta ' + esc(d.nombre)) + '</span>';
  }

  const ICONO_CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICONO_AVANCE = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function htmlBarra(desde, hasta, clase) {
    return '<div class="bar-track"><div class="bar-fill' + (clase || '') + '" style="width:' + desde + '%" data-ancho="' + hasta + '"></div></div>';
  }


  // ============================================================
  // 3. BLOQUES DE LA VISTA
  // ============================================================

  // Las ofertas (vacantes) como tarjetas
  function htmlOfertas(est, ofertas, idVista) {
    const metaId = est.perfil.rutaMetaId;
    
    return '<div class="panel"><h2>Ofertas posibles</h2>' +
      '<p class="panel-sub">Calculadas con tus habilidades de hoy. Pulsa una para ver qué te falta para alcanzarla.</p>' +
      '<div class="rutas-grid">' + ofertas.map(function (f) {
        const esMeta = f.empleo.id === metaId;
        const marca = esMeta ? '<span class="chip chip-match">Tu meta</span>' : '';
        
        return '<button type="button" class="ruta-card" data-accion="ver-ruta" data-id="' + esc(f.empleo.id) + '" aria-pressed="' + (f.empleo.id === idVista) + '">' +
          '<span class="ruta-card-top"><span class="ruta-card-titulo">' + esc(f.empleo.titulo) + '</span>' + marca + '</span>' +
          '<span class="ruta-card-desc">' + esc(f.empleo.empresa) + ' · ' + esc(f.empleo.ciudad) + '</span>' +
          '<span class="ruta-card-meta">' + f.resultado.puntaje + ' % de progreso · ' + 
            (f.resultado.puntaje === 100 ? '¡Meta alcanzada!' : esc(Comun.formatearSemanas(f.resultado.semanas)) + ' hasta la meta') + '</span>' +
        '</button>';
      }).join('') + '</div></div>';
  }

  // Aviso "¡Avanzaste!"
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

  // Resumen (métricas y botón para establecer meta)
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

    '<div class="gps-progreso" aria-label="Progreso hacia la meta: ' + m.progreso + ' por ciento">' +
      '<div class="gps-progreso-top"><span>Progreso hacia tu meta</span>' +
        '<span>' + (av && av.a > av.de ? '<span class="chip chip-match gps-delta">+' + (av.a - av.de) + '</span> ' : '') + '<strong>' + m.progreso + ' %</strong></span></div>' +
      htmlBarra(desde.progreso, m.progreso) +
    '</div>' +

    '<div class="gps-barra">' +
      '<p class="gps-barra-texto"><strong>' + esc(g.ruta.titulo) + '.</strong> ' + (esMeta ? 'Esta es tu meta actual.' : 'Aún no es tu meta.') +
        ' El progreso mide cuánto de lo que pide la oferta cumples hoy. Las semanas son estimaciones de práctica que asumen dedicación constante; todo se actualiza solo cuando mejoras tus habilidades.</p>' +
      (esMeta ? '' : '<button type="button" class="btn btn-primary btn-sm" data-accion="meta" data-id="' + esc(g.ruta.id) + '">Establecer como mi meta</button>') +
    '</div>';
  }

  // Siguiente acción (el curso más relevante para la brecha actual)
  function htmlSiguienteAccion(est, g) {
    if (g.completa) {
      return '<div class="panel gps-siguiente"><h2>Tu siguiente acción</h2>' +
             '<p class="gps-vacio">Ya cumples todos los requisitos de esta oferta. Puedes elegir otra oferta arriba o postularte en <a href="#empleos">Buscar empleos</a>.</p></div>';
    }

    // Solo las necesidades del paso actual (sin oferta de referencia)
    const necesidades = Recomendador.necesidades(null, g.pasoActual);
    const ranking = Recomendador.evaluar(est.cursos, est.perfil, necesidades, null, est.transferencias)
      .filter(function (f) { return f.relevancia > 0 && f.estado !== 'completado'; });
    
    const fila = ranking.find(function (f) { return f.estado === 'en_curso'; }) || ranking[0];

    if (!fila) {
      return '<div class="panel gps-siguiente"><h2>Tu siguiente acción</h2>' +
             '<p class="gps-vacio">Todavía no tenemos recursos para las brechas de esta oferta. Practica con un proyecto propio y registra tus avances en <a href="#perfil">Mi perfil</a>.</p></div>';
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
  // 4. LA LÍNEA DE TIEMPO
  // ============================================================
  function abrirWaypoint(idx, estadoVisual, g, desde, k) {
    const n = g.pasos.length;
    let atributos = ' data-status="' + estadoVisual + '"';
    let pin = '';

    if (idx < n) {
      const llenoFin = limitar(g.posicion * n - idx);
      const llenoIni = limitar(desde.posicion * n - idx);
      const primerMovido = Math.floor(desde.posicion * n + 1e-9);
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
        '<div class="waypoint-prog"><span class="waypoint-prog-texto">' + (paso.estado === 'listo' ? 'Cumplido' : paso.progreso + ' % cumplido') + '</span>' +
          htmlBarra(antes, paso.progreso, paso.estado === 'listo' ? '' : ' bar-fill--mid') + '</div>' +
        '<div class="waypoint-skills">' + r.desglose.map(chipRequisito).join('') + '</div>' +
        (paso.estado === 'actual' ? '<p class="waypoint-link"><a href="#recomendaciones">Ver recursos para este paso →</a></p>' : '') +
      '</div>' +
    '</div>';
  }

  function htmlLineaDeTiempo(g, desde) {
    const n = g.pasos.length;
    const k = Math.min(n - 1, Math.floor(g.posicion * n + 1e-9));

    const inicio = abrirWaypoint(0, 'done', g, desde, k) +
      '<span class="waypoint-marker">' + ICONO_CHECK + '</span>' +
      '<div class="waypoint-card">' +
        '<div class="waypoint-top"><span class="waypoint-role">' + esc(g.inicio.titulo) + '</span><span class="waypoint-duration">Posición actual</span></div>' +
        '<p class="waypoint-desc">Tu punto de partida, según tu perfil y las habilidades que más sirven para esta oferta.</p>' +
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

    const topOfertas = est.ranking.slice(0, 3);

    if (topOfertas.length === 0) {
      cont.innerHTML = '<div class="panel empty-state"><p>No hay ofertas disponibles para calcular tu ruta. Vuelve más tarde o pide a un reclutador que publique una vacante.</p></div>';
      return;
    }

    const existe = function (id) { return topOfertas.some(function (f) { return f.empleo.id === id; }); };
    const idVista = existe(local.rutaVista) ? local.rutaVista
                  : (existe(est.perfil.rutaMetaId) ? est.perfil.rutaMetaId : topOfertas[0].empleo.id);
    
    const filaVista = topOfertas.find(f => f.empleo.id === idVista);
    
    const g = CareerGPS.generar(filaVista.empleo, est.perfil, est.transferencias);

    const visible = !$('vista-gps').hidden;
    const visto = leerVisto(est);
    const previo = visto[g.ruta.id] || null;
    const actual = foto(g);

    const desde = !visible ? actual
                : (previo || { progreso: 0, posicion: 0, semanas: actual.semanas, listos: [], pasos: g.pasos.map(function () { return 0; }) });

    if (visible && previo) {
      const av = detectarAvance(previo, g);
      if (av) {
        const antiguo = local.avance && local.avance.rutaId === g.ruta.id ? local.avance : null;
        local.avance = {
          rutaId: g.ruta.id,
          de: antiguo ? antiguo.de : av.de,
          a: av.a,
          semanasAntes: antiguo ? antiguo.semanasAntes : av.semanasAntes,
          semanasAhora: av.semanasAhora,
          pasosNuevos: (antiguo ? antiguo.pasosNuevos : []).concat(av.pasosNuevos)
        };
      }
    }
    if (visible) { visto[g.ruta.id] = actual; guardarVisto(est, visto); }

    const aviso = !est.perfil.rutaMetaId
      ? '<div class="panel gps-aviso"><p>Aún no has elegido una meta. Te mostramos las ofertas que mejor encajan contigo: míralas y elige la que quieras con «Establecer como mi meta».</p></div>' : '';

    cont.innerHTML = aviso +
      htmlAvance(local.avance && local.avance.rutaId === g.ruta.id ? local.avance : null, g.ruta.titulo) +
      htmlOfertas(est, topOfertas, idVista) +
      htmlResumen(est, g, desde) +
      htmlSiguienteAccion(est, g) +
      htmlLineaDeTiempo(g, desde);

    UI.restaurarFoco(cont, focoAntes);
    if (visible) animar(cont);
  }


  // ============================================================
  // 7. ACCIONES
  // ============================================================
  const cont = $(CONTENEDOR);

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'ver-ruta') { local.rutaVista = id; dibujar(ultimoEstado); return; }
    if (accion === 'cerrar-avance') { local.avance = null; dibujar(ultimoEstado); return; }

    boton.disabled = true;
    try {
      if (accion === 'meta') {
        await Api.establecerOfertaObjetivo(id); // <--- ESTO GUARDA EL ID EN LA TABLA PERFILES
        local.rutaVista = null;
        await Aspirante.recargar();
        const oferta = ultimoEstado.ranking.find(function (f) { return f.empleo.id === id; });
        Comun.mostrarToast('Tu meta ahora es «' + oferta.empleo.titulo + '».');
      
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

  Aspirante.registrarVista('gps', dibujar);

})();