
/* ============================================================
   reclutador-vacantes.js  →  LA VISTA "MIS VACANTES"
   ============================================================
   Las vacantes que el reclutador ha publicado, con cuántas personas se
   postularon a cada una y cuántas están SIN REVISAR. Desde aquí:
     - se abre la lista de candidatos de una vacante (vista "Candidatos")
     - se CIERRA una vacante (deja de verse y de recibir postulaciones)
       o se REABRE.

   Como todas las vistas, dibuja lo que le entrega el armazón
   (Reclutador.estado) y, para cambiar algo, le pide a Api y llama a
   Reclutador.recargar().
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const MINUTOS_NUEVA = 10;   // una vacante publicada hace menos de esto se marca como "Recién publicada"

  function minuscula(t) { return t.charAt(0).toLowerCase() + t.slice(1); }

  function textoExperiencia(v) {
    if (v.experienciaMin === 0) return 'Sin experiencia requerida';
    return 'Experiencia: ' + v.experienciaMin + (v.experienciaMin === 1 ? ' año' : ' años');
  }

  // Las habilidades que pide la vacante, como pastillas (las obligatorias primero)
  function htmlHabilidades(v) {
    const ordenadas = v.habilidades.slice().sort(function (a, b) {
      return (b.obligatoria - a.obligatoria) || (b.nivel - a.nivel);
    });
    let html = ordenadas.slice(0, 6).map(function (h) {
      return '<span class="chip ' + (h.obligatoria ? 'chip-match' : 'chip-neutral') + '" title="' + (h.obligatoria ? 'Obligatoria' : 'Opcional') + ', nivel ' + h.nivel + '">' +
             esc(h.nombre) + ' · ' + h.nivel + '</span>';
    }).join('');
    if (ordenadas.length > 6) html += '<span class="chip chip-neutral">+' + (ordenadas.length - 6) + '</span>';
    return html;
  }

  function htmlTarjeta(v) {
    const cerrada = v.estado === 'cerrada';
    const esNueva = !cerrada && Date.now() - v.publicado < MINUTOS_NUEVA * 60 * 1000;
    const etiquetas = (cerrada ? ' <span class="chip chip-neutral">Cerrada</span>' : '') +
                      (esNueva ? ' <span class="chip chip-match">Recién publicada</span>' : '') +
                      (v.nuevos > 0 ? ' <span class="chip chip-mid">' + v.nuevos + (v.nuevos === 1 ? ' sin revisar' : ' sin revisar') + '</span>' : '');

    return '<article class="job-card vac-card' + (cerrada ? ' is-cerrada' : '') + '" data-id="' + esc(v.id) + '">' +
      '<div class="job-match" aria-label="' + v.postulantes + ' postulantes">' +
        '<span class="job-match-num' + (v.postulantes === 0 ? ' is-low' : '') + '">' + v.postulantes + '</span>' +
        '<span class="job-match-label">' + (v.postulantes === 1 ? 'postulante' : 'postulantes') + '</span></div>' +
      '<div class="job-body">' +
        '<h3 class="job-title">' + esc(v.titulo) + etiquetas + '</h3>' +
        '<p class="job-company">' + esc(v.ciudad) + ' · ' + esc(v.modalidad) + ' · ' + esc(v.nivel) + '</p>' +
        '<div class="job-skills">' + htmlHabilidades(v) + '</div>' +
        '<p class="job-meta">Publicada ' + esc(minuscula(Comun.tiempoRelativo(v.publicado))) + ' · ' + esc(textoExperiencia(v)) + ' · ' + esc(v.sector) + '</p>' +
      '</div>' +
      '<div class="job-actions">' +
        '<a class="btn btn-primary btn-sm" href="#candidatos/' + encodeURIComponent(v.id) + '">Ver candidatos (' + v.postulantes + ')</a>' +
        (cerrada
          ? '<button type="button" class="btn btn-secondary btn-sm" data-accion="reabrir" data-id="' + esc(v.id) + '" data-foco="reabrir:' + esc(v.id) + '">Reabrir</button>'
          : '<button type="button" class="btn btn-secondary btn-sm" data-accion="cerrar" data-id="' + esc(v.id) + '" data-foco="cerrar:' + esc(v.id) + '">Cerrar vacante</button>') +
      '</div>' +
    '</article>';
  }

  function dibujar(est) {
    const cont = $('vacantes-contenido');
    const foco = UI.recordarFoco(cont);
    const total = est.vacantes.length;

    if (total === 0) {
      cont.innerHTML = '<div class="panel empty-state"><p>Aún no has publicado ninguna vacante. Describe lo que necesitas y te ayudamos a armarla en minutos.</p>' +
                       '<button type="button" class="btn btn-primary" data-ir="publicar">Publicar mi primera vacante</button></div>';
      return;
    }

    const postulaciones = est.vacantes.reduce(function (suma, v) { return suma + v.postulantes; }, 0);
    const sinRevisar = est.vacantes.reduce(function (suma, v) { return suma + v.nuevos; }, 0);
    const abiertas = est.vacantes.filter(function (v) { return v.estado !== 'cerrada'; }).length;

    cont.innerHTML =
      '<div class="stat-strip">' +
        '<div class="stat-cell"><span class="stat-value">' + abiertas + ' <small>de ' + total + '</small></span><span class="stat-label">Vacantes abiertas</span></div>' +
        '<div class="stat-cell"><span class="stat-value">' + postulaciones + '</span><span class="stat-label">Postulaciones recibidas</span></div>' +
        '<div class="stat-cell"><span class="stat-value">' + sinRevisar + '</span><span class="stat-label">Sin revisar</span></div>' +
      '</div>' +
      '<div class="vac-barra"><button type="button" class="btn btn-primary btn-sm" data-ir="publicar">+ Publicar otra vacante</button></div>' +
      est.vacantes.map(htmlTarjeta).join('');
    UI.restaurarFoco(cont, foco);
  }

  // ---------- Acciones: cerrar y reabrir ----------
  $('vacantes-contenido').addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    // Cerrar pide una segunda confirmación (los aspirantes dejan de ver la vacante)
    if (accion === 'cerrar' && !UI.armarConfirmacion(boton, '¿Cerrar?')) return;

    boton.disabled = true;
    try {
      await Api.cambiarEstadoVacante(id, accion === 'cerrar' ? 'cerrada' : 'activa');
      await Reclutador.recargar();
      Comun.mostrarToast(accion === 'cerrar' ? 'Vacante cerrada: los aspirantes ya no la ven.' : 'Vacante reabierta: vuelve a estar visible.');
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
    }
  });

  Reclutador.registrarVista('vacantes', dibujar);

})();
