/* ============================================================
   aspirante-panel.js  →  LA VISTA "PANEL" (RF-05 + resultado del RF-02)
   ============================================================
   Dibuja, con los datos REALES de quien inició sesión:

     1. Tira de métricas (habilidades, ofertas compatibles, postulaciones)
     2. Compatibilidad con la "oferta de referencia" (se puede cambiar)
     3. Radar de habilidades (tú frente a lo que pide la oferta)
     4. "Por qué este resultado": desglose habilidad por habilidad
     5. Tus mejores coincidencias, con acciones (guardar y postular)

   No calcula nada por su cuenta: el ranking ya viene calculado por
   aspirante.js usando Matching. Esta vista solo lo DIBUJA, y para
   cambiar algo le pide a Api y luego llama Aspirante.recargar().
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const CONTENEDOR = 'panel-contenido';


  // ============================================================
  // 1. AYUDAS DE DIBUJO
  // ------------------------------------------------------------
  // Viven en aspirante-ui.js (compartidas con las demás vistas).
  // ============================================================
  const UI = AspiranteUI;
  const claseNumero = UI.claseNumero;
  const claseChipNivel = UI.claseChipNivel;
  const claseChipEstado = UI.claseChipEstado;
  const claseBarra = UI.claseBarra;
  const dibujarRadar = UI.dibujarRadar;
  const ETIQUETA_ESTADO = UI.ETIQUETA_ESTADO;
  const RANGO_ESTADO = UI.RANGO_ESTADO;


  // ============================================================
  // 3. BLOQUES DE LA VISTA (cada uno devuelve un trozo de HTML)
  // ============================================================

  function htmlMetricas(est) {
    const total = est.ranking.length;
    const altas = est.ranking.filter(function (f) { return f.resultado.nivel === 'alta'; }).length;
    return '<div class="stat-strip">' +
      '<div class="stat-cell"><span class="stat-value">' + est.perfil.habilidades.length + '</span><span class="stat-label">Habilidades registradas</span></div>' +
      '<div class="stat-cell"><span class="stat-value">' + altas + ' <small>de ' + total + '</small></span><span class="stat-label">Ofertas con compatibilidad alta</span></div>' +
      '<div class="stat-cell"><span class="stat-value">' + est.perfil.postulaciones.length + '</span><span class="stat-label">Postulaciones enviadas</span></div>' +
    '</div>';
  }

  function htmlCompatibilidad(est) {
    const obj = est.objetivo;
    const r = obj.resultado;

    // Selector de la oferta de referencia, ordenado por compatibilidad
    const opciones = est.ranking.map(function (f) {
      return '<option value="' + esc(f.empleo.id) + '"' + (f.empleo.id === obj.empleo.id ? ' selected' : '') + '>' +
             f.resultado.puntaje + '% · ' + esc(f.empleo.titulo) + ' (' + esc(f.empleo.empresa) + ')</option>';
    }).join('');

    return '<div class="compat-grid">' +
      '<div class="panel compat-readout">' +
        '<div class="compat-number' + claseNumero(r.nivel) + '">' + r.puntaje + '<span>%</span></div>' +
        '<div class="chip ' + claseChipNivel(r.nivel) + '">Compatibilidad ' + r.nivel + '</div>' +
        '<p class="compat-target">Comparado con la oferta <strong>' + esc(obj.empleo.titulo) + '</strong> en ' + esc(obj.empleo.ciudad) + '</p>' +
        '<div class="compat-select-wrap"><label for="select-objetivo">Cambiar oferta de referencia</label>' +
        '<select class="select" id="select-objetivo">' + opciones + '</select></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h2>Radar de habilidades</h2>' +
        '<p class="panel-sub">Tus habilidades frente a lo que pide la oferta de referencia.</p>' +
        '<div class="radar-wrap">' + dibujarRadar(r.desglose) +
          UI.htmlLeyendaRadar() +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function htmlExplicacion(est) {
    const obj = est.objetivo;
    const r = obj.resultado;

    const aviso = UI.htmlAvisoExperiencia(est.perfil, obj.empleo, r);

    return '<div class="panel explica">' +
      '<h2>Por qué este resultado</h2>' +
      '<p class="panel-sub">Cada habilidad que pide <strong>' + esc(obj.empleo.titulo) + '</strong>, y cómo se compara con tu perfil.</p>' +
      UI.htmlBarrasHoyPotencial(r) +
      '<p class="explica-resumen">' + esc(r.resumen) + '</p>' + aviso +
      UI.htmlDesglose(r) +
    '</div>';
  }

  function htmlMejoresCoincidencias(est) {
    const top = est.ranking.slice(0, 3);

    const filas = top.map(function (f) {
      const e = f.empleo, r = f.resultado;
      const guardada = est.perfil.guardadas.indexOf(e.id) >= 0;
      const postulada = est.perfil.postulaciones.some(function (p) { return p.empleoId === e.id; });
      const esReferencia = est.objetivo && est.objetivo.empleo.id === e.id;

      // Hasta 4 habilidades de la oferta como pastillas (las que más faltan, primero)
      const chips = r.desglose.slice().sort(function (a, b) { return RANGO_ESTADO[a.estado] - RANGO_ESTADO[b.estado]; }).slice(0, 4)
        .map(function (d) { return '<span class="chip ' + claseChipEstado(d.estado) + '">' + esc(d.nombre) + '</span>'; }).join('');

      return '<div class="match-row">' +
        '<div class="match-num' + claseNumero(r.nivel) + '">' + r.puntaje + '%</div>' +
        '<div><p class="match-title">' + esc(e.titulo) + '</p>' +
          '<p class="match-company">' + esc(e.empresa) + ' · ' + esc(e.ciudad) + ' · ' + esc(e.modalidad) + '</p>' +
          '<div class="match-tags">' + chips + '</div></div>' +
        '<div class="match-actions">' +
          '<button type="button" class="icon-btn icon-btn--sm" data-accion="guardar" data-id="' + esc(e.id) + '" aria-pressed="' + guardada + '" ' +
            'aria-label="' + (guardada ? 'Quitar de guardadas' : 'Guardar oferta') + '" title="' + (guardada ? 'Quitar de guardadas' : 'Guardar oferta') + '">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>' +
          (esReferencia ? '<span class="chip chip-neutral">Referencia actual</span>'
                        : '<button type="button" class="btn btn-secondary btn-sm" data-accion="referencia" data-id="' + esc(e.id) + '">Usar de referencia</button>') +
          (postulada ? '<span class="chip chip-match">Postulada ✓</span>'
                     : '<button type="button" class="btn btn-primary btn-sm" data-accion="postular" data-id="' + esc(e.id) + '">Postular</button>') +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="panel"><h2>Tus mejores coincidencias</h2>' +
           '<p class="panel-sub">Las ofertas que mejor encajan con tu perfil hoy, no solo por años de experiencia.</p>' + filas + '</div>';
  }


  // ============================================================
  // 4. DIBUJAR LA VISTA
  // ============================================================
  function dibujar(est) {
    const cont = document.getElementById(CONTENEDOR);

    if (!est.objetivo) {
      cont.innerHTML = '<div class="panel empty-state"><p>Todavía no hay ofertas para calcular tu compatibilidad.</p></div>';
      return;
    }
    cont.innerHTML = htmlMetricas(est) + htmlCompatibilidad(est) + htmlExplicacion(est) + htmlMejoresCoincidencias(est);
  }


  // ============================================================
  // 5. ACCIONES (guardar, postular, cambiar referencia)
  // ------------------------------------------------------------
  // "Delegación de eventos": un solo escuchador en el contenedor
  // atiende todos los botones, aunque se vuelvan a dibujar.
  // ============================================================
  const cont = document.getElementById(CONTENEDOR);

  // Cambiar la oferta de referencia
  cont.addEventListener('change', async function (evento) {
    if (evento.target.id !== 'select-objetivo') return;
    try {
      await Api.establecerOfertaObjetivo(evento.target.value);
      await Aspirante.recargar();
      Comun.mostrarToast('Oferta de referencia actualizada.');
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
    }
  });

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const id = boton.dataset.id;

    // Postular pide una segunda confirmación (el primer clic solo "arma" el botón)
    if (boton.dataset.accion === 'postular' && !UI.armarConfirmacion(boton, '¿Confirmar?')) return;

    boton.disabled = true;     // evita dobles clics mientras se guarda
    try {
      if (boton.dataset.accion === 'guardar') {
        const quedoGuardada = await Api.alternarGuardada(id);
        Comun.mostrarToast(quedoGuardada ? 'Oferta guardada.' : 'Oferta quitada de guardadas.');
      } else if (boton.dataset.accion === 'referencia') {
        await Api.establecerOfertaObjetivo(id);
        Comun.mostrarToast('Oferta de referencia actualizada.');
      } else if (boton.dataset.accion === 'postular') {
        await Api.postular(id);
        Comun.mostrarToast('¡Postulación enviada!');
      }
      await Aspirante.recargar();
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
    }
  });

  // Nos registramos en el armazón: él llama a dibujar() con los datos cada vez que hay cambios
  Aspirante.registrarVista('panel', dibujar);

})();
