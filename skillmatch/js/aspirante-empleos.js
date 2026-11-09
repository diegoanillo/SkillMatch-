/* ============================================================
   aspirante-empleos.js  →  LA VISTA "BUSCAR EMPLEOS"
   ============================================================
   Tiene dos "modos", según la parte final de la URL:

     #empleos        →  LISTA: todas las ofertas ordenadas por compatibilidad,
                        con búsqueda y filtros.
     #empleos/j2     →  DETALLE de la oferta "j2": descripción, radar y el
                        desglose habilidad por habilidad (por qué ese %).

   En los dos modos se puede GUARDAR una oferta y POSTULAR.

   Igual que las demás vistas:
     - No calcula compatibilidad: el ranking ya viene calculado por
       aspirante.js (con Matching) y esta vista solo lo muestra.
     - No guarda nada por su cuenta: le pide a Api y llama a
       Aspirante.recargar(), que redibuja todo.
   Usa las piezas compartidas de aspirante-ui.js (radar, desglose...).
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'empleos-contenido';
  const POR_PAGINA = 8;      // cuántas ofertas se muestran antes de "Mostrar más"


  // ============================================================
  // 1. ESTADO LOCAL: filtros activos
  // ------------------------------------------------------------
  // Se guarda aquí (no en la pantalla) para que los filtros no se
  // pierdan cuando la vista se redibuja, ni al entrar a un detalle y volver.
  // ============================================================
  const FILTROS_INICIALES = {
    busqueda: '', ciudad: '', modalidad: '', sector: '', nivel: '',
    minimo: '',                 // '' = todas · 'media' = media o alta · 'alta' = solo alta
    orden: 'compatibilidad',    // compatibilidad | recientes | experiencia
    soloGuardadas: false, ocultarPostuladas: false
  };
  const local = Object.assign({ limite: POR_PAGINA, respuestas: {}, errorRespuesta: '' }, FILTROS_INICIALES);   // respuestas = borradores de lo que se está escribiendo, por oferta
  let ultimoEstado = null;

  function hayFiltros() {
    return Object.keys(FILTROS_INICIALES).some(function (k) {
      return k !== 'orden' && String(local[k]).trim() !== String(FILTROS_INICIALES[k]);
    });
  }


  // ============================================================
  // 2. FILTRAR Y ORDENAR
  // ============================================================

  // Todo el texto de una oferta en minúsculas y sin tildes, para buscar en él
  function textoDeOferta(e) {
    return Diccionario.norm([e.titulo, e.empresa, e.ciudad, e.sector, e.modalidad, e.nivel, e.descripcion]
      .concat(e.habilidades.map(function (h) { return h.nombre; })).join(' '));
  }

  // ¿La oferta coincide con lo escrito? Cada palabra debe aparecer en la oferta.
  // Además entiende sinónimos: buscar "ms excel" encuentra ofertas que piden "Excel".
  function coincideBusqueda(e, consulta) {
    const texto = textoDeOferta(e);
    const q = Diccionario.norm(consulta);
    const palabras = q.split(/\s+/).filter(function (p) { return p.length >= 2; });
    if (palabras.every(function (p) { return texto.indexOf(p) >= 0; })) return true;

    const alias = Diccionario.buscar(consulta.trim());           // ¿lo escrito es un sinónimo de algo?
    return !!alias && texto.indexOf(Diccionario.norm(alias.nombre)) >= 0;
  }

  function esGuardada(est, id) { return est.perfil.guardadas.indexOf(id) >= 0; }
  function postulacionDe(est, id) { return est.perfil.postulaciones.find(function (p) { return p.empleoId === id; }) || null; }

  function filtrar(est) {
    const filas = est.ranking.filter(function (fila) {
      const e = fila.empleo, r = fila.resultado;
      if (local.ciudad && e.ciudad !== local.ciudad) return false;
      if (local.modalidad && e.modalidad !== local.modalidad) return false;
      if (local.sector && e.sector !== local.sector) return false;
      if (local.nivel && e.nivel !== local.nivel) return false;
      if (local.minimo === 'alta' && r.nivel !== 'alta') return false;
      if (local.minimo === 'media' && r.nivel === 'baja') return false;
      if (local.soloGuardadas && !esGuardada(est, e.id)) return false;
      if (local.ocultarPostuladas && postulacionDe(est, e.id)) return false;
      if (local.busqueda.trim() !== '' && !coincideBusqueda(e, local.busqueda)) return false;
      return true;
    });

    // Ordenar. Por defecto el ranking ya viene de mayor a menor compatibilidad.
    if (local.orden === 'recientes') {
      filas.sort(function (a, b) { return b.empleo.publicado - a.empleo.publicado; });
    } else if (local.orden === 'experiencia') {
      filas.sort(function (a, b) { return a.empleo.experienciaMin - b.empleo.experienciaMin || b.resultado.puntaje - a.resultado.puntaje; });
    }
    return filas;
  }


  // ============================================================
  // 3. TEXTOS Y PIEZAS DE HTML
  // ============================================================
  function minuscula(texto) { return texto.charAt(0).toLowerCase() + texto.slice(1); }

  function textoPublicada(e) { return 'Publicada ' + minuscula(Comun.tiempoRelativo(e.publicado)); }

  function textoExperiencia(e) {
    if (e.experienciaMin === 0) return 'Sin experiencia requerida';
    return 'Experiencia: ' + e.experienciaMin + (e.experienciaMin === 1 ? ' año' : ' años');
  }
  
  function textoSalario(e) {
    if (!e.salarioMin && !e.salarioMax) return 'Salario no especificado';
    if (e.salarioMin && e.salarioMax) {
      return '$' + Number(e.salarioMin).toLocaleString('es-CO') + ' - $' + Number(e.salarioMax).toLocaleString('es-CO');
    }
    if (e.salarioMin) return 'Desde $' + Number(e.salarioMin).toLocaleString('es-CO');
    return 'Hasta $' + Number(e.salarioMax).toLocaleString('es-CO');
  }

  // Valores distintos que existen en las ofertas (para llenar las listas de filtros)
  function valoresUnicos(empleos, campo) {
    const vistos = {};
    empleos.forEach(function (e) { if (e[campo]) vistos[e[campo]] = true; });
    return Object.keys(vistos).sort(function (a, b) { return a.localeCompare(b); });
  }

  function htmlSelect(filtro, etiqueta, opciones, actual) {
    return '<div><label for="emp-' + filtro + '">' + etiqueta + '</label>' +
           '<select class="select" id="emp-' + filtro + '" data-filtro="' + filtro + '">' +
           opciones.map(function (o) {
             return '<option value="' + esc(o.valor) + '"' + (o.valor === actual ? ' selected' : '') + '>' + esc(o.texto) + '</option>';
           }).join('') + '</select></div>';
  }

  function conTodas(lista, textoTodas) {
    return [{ valor: '', texto: textoTodas }].concat(lista.map(function (v) { return { valor: v, texto: v }; }));
  }

  // Botón de guardar (marcador). Sirve en la lista y en el detalle.
  function htmlBotonGuardar(est, id) {
    const g = esGuardada(est, id);
    const texto = g ? 'Quitar de guardadas' : 'Guardar oferta';
    return '<button type="button" class="icon-btn icon-btn--sm" data-accion="guardar" data-id="' + esc(id) + '" data-foco="guardar:' + esc(id) + '" aria-pressed="' + g + '" aria-label="' + texto + '" title="' + texto + '">' +
           '<svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>';
  }

  // Botón de postular, o la constancia de que ya se postuló
  function htmlBotonPostular(est, id) {
    return postulacionDe(est, id)
      ? '<span class="chip chip-match">Postulada ✓</span>'
      : '<button type="button" class="btn btn-primary btn-sm" data-accion="postular" data-id="' + esc(id) + '" data-foco="postular:' + esc(id) + '">Postular</button>';
  }


  // ============================================================
  // 4. MODO LISTA
  // ============================================================
  function htmlFiltros(est) {
    const e = est.empleos;
    return '<div class="panel emp-filtros">' +
      '<div class="emp-busqueda"><label for="emp-buscar" class="visually-hidden">Buscar ofertas</label>' +
        '<input type="search" id="emp-buscar" class="search-input" autocomplete="off" value="' + esc(local.busqueda) + '" placeholder="Buscar por cargo, empresa o habilidad (ej: Excel, ventas, limpieza)…"></div>' +

      '<div class="emp-selects">' +
        htmlSelect('ciudad', 'Ciudad', conTodas(valoresUnicos(e, 'ciudad'), 'Todas'), local.ciudad) +
        htmlSelect('modalidad', 'Modalidad', conTodas(valoresUnicos(e, 'modalidad'), 'Todas'), local.modalidad) +
        htmlSelect('sector', 'Sector', conTodas(valoresUnicos(e, 'sector'), 'Todos'), local.sector) +
        htmlSelect('nivel', 'Nivel', conTodas(valoresUnicos(e, 'nivel'), 'Todos'), local.nivel) +
        htmlSelect('minimo', 'Compatibilidad', [
          { valor: '', texto: 'Cualquiera' }, { valor: 'media', texto: 'Media o alta (55 % o más)' }, { valor: 'alta', texto: 'Solo alta (75 % o más)' }
        ], local.minimo) +
        htmlSelect('orden', 'Ordenar por', [
          { valor: 'compatibilidad', texto: 'Mayor compatibilidad' }, { valor: 'recientes', texto: 'Más recientes' }, { valor: 'experiencia', texto: 'Menos experiencia requerida' }
        ], local.orden) +
      '</div>' +

      '<div class="emp-checks">' +
        '<label class="check"><input type="checkbox" data-filtro="soloGuardadas"' + (local.soloGuardadas ? ' checked' : '') + '> Solo guardadas</label>' +
        '<label class="check"><input type="checkbox" data-filtro="ocultarPostuladas"' + (local.ocultarPostuladas ? ' checked' : '') + '> Ocultar ya postuladas</label>' +
        '<button type="button" class="link-btn" id="emp-limpiar" data-accion="limpiar"' + (hayFiltros() ? '' : ' hidden') + '>Limpiar filtros</button>' +
      '</div>' +
    '</div>';
  }

  // Hasta 5 habilidades de la oferta como pastillas de color (verde = cumples, ámbar = cerca, coral = falta)
  function htmlChipsRequisitos(r) {
    const ordenadas = r.desglose.slice().sort(function (a, b) {
      return (b.obligatoria - a.obligatoria) || (b.nivelRequerido - a.nivelRequerido);
    });
    let html = ordenadas.slice(0, 5).map(function (d) {
      return '<span class="chip ' + UI.claseChipEstado(d.estado) + '" title="' + esc(UI.ETIQUETA_ESTADO[d.estado]) + '">' + esc(d.nombre) + '</span>';
    }).join('');
    if (ordenadas.length > 5) html += '<span class="chip chip-neutral">+' + (ordenadas.length - 5) + '</span>';
    return html;
  }

  function htmlTarjeta(est, fila) {
    const e = fila.empleo, r = fila.resultado;
    return '<article class="job-card" data-id="' + esc(e.id) + '">' +
      '<div class="job-match" aria-label="' + r.puntaje + ' por ciento de compatibilidad">' +
        '<span class="job-match-num' + UI.claseNumero(r.nivel) + '">' + r.puntaje + '%</span><span class="job-match-label">compatible</span></div>' +
      '<div class="job-body">' +
        '<h3 class="job-title"><a href="#empleos/' + encodeURIComponent(e.id) + '">' + esc(e.titulo) + '</a></h3>' +
        '<p class="job-company">' + esc(e.empresa) + ' · ' + esc(e.ciudad) + ' · ' + esc(e.modalidad) + '</p>' +
        '<div class="job-skills">' + htmlChipsRequisitos(r) + '</div>' +
        '<p class="job-meta">' + esc(textoPublicada(e)) + ' · ' + esc(textoExperiencia(e)) + ' · ' + esc(textoSalario(e)) + ' · ' + esc(e.sector) + '</p>'  +
      '</div>' +
      '<div class="job-actions">' + htmlBotonGuardar(est, e.id) + htmlBotonPostular(est, e.id) +
        '<a class="btn btn-secondary btn-sm" href="#empleos/' + encodeURIComponent(e.id) + '">Ver detalle</a></div>' +
    '</article>';
  }

  // Solo esta parte se actualiza al escribir o filtrar (así el cursor no se mueve)
  function htmlResultados(est) {
    const filas = filtrar(est);
    const total = est.ranking.length;

    if (filas.length === 0) {
      return '<p class="emp-conteo" role="status">0 ofertas</p>' +
             '<div class="panel empty-state"><p>No encontramos ofertas con esos filtros.</p>' +
             (hayFiltros() ? '<button type="button" class="btn btn-secondary btn-sm" data-accion="limpiar">Limpiar filtros</button>' : '') + '</div>';
    }

    const visibles = filas.slice(0, local.limite);
    const restantes = filas.length - visibles.length;
    return '<p class="emp-conteo" role="status">' + filas.length + (filas.length === 1 ? ' oferta' : ' ofertas') + (filas.length !== total ? ' de ' + total : '') + '</p>' +
           visibles.map(function (f) { return htmlTarjeta(est, f); }).join('') +
           (restantes > 0 ? '<div class="emp-mas"><button type="button" class="btn btn-secondary" data-accion="mas">Mostrar más (' + restantes + ')</button></div>' : '');
  }

  function dibujarLista(est) {
    return htmlFiltros(est) + '<div id="emp-resultados">' + htmlResultados(est) + '</div>';
  }

  function actualizarResultados() {
    $('emp-resultados').innerHTML = htmlResultados(ultimoEstado);
    $('emp-limpiar').hidden = !hayFiltros();
  }


  // ============================================================
  // 5. MODO DETALLE
  // ============================================================
  function htmlNoEncontrada() {
    return '<div class="panel empty-state"><p>Esa oferta ya no está disponible.</p>' +
           '<a class="btn btn-secondary btn-sm" href="#empleos">Volver a las ofertas</a></div>';
  }

  // Cuando la empresa contacta a la persona, esta puede responderle desde aquí.
  // Lo que va escribiendo se guarda en "local" para no perderlo si la pantalla se redibuja.
  function htmlRespuesta(e, post) {
    return '<div class="det-respuesta">' +
      (post.respuesta ? '<p class="det-mensaje"><strong>Tu respuesta:</strong> “' + esc(post.respuesta) + '”</p>' : '') +
      '<label for="resp-texto" class="det-respuesta-titulo">' + (post.respuesta ? 'Enviar otra respuesta' : 'Responder a ' + esc(e.empresa)) + '</label>' +
      '<textarea id="resp-texto" rows="3" maxlength="500" placeholder="Escribe tu respuesta (por ejemplo, cuándo puedes hablar)…">' + esc(local.respuestas[e.id] || '') + '</textarea>' +
      (local.errorRespuesta ? '<p class="form-error" role="alert">' + esc(local.errorRespuesta) + '</p>' : '') +
      '<button type="button" class="btn btn-primary btn-sm" data-accion="responder" data-id="' + esc(e.id) + '">Enviar respuesta</button>' +
    '</div>';
  }

  function htmlDetalle(est, fila) {
    const e = fila.empleo, r = fila.resultado;
    const post = est.perfil.postulaciones.find(function(p) { 
      return String(p.empleoId) === String(e.id); 
    }) || null;

    const esReferencia = est.objetivo && est.objetivo.empleo.id === e.id;

  const etiquetas = [e.modalidad, e.sector, e.nivel, textoExperiencia(e), textoSalario(e), textoPublicada(e)].map(function (t) {
  return '<span class="chip chip-neutral">' + esc(t) + '</span>';
  }).join('');

    return '<a class="btn btn-secondary btn-sm det-volver" href="#empleos">← Volver a las ofertas</a>' +

      // Cabecera de la oferta
      '<div class="panel det-head">' +
        '<div class="det-fila">' +
          '<div><h2 class="det-titulo">' + esc(e.titulo) + '</h2>' +
            '<p class="job-company">' + esc(e.empresa) + ' · ' + esc(e.ciudad) + '</p>' +
            '<div class="det-tags">' + etiquetas + '</div></div>' +
          '<div class="job-actions">' + htmlBotonGuardar(est, e.id) + htmlBotonPostular(est, e.id) + '</div>' +
        '</div>' +
        (post ? '<p class="det-postulacion">Te postulaste ' + esc(minuscula(Comun.tiempoRelativo(new Date(post.fecha).getTime()))) + ' · Estado: ' + esc(post.estado) + '.</p>' : '') +
        (post && post.mensaje ? '<div style="background: #5EEAD4; color: #000; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-weight: bold;">¡MENSAJE DE LA EMPRESA! <br> "' + esc(post.mensaje) + '"</div>' : '') +
        
        // BOTÓN DE CHAT CON RESTRICCIÓN
        (post 
          ? (function() {
              const puedeChatear = (post.estado === 'Preseleccionado' || post.estado === 'Contactado');
              const claseBoton = puedeChatear ? 'btn-primary' : 'btn-secondary';
              const deshabilitado = puedeChatear ? '' : 'disabled';
              const tooltip = puedeChatear ? '' : 'title="El chat se habilitará cuando la empresa te preseleccione o te contacte"';
              
              return '<button type="button" class="btn ' + claseBoton + ' btn-block" style="margin-top:15px; display:flex; align-items:center; justify-content:center; gap:8px;" ' + 
                     deshabilitado + ' ' + tooltip + ' ' +
                     (puedeChatear ? 'onclick="Chat.abrir(\'' + e.empleador_id + '\', \'' + e.id + '\', \'' + esc(e.empresa) + '\')"' : '') + '>' +
                     '<svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                     (puedeChatear ? ' Chatear con la empresa' : ' Chat no disponible aún') +
                     '</button>';
          })()
          : '') +

      // Compatibilidad + radar
      '<div class="compat-grid">' +
        '<div class="panel compat-readout">' +
          '<div class="compat-number' + UI.claseNumero(r.nivel) + '">' + r.puntaje + '<span>%</span></div>' +
          '<div class="chip ' + UI.claseChipNivel(r.nivel) + '">Compatibilidad ' + r.nivel + '</div>' +
          '<p class="compat-target">Tu compatibilidad con esta oferta</p>' +
          (esReferencia ? '<span class="chip chip-neutral">Es tu oferta de referencia</span>'
                        : '<button type="button" class="btn btn-secondary btn-sm" data-accion="referencia" data-id="' + esc(e.id) + '" data-foco="referencia">Usar de referencia en mi Panel</button>') +
        '</div>' +
        '<div class="panel"><h2>Radar de habilidades</h2>' +
          '<p class="panel-sub">Tus habilidades frente a lo que pide esta oferta.</p>' +
          '<div class="radar-wrap">' + UI.dibujarRadar(r.desglose) + UI.htmlLeyendaRadar() + '</div></div>' +
      '</div>' +

      // Descripción
      '<div class="panel det-descripcion"><h2>Sobre la oferta</h2><p>' + esc(e.descripcion) + '</p></div>' +

      // Por qué este resultado
      '<div class="panel explica"><h2>Por qué este resultado</h2>' +
        '<p class="panel-sub">Cada habilidad que pide la oferta, y cómo se compara con tu perfil.</p>' +
        UI.htmlBarrasHoyPotencial(r) +
        '<p class="explica-resumen">' + esc(r.resumen) + '</p>' +
        UI.htmlAvisoExperiencia(est.perfil, e, r) +
        UI.htmlDesglose(r) +
        (r.brechas.length + r.porMejorar.length > 0
          ? '<p class="det-ayuda">¿Quieres subir este porcentaje? Mantén al día tus habilidades en <a href="#perfil">Mi perfil</a>.</p>' : '') +
      '</div>';
  }


  // ============================================================
  // 6. DIBUJAR LA VISTA
  // ============================================================
  function dibujar(est) {
    ultimoEstado = est;
    const cont = $(CONTENEDOR);
    const foco = UI.recordarFoco(cont);
    const idDetalle = Aspirante.parametro();     // lo que viene después de "#empleos/"

    if (idDetalle) {
      const fila = est.ranking.find(function (f) { return f.empleo.id === idDetalle; });
      cont.innerHTML = fila ? htmlDetalle(est, fila) : htmlNoEncontrada();
    } else {
      cont.innerHTML = dibujarLista(est);
    }
    UI.restaurarFoco(cont, foco);
  }


  // ============================================================
  // 7. ACCIONES
  // ------------------------------------------------------------
  // "Delegación de eventos": un escuchador por tipo de evento en el
  // contenedor atiende todos los controles, aunque se vuelvan a dibujar.
  // ============================================================
  const cont = $(CONTENEDOR);

  // Escribir en el buscador: solo se actualizan los resultados
  cont.addEventListener('input', function (evento) {
    if (evento.target.id === 'resp-texto') {
      local.respuestas[Aspirante.parametro()] = evento.target.value;
      local.errorRespuesta = '';
      return;
    }
    if (evento.target.id !== 'emp-buscar') return;
    local.busqueda = evento.target.value;
    local.limite = POR_PAGINA;
    actualizarResultados();
  });

  // Cambiar un filtro (lista desplegable o casilla)
  cont.addEventListener('change', function (evento) {
    const filtro = evento.target.dataset.filtro;
    if (!filtro) return;
    local[filtro] = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
    local.limite = POR_PAGINA;
    actualizarResultados();
  });

  function limpiarFiltros() {
    Object.assign(local, FILTROS_INICIALES, { limite: POR_PAGINA });
    dibujar(ultimoEstado);      // redibujamos todo para reiniciar también las listas desplegables
  }

  // Enviar la respuesta a la empresa. Si hay un problema (muy corta, etc.) se muestra DENTRO del formulario.
  async function enviarRespuesta(idOferta, boton) {
    boton.disabled = true;
    try {
      await Api.responderContacto(idOferta, local.respuestas[idOferta] || '');
      delete local.respuestas[idOferta];
      local.errorRespuesta = '';
      await Aspirante.recargar();
      Comun.mostrarToast('Respuesta enviada. La empresa recibió una notificación.');
    } catch (error) {
      local.errorRespuesta = error.message;
      dibujar(ultimoEstado);
    }
  }

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'limpiar') { limpiarFiltros(); return; }
    if (accion === 'mas') { local.limite += POR_PAGINA; actualizarResultados(); return; }

    if (accion === 'responder') { enviarRespuesta(id, boton); return; }

    // Postular pide una segunda confirmación (el primer clic solo "arma" el botón)
    if (accion === 'postular' && !UI.armarConfirmacion(boton, '¿Confirmar?')) return;

    boton.disabled = true;     // evita dobles clics mientras se guarda
    try {
      if (accion === 'guardar') {
        const quedoGuardada = await Api.alternarGuardada(id);
        Comun.mostrarToast(quedoGuardada ? 'Oferta guardada.' : 'Oferta quitada de guardadas.');
        await Aspirante.recargar();
      } else if (accion === 'postular') {
        await Api.postular(id);
        Comun.mostrarToast('¡Postulación enviada!');
        await Aspirante.recargar();
      } else if (accion === 'referencia') {
        await Api.establecerOfertaObjetivo(id);
        await Aspirante.recargar();
        Comun.mostrarToast('Oferta de referencia actualizada. La verás en tu Panel.');
        Aspirante.navegar('panel');
      }
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
    }
  });


  // Nos registramos en el armazón: él llama a dibujar() con los datos cada vez que hay cambios
  Aspirante.registrarVista('empleos', dibujar);

})();
