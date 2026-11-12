/* ============================================================
   aspirante-recos.js  →  LA VISTA "RECOMENDACIONES" (RF-04)
   ============================================================
   Cursos y proyectos para cerrar las brechas de la persona, y el
   seguimiento de su avance.

   Qué muestra:
     1. "Tu aprendizaje": cuántos recursos tiene en curso o completados,
        y QUÉ le estamos pidiendo mejorar (sus brechas más importantes) y por qué.
     2. Cuatro pestañas:
          Para ti      recursos que cubren sus brechas, los más útiles primero
          En curso     los que ya empezó
          Completados  los que terminó
          Todos        el catálogo completo
     3. En cada recurso: por qué se recomienda, qué habilidades mejora
        (SQL 3 → 5) y cuánto subiría su compatibilidad al completarlo.

   Se puede EMPEZAR un recurso y luego marcarlo COMPLETADO. Al completarlo
   suben sus niveles y se le avisa cuánto cambió su compatibilidad.

   El cálculo de qué recomendar lo hace recomendador.js (Recomendador).
   Esta vista solo lo DIBUJA y, para cambiar algo, le pide a Api y llama
   a Aspirante.recargar().
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'recomendaciones-contenido';

  const local = {
    pestana: 'para-ti', tipo: '',   // pestaña activa y filtro de tipo
    avance: null                    // aviso "tu Career GPS avanzó" tras completar un recurso (hasta que se cierre)
  };
  let ultimoEstado = null;

  const ETIQUETA_PRIORIDAD = { 3: 'Prioridad alta', 2: 'Prioridad media', 1: 'Prioridad baja' };


  // ============================================================
  // 1. CALCULAR LAS RECOMENDACIONES
  // ============================================================
    function calcular(est) {
    // 1. Si hay una meta elegida (oferta_objetivo_id), esa es la única referencia
    const esMeta = est.objetivo && est.objetivo.empleo.id === String(est.perfil.ofertaObjetivoId);
    
    // Solo calculamos necesidades basadas en la oferta de referencia (la meta)
    const necesidades = esMeta ? Recomendador.necesidades(est.objetivo, null) : [];
    
    // Evaluamos los cursos basándonos solo en esas necesidades
    const filas = Recomendador.evaluar(est.cursos, est.perfil, necesidades, est.objetivo, est.transferencias);
    
    return { 
      necesidades: necesidades, 
      filas: filas, 
      pasoActual: null // Ya no usamos el paso del GPS antiguo
    };
  }

  // Qué filas pertenecen a cada pestaña
  const PESTANAS = {
    'para-ti':     { texto: 'Para ti',     filtro: function (f) { return f.estado === 'pendiente' && f.relevancia > 0; } },
    'en-curso':    { texto: 'En curso',    filtro: function (f) { return f.estado === 'en_curso'; } },
    'completados': { texto: 'Completados', filtro: function (f) { return f.estado === 'completado'; } },
    'todos':       { texto: 'Todos',       filtro: function () { return true; } }
  };


  // ============================================================
  // 2. BLOQUES DE HTML
  // ============================================================
  // Aviso fijo después de completar un recurso: cuánto avanzó la ruta hacia la meta
  function htmlAvanceGPS() {
    const a = local.avance;
    if (!a) return '';
    return '<div class="panel gps-avance" role="status">' +
      '<span class="gps-avance-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<div class="gps-avance-texto"><h2>¡Tu Career GPS avanzó!</h2>' +
        '<p>Tu progreso hacia «' + esc(a.titulo) + '» pasó de <strong>' + a.de + ' %</strong> a <strong>' + a.a + ' %</strong> (+' + (a.a - a.de) + ' puntos).</p>' +
        a.pasosNuevos.map(function (rol) { return '<p>🎉 ¡Alcanzaste el paso «' + esc(rol) + '»!</p>'; }).join('') +
      '</div>' +
      '<div class="gps-accion-botones"><a class="btn btn-primary btn-sm" href="#gps">Ver mi Career GPS</a>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-accion="cerrar-avance">Cerrar</button></div>' +
    '</div>';
  }

  function htmlResumen(est, c) {
    const enCurso = c.filas.filter(PESTANAS['en-curso'].filtro).length;
    const hechos = c.filas.filter(PESTANAS['completados'].filtro);
    const horas = hechos.reduce(function (s, f) { return s + f.recurso.horas; }, 0);

    // Qué priorizamos y por qué
    let prioridades;
    if (c.necesidades.length === 0) {
      prioridades = '<p class="reco-sin-brechas">Cumples todo lo que te pide tu oferta de referencia' + (c.pasoActual ? ' y tu paso actual' : '') +
                    '. Puedes explorar el catálogo completo en la pestaña «Todos».</p>';
    } else {
      const referencias = [];
      if (est.objetivo) referencias.push('la oferta de referencia «' + esc(est.objetivo.empleo.titulo) + '» (<a href="#panel">cambiar</a>)');
      if (c.pasoActual) referencias.push('el paso «' + esc(c.pasoActual.rol) + '» de tu <a href="#gps">Career GPS</a>');
      prioridades = '<p class="panel-sub" style="margin-bottom:12px">Estas son las habilidades que más te faltan para ' + (referencias.join(' y ') || 'avanzar') + ':</p>' +
        '<div class="reco-mejoras">' + c.necesidades.slice(0, 6).map(function (n) {
          return '<span class="chip chip-gap" title="' + esc(n.motivos.join(' · ')) + '">' + esc(n.nombre) + ' · faltan ' + n.brecha + (n.brecha === 1 ? ' nivel' : ' niveles') + '</span>';
        }).join('') + '</div>';
    }

    return '<div class="stat-strip">' +
      '<div class="stat-cell"><span class="stat-value">' + enCurso + '</span><span class="stat-label">Recursos en curso</span></div>' +
      '<div class="stat-cell"><span class="stat-value">' + hechos.length + '</span><span class="stat-label">Recursos completados</span></div>' +
      '<div class="stat-cell"><span class="stat-value">' + horas + ' <small>h</small></span><span class="stat-label">Horas de aprendizaje completadas</span></div>' +
    '</div>' +
    '<div class="panel" style="margin-bottom:20px"><h2>Qué estamos priorizando</h2>' + prioridades + '</div>';
  }

  function htmlControles(c) {
    return '<div class="reco-controles">' +
      '<div class="cat-tabs" role="group" aria-label="Filtrar recursos">' +
        Object.keys(PESTANAS).map(function (k) {
          return '<button type="button" class="cat-btn" data-accion="pestana" data-pestana="' + k + '" aria-pressed="' + (local.pestana === k) + '">' +
                 PESTANAS[k].texto + ' <span class="cat-count">' + c.filas.filter(PESTANAS[k].filtro).length + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="reco-tipo"><label for="reco-tipo" class="visually-hidden">Tipo de recurso</label>' +
        '<select class="select" id="reco-tipo" data-filtro="tipo"><option value="">Cursos y proyectos</option>' +
          '<option value="Curso"' + (local.tipo === 'Curso' ? ' selected' : '') + '>Solo cursos</option>' +
          '<option value="Proyecto"' + (local.tipo === 'Proyecto' ? ' selected' : '') + '>Solo proyectos</option></select></div>' +
    '</div>';
  }

  // La tarjeta de un recurso
  function htmlTarjeta(fila, clavesNecesarias) {
    const r = fila.recurso;
    const claveDe = function (n) { return Diccionario.norm(Diccionario.canonico(n)); };

    // Qué habilidades mejora; resaltadas las que cubren una brecha
    const mejoras = fila.mejoras.map(function (m) {
      const cubre = clavesNecesarias.indexOf(claveDe(m.nombre)) >= 0;
      return '<span class="chip ' + (cubre ? 'chip-match' : 'chip-neutral') + '">' + esc(m.nombre) + ' ' + m.antes + ' → ' + m.despues + '</span>';
    }).join('');

    const prioridad = fila.prioridad > 0 && fila.estado !== 'completado'
      ? '<span class="signal" data-level="' + fila.prioridad + '" role="img" aria-label="' + ETIQUETA_PRIORIDAD[fila.prioridad] + '" title="' + ETIQUETA_PRIORIDAD[fila.prioridad] + '"><i></i><i></i><i></i></span>' : '';

    const impacto = fila.impacto && fila.impacto.delta > 0 && fila.estado !== 'completado'
      ? '<p class="rec-impacto">Completarlo subiría tu compatibilidad con «' + esc(fila.impacto.titulo) + '» de ' + fila.impacto.antes + ' % a ' + fila.impacto.despues + ' %.</p>' : '';

        // Si el curso tiene URL, la usamos. Si no, creamos un enlace de búsqueda en Coursera.
    let urlFinal = r.url;
    if (!urlFinal || urlFinal === 'https://coursera.org' || urlFinal === 'https://sena.edu.co') {
      // Genera un enlace de búsqueda con el título del curso
      const busqueda = encodeURIComponent(r.titulo);
      if (r.tipo === 'Proyecto' || (r.titulo && r.titulo.toLowerCase().includes('proyecto'))) {
        urlFinal = `https://www.kaggle.com/search?q=${busqueda}`;
      } else {
        urlFinal = `https://www.coursera.org/search?query=${busqueda}`;
      }
    }
    
    // Validamos que sea un enlace seguro (http o https) y lo creamos
    const enlace = /^https?:\/\//.test(urlFinal)
      ? '<a class="btn btn-secondary btn-sm" href="' + esc(urlFinal) + '" target="_blank" rel="noopener noreferrer">Ver recurso</a>' : '';
    let estado;
    if (fila.estado === 'completado') {
      estado = '<span class="chip chip-match">Completado ✓</span>';
    } else if (fila.estado === 'en_curso') {
      estado = '<span class="chip chip-mid">En curso</span>' +
               '<button type="button" class="btn btn-primary btn-sm" data-accion="completar" data-id="' + esc(r.id) + '" data-foco="completar:' + esc(r.id) + '">Marcar completado</button>';
    } else {
      estado = '<button type="button" class="btn btn-primary btn-sm" data-accion="empezar" data-id="' + esc(r.id) + '" data-foco="empezar:' + esc(r.id) + '">Empezar</button>';
    }

    return '<article class="rec-card" data-id="' + esc(r.id) + '">' +
      '<div class="rec-prio">' + prioridad + '</div>' +
      '<div class="rec-main">' +
        '<p class="reco-titulo"><span class="chip chip-neutral">' + esc(r.tipo) + '</span> ' + esc(r.titulo) + '</p>' +
        '<p class="reco-meta">' + r.horas + ' horas' + (fila.motivos.length ? ' · ' + esc(fila.motivos[0]) : '') + '</p>' +
        '<div class="reco-mejoras">' + mejoras + '</div>' + impacto +
      '</div>' +
      '<div class="rec-actions">' + enlace + estado + '</div>' +
    '</article>';
  }

  function htmlVacia(c) {
    const mensajes = {
      'para-ti': c.necesidades.length === 0
        ? 'No tienes brechas pendientes. ¡Buen trabajo! Explora el catálogo completo en «Todos».'
        : 'Ya empezaste o completaste todos los recursos que cubren tus brechas.',
      'en-curso': 'No tienes recursos en curso. Empieza uno desde «Para ti».',
      'completados': 'Aún no completas ningún recurso.',
      'todos': 'No hay recursos que mostrar.'
    };
    return '<div class="panel empty-state"><p>' + mensajes[local.pestana] + '</p></div>';
  }


  // ============================================================
  // 3. DIBUJAR LA VISTA
  // ============================================================
  function dibujar(est) {
    ultimoEstado = est;
    const cont = $(CONTENEDOR);
    const foco = UI.recordarFoco(cont);

    const c = calcular(est);
    const claves = c.necesidades.map(function (n) { return n.clave; });

    const visibles = c.filas.filter(PESTANAS[local.pestana].filtro)
      .filter(function (f) { return local.tipo === '' || f.recurso.tipo === local.tipo; });

    cont.innerHTML = htmlAvanceGPS() + htmlResumen(est, c) + htmlControles(c) +
      (visibles.length > 0 ? visibles.map(function (f) { return htmlTarjeta(f, claves); }).join('') : htmlVacia(c)) +
      '<p class="reco-nota">Sobre los niveles: en esta versión de práctica, al completar un recurso tus niveles suben automáticamente. ' +
      'En la plataforma real, el nivel lo validará una evaluación o un certificado.</p>';

    UI.restaurarFoco(cont, foco);
  }


  // ============================================================
  // 4. ACCIONES (delegación de eventos)
  // ============================================================
  const cont = $(CONTENEDOR);

  cont.addEventListener('change', function (evento) {
    if (evento.target.dataset.filtro !== 'tipo') return;
    local.tipo = evento.target.value;
    dibujar(ultimoEstado);
  });

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'pestana') { local.pestana = boton.dataset.pestana; dibujar(ultimoEstado); return; }
    if (accion === 'cerrar-avance') { local.avance = null; dibujar(ultimoEstado); return; }

    // Completar cambia niveles: pide una segunda confirmación (el primer clic solo "arma" el botón)
    if (accion === 'completar' && !UI.armarConfirmacion(boton, '¿Confirmar?')) return;

    boton.disabled = true;     // evita dobles clics mientras se guarda
    try {
      if (accion === 'empezar') {
        await Api.cambiarEstadoCurso(id, 'en_curso');
        await Aspirante.recargar();
        Comun.mostrarToast('¡Empezaste! Cuando termines, márcalo como completado.');

      } else if (accion === 'completar') {
        const antes = UI.fotoImpacto();
        const gpsAntes = UI.fotoGPS();            // cómo estaba el Career GPS ANTES
        const titulo = ultimoEstado.cursos.find(function (x) { return x.id === id; }).titulo;
        const resultado = await Api.cambiarEstadoCurso(id, 'completado');   // devuelve { perfil, cambios }
        await Aspirante.recargar();
        const gpsDespues = UI.fotoGPS();          // ...y DESPUÉS

        // ¿Avanzó la ruta hacia la meta? Se lo contamos (aviso fijo en esta pantalla + el mensaje)
        let textoGPS = '';
        if (gpsAntes && gpsDespues && gpsAntes.rutaId === gpsDespues.rutaId) {
          const nuevos = gpsDespues.listos.filter(function (rol) { return gpsAntes.listos.indexOf(rol) < 0; });
          if (gpsDespues.progreso > gpsAntes.progreso || nuevos.length > 0) {
            local.avance = { titulo: gpsDespues.titulo, de: gpsAntes.progreso, a: gpsDespues.progreso, pasosNuevos: nuevos };
            textoGPS = ' Tu Career GPS avanzó: ' + gpsAntes.progreso + ' % → ' + gpsDespues.progreso + ' %.';
            dibujar(ultimoEstado);                // para mostrar el aviso ya mismo
          }
        }

        const cambios = resultado.cambios.map(function (m) { return m.nombre + ' ' + m.antes + ' → ' + m.despues; }).join(', ');
        UI.avisarImpacto(antes, '¡Completaste «' + titulo + '»!' + (cambios ? ' ' + cambios + '.' : '') + textoGPS);
      }
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
    }
  });

  // Nos registramos en el armazón: él llama a dibujar() con los datos cada vez que hay cambios
  Aspirante.registrarVista('recomendaciones', dibujar);

})();
