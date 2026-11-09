/* ============================================================
   reclutador-candidatos.js  →  LA VISTA "CANDIDATOS" (RF-07)
   ============================================================
   Las personas que se postularon a UNA vacante (#candidatos/j1),
   ordenadas por compatibilidad, con el desglose de POR QUÉ cada una
   tiene ese porcentaje. Es el mismo motor (Matching) que ve el aspirante
   desde su lado, así que los números coinciden.

   Por cada candidato el reclutador puede:
     - Ver el desglose: habilidad por habilidad, el radar y las barras.
     - PRESELECCIONAR, CONTACTAR (con un mensaje que le llega a la persona)
       o DESCARTAR. Cada cambio le llega al aspirante como notificación.
     - Deshacer: volver a "Nuevo".

   PRIVACIDAD: el reclutador NO ve el correo ni otros datos de contacto del
   candidato. La comunicación va por la plataforma ("Contactar").

   Las explicaciones se escriben en TERCERA persona ("Tiene SQL en nivel 3")
   porque las lee el reclutador, no el candidato.

   FRESCURA: cada vez que se entra a la vista se muestra lo que ya se tenía y,
   en segundo plano, se vuelve a pedir; si algo cambió, se redibuja.
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'candidatos-contenido';

  // Cómo se llama cada estado de la postulación en pantalla
  const NOMBRE_ESTADO = { Enviada: 'Nuevo', Preseleccionado: 'Preseleccionado', Contactado: 'Contactado', Descartado: 'Descartado' };
  const CHIP_ESTADO = { Enviada: 'chip-neutral', Preseleccionado: 'chip-match', Contactado: 'chip-mid', Descartado: 'chip-gap' };
  const PESTANAS = { todos: 'Todos', Enviada: 'Nuevos', Preseleccionado: 'Preseleccionados', Contactado: 'Contactados', Descartado: 'Descartados' };

  const local = {
    idCargado: null,       // de qué vacante son los candidatos que hay en memoria
    candidatos: [],
    transferencias: [],
    firma: '',             // los candidatos como texto, para saber si algo cambió
    cargando: false,
    error: '',
    turno: 0,              // para ignorar respuestas viejas
    pestana: 'todos',
    orden: 'compatibilidad',
    abiertos: {},          // { idAspirante: true } los que tienen el desglose abierto
    contactando: null,     // id del aspirante al que se le está escribiendo
    mensaje: '',           // el texto del mensaje en edición
    errorContacto: ''
  };
  let ultimoEstado = null;
  let idPedido = null;


  // ============================================================
  // 1. CARGAR (y refrescar en segundo plano)
  // ============================================================
  async function cargar(id, silencioso) {
    const turno = ++local.turno;
    if (!silencioso) { local.cargando = true; local.error = ''; pintar(); }

    try {
      const r = await Promise.all([Api.getCandidatos(id), Api.getTransferencias()]);
      if (turno !== local.turno || Reclutador.parametro() !== id) return;   // llegó tarde: ya se pidió otra cosa

      const firma = JSON.stringify(r[0]);
      const cambio = local.idCargado !== id || firma !== local.firma;
      local.candidatos = r[0];
      local.transferencias = r[1];
      local.firma = firma;
      local.idCargado = id;
      local.cargando = false;
      local.error = '';
      if (cambio || !silencioso) pintar();    // si nada cambió en un refresco silencioso, no se redibuja
    } catch (error) {
      if (turno !== local.turno) return;
      local.cargando = false;
      local.error = error.message;
      pintar();
    }
  }


  // ============================================================
  // 2. EVALUAR Y ORDENAR
  // ============================================================
  // Compatibilidad de cada candidato con la vacante (el mismo motor del lado del aspirante)
  function evaluar(vacante) {
    return local.candidatos.map(function (c) {
      const r = Matching.calcular(c.habilidades, vacante.habilidades, local.transferencias, {
        experienciaAnios: c.experienciaAnios, experienciaMin: vacante.experienciaMin, tercera: true
      });
      return { c: c, r: r };
    });
  }

  function ordenar(filas) {
    const fecha = function (f) { return new Date(f.c.postulacion.fecha).getTime(); };
    if (local.orden === 'recientes') return filas.sort(function (a, b) { return fecha(b) - fecha(a); });
    if (local.orden === 'experiencia') return filas.sort(function (a, b) { return b.c.experienciaAnios - a.c.experienciaAnios || b.r.puntaje - a.r.puntaje; });
    return filas.sort(function (a, b) { return b.r.puntaje - a.r.puntaje || fecha(a) - fecha(b); });
  }

  function minuscula(t) { return t.charAt(0).toLowerCase() + t.slice(1); }


  // ============================================================
  // 3. HTML
  // ============================================================
  function htmlCabecera(v) {
    const requisitos = v.habilidades.slice().sort(function (a, b) { return (b.obligatoria - a.obligatoria) || (b.nivel - a.nivel); }).map(function (h) {
      return '<span class="chip ' + (h.obligatoria ? 'chip-match' : 'chip-neutral') + '" title="' + (h.obligatoria ? 'Obligatoria' : 'Opcional') + '">' + esc(h.nombre) + ' · ' + h.nivel + '</span>';
    }).join('');

    return '<a class="btn btn-secondary btn-sm det-volver" href="#vacantes">← Volver a mis vacantes</a>' +
      '<div class="panel det-head"><div class="det-fila"><div>' +
        '<h2 class="det-titulo">' + esc(v.titulo) + (v.estado === 'cerrada' ? ' <span class="chip chip-neutral">Cerrada</span>' : '') + '</h2>' +
        '<p class="job-company">' + esc(v.empresa) + ' · ' + esc(v.ciudad) + ' · ' + esc(v.modalidad) + ' · ' + esc(v.nivel) + '</p>' +
        '<div class="job-skills">' + requisitos + '</div>' +
      '</div></div></div>';
  }

  function htmlControles(filas) {
    const cuenta = { todos: filas.length, Enviada: 0, Preseleccionado: 0, Contactado: 0, Descartado: 0 };
    filas.forEach(function (f) { cuenta[f.c.postulacion.estado]++; });

    return '<div class="reco-controles"><div class="cat-tabs" role="group" aria-label="Filtrar por estado">' +
      Object.keys(PESTANAS).map(function (k) {
        return '<button type="button" class="cat-btn" data-accion="pestana" data-pestana="' + k + '" aria-pressed="' + (local.pestana === k) + '">' +
               PESTANAS[k] + ' <span class="cat-count">' + cuenta[k] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="reco-tipo"><label for="cand-orden" class="visually-hidden">Ordenar por</label>' +
        '<select class="select" id="cand-orden">' +
          '<option value="compatibilidad"' + (local.orden === 'compatibilidad' ? ' selected' : '') + '>Mayor compatibilidad</option>' +
          '<option value="recientes"' + (local.orden === 'recientes' ? ' selected' : '') + '>Más recientes</option>' +
          '<option value="experiencia"' + (local.orden === 'experiencia' ? ' selected' : '') + '>Más experiencia</option>' +
        '</select></div></div>';
  }

  // Hasta 6 habilidades que pide la vacante, coloreadas según cómo las cumple la persona
  function htmlChips(r) {
    const ordenadas = r.desglose.slice().sort(function (a, b) { return (b.obligatoria - a.obligatoria) || (b.nivelRequerido - a.nivelRequerido); });
    let html = ordenadas.slice(0, 6).map(function (d) {
      return '<span class="chip ' + UI.claseChipEstado(d.estado) + '" title="' + esc(UI.ETIQUETA_ESTADO[d.estado]) + '">' + esc(d.nombre) + '</span>';
    }).join('');
    if (ordenadas.length > 6) html += '<span class="chip chip-neutral">+' + (ordenadas.length - 6) + '</span>';
    return html;
  }

   // Los botones dependen del estado actual de la postulación
    function htmlAcciones(c) {
    const id = esc(c.id);
    const boton = function (estado, texto, clase) {
      return '<button type="button" class="btn ' + clase + ' btn-sm" data-accion="estado" data-estado="' + estado + '" data-id="' + id + '" data-foco="' + estado + ':' + id + '">' + texto + '</button>';
    };

        // Al hacer clic, primero actualiza el estado a "Contactado" y luego abre el chat
const botonChat = '<button type="button" class="btn btn-secondary btn-sm" onclick="Chat.abrir(\'' + id + '\', \'' + Reclutador.parametro() + '\', \'' + esc(c.nombre.split(' ')[0]) + '\')">Chatear</button>';

    let html;
    switch (c.postulacion.estado) {
      case 'Preseleccionado': 
        html = boton('Descartado', 'Descartar', 'btn-secondary') + boton('Enviada', 'Quitar preselección', 'btn-secondary'); 
        break;
      case 'Contactado':      
        html = boton('Descartado', 'Descartar', 'btn-secondary') + boton('Enviada', 'Volver a «Nuevo»', 'btn-secondary'); 
        break;
      case 'Descartado':      
        html = boton('Enviada', 'Recuperar', 'btn-secondary'); 
        break;
      default:                
        html = boton('Preseleccionado', 'Preseleccionar', 'btn-primary') + boton('Descartado', 'Descartar', 'btn-secondary');
    }
    
    const abierto = !!local.abiertos[c.id];
    return html + botonChat + '<button type="button" class="btn btn-secondary btn-sm" data-accion="desglose" data-id="' + id + '" aria-expanded="' + abierto + '">' + (abierto ? 'Ocultar desglose' : 'Ver desglose') + '</button>';
  }

  function htmlContacto(c, v) {
    return '<div class="cand-contacto"><label for="cand-msg" class="reg-box-title">Mensaje para ' + esc(c.nombre.split(' ')[0]) + '</label>' +
      '<p class="field-help">Le llegará como notificación. No compartas datos privados: la conversación se hace por la plataforma.</p>' +
      '<textarea id="cand-msg" class="pub-textarea" rows="4" maxlength="500" data-foco="mensaje">' + esc(local.mensaje) + '</textarea>' +
      (local.errorContacto ? '<p class="form-error" role="alert">' + esc(local.errorContacto) + '</p>' : '') +
      '<div class="pub-acciones"><button type="button" class="btn btn-primary btn-sm" data-accion="enviar-contacto" data-id="' + esc(c.id) + '">Enviar mensaje</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-accion="cancelar-contacto">Cancelar</button></div></div>';
  }

  // El desglose: el mismo del lado del aspirante, pero hablando de la persona
  function htmlDetalle(c, r, v) {
    return '<div class="cand-detalle">' +
      (c.sobreMi ? '<p class="cand-sobre"><strong>Sobre la persona:</strong> ' + esc(c.sobreMi) + '</p>' : '') +
      UI.htmlBarrasHoyPotencial(r, true) +
      '<p class="explica-resumen">' + esc(r.resumen) + '</p>' +
      UI.htmlAvisoExperiencia({ experienciaAnios: c.experienciaAnios }, v, r, true) +
      '<div class="radar-wrap">' + UI.dibujarRadar(r.desglose) + UI.htmlLeyendaRadar(true) + '</div>' +
      UI.htmlDesglose(r, true) +
    '</div>';
  }

  function htmlTarjeta(f, v) {
    const c = f.c, r = f.r;
    const estado = c.postulacion.estado;
    const perfil = [c.cargoActual, c.ubicacion, c.experienciaAnios + (c.experienciaAnios === 1 ? ' año' : ' años') + ' de experiencia', c.educacion].filter(Boolean).join(' · ');

    return '<article class="job-card cand-card' + (estado === 'Descartado' ? ' is-cerrada' : '') + '" data-id="' + esc(c.id) + '">' +
      '<div class="job-match" aria-label="' + r.puntaje + ' por ciento de compatibilidad">' +
        '<span class="job-match-num' + UI.claseNumero(r.nivel) + '">' + r.puntaje + '%</span><span class="job-match-label">compatible</span></div>' +
      '<div class="job-body">' +
        '<h3 class="job-title">' + esc(c.nombre) + ' <span class="chip ' + CHIP_ESTADO[estado] + '">' + NOMBRE_ESTADO[estado] + '</span></h3>' +
        '<p class="job-company">' + esc(perfil) + '</p>' +
        '<div class="job-skills">' + htmlChips(r) + '</div>' +
        '<p class="job-meta">Se postuló ' + esc(minuscula(Comun.tiempoRelativo(new Date(c.postulacion.fecha).getTime()))) + '</p>' +
        (estado === 'Contactado' && c.postulacion.mensaje ? '<p class="cand-mensaje"><strong>Mensaje enviado:</strong> “' + esc(c.postulacion.mensaje) + '”</p>' : '') +
        (estado === 'Contactado' && c.postulacion.respuesta ? '<p class="cand-mensaje cand-respuesta"><strong>Respuesta de ' + esc(c.nombre.split(' ')[0]) + ':</strong> “' + esc(c.postulacion.respuesta) + '”</p>' : '') +
      '</div>' +
      '<div class="job-actions">' + htmlAcciones(c) + '</div>' +
      (local.contactando === c.id ? htmlContacto(c, v) : '') +
      (local.abiertos[c.id] ? htmlDetalle(c, r, v) : '') +
    '</article>';
  }

  function htmlLista(v) {
    const todas = evaluar(v);
    const visibles = ordenar(todas.filter(function (f) { return local.pestana === 'todos' || f.c.postulacion.estado === local.pestana; }));
    const altas = todas.filter(function (f) { return f.r.nivel === 'alta'; }).length;
    const nuevos = todas.filter(function (f) { return f.c.postulacion.estado === 'Enviada'; }).length;

    if (todas.length === 0) {
      return htmlCabecera(v) + '<div class="panel empty-state"><p>Todavía nadie se ha postulado a esta vacante.' +
             (v.estado === 'cerrada' ? ' Está cerrada: reábrela desde «Mis vacantes» para que los aspirantes la vean.' : ' Cuando alguien lo haga, aparecerá aquí ordenado por compatibilidad.') + '</p></div>';
    }

    return htmlCabecera(v) +
      '<div class="stat-strip">' +
        '<div class="stat-cell"><span class="stat-value">' + todas.length + '</span><span class="stat-label">Postulantes</span></div>' +
        '<div class="stat-cell"><span class="stat-value">' + nuevos + '</span><span class="stat-label">Sin revisar</span></div>' +
        '<div class="stat-cell"><span class="stat-value">' + altas + ' <small>de ' + todas.length + '</small></span><span class="stat-label">Con compatibilidad alta</span></div>' +
      '</div>' + htmlControles(todas) +
      (visibles.length > 0 ? visibles.map(function (f) { return htmlTarjeta(f, v); }).join('')
                           : '<div class="panel empty-state"><p>No hay candidatos en «' + esc(PESTANAS[local.pestana]) + '».</p></div>');
  }


  // ============================================================
  // 4. DIBUJAR
  // ============================================================
  function pintar() {
    const cont = $(CONTENEDOR);
    const foco = UI.recordarFoco(cont);
    const est = ultimoEstado;
    const id = Reclutador.parametro();
    let html;

    if (!id) {
      html = '<div class="panel empty-state"><p>Elige una vacante para ver a sus candidatos.</p><a class="btn btn-primary btn-sm" href="#vacantes">Ir a mis vacantes</a></div>';
    } else {
      const v = est.vacantes.find(function (x) { return x.id === id; });
      if (!v) html = '<div class="panel empty-state"><p>No encontramos esa vacante.</p><a class="btn btn-secondary btn-sm" href="#vacantes">Volver a mis vacantes</a></div>';
      else if (local.error) html = htmlCabecera(v) + '<div class="panel panel-error"><h2>No pudimos cargar los candidatos</h2><p>' + esc(local.error) + '</p><button type="button" class="btn btn-primary btn-sm" data-accion="reintentar">Reintentar</button></div>';
      else if (local.idCargado !== id) html = htmlCabecera(v) + '<p class="cargando">Cargando candidatos…</p>';
      else html = htmlLista(v);
    }
    cont.innerHTML = html;
    UI.restaurarFoco(cont, foco);
  }

  // El armazón llama a esto al entrar a la vista y cada vez que hay cambios
  function dibujar(est) {
    ultimoEstado = est;
    const id = Reclutador.parametro();

    if (id !== idPedido) {                       // otra vacante: se reinicia lo que dependía de la anterior
      idPedido = id;
      Object.assign(local, { pestana: 'todos', abiertos: {}, contactando: null, mensaje: '', errorContacto: '', error: '' });
    }
    pintar();
    if (id && !$('vista-candidatos').hidden) cargar(id, local.idCargado === id);   // en segundo plano si ya había datos
  }


  // ============================================================
  // 5. ACCIONES (delegación de eventos)
  // ============================================================
  const cont = $(CONTENEDOR);

  async function aplicarEstado(idAspirante, estado, mensaje) {
    const vacanteId = Reclutador.parametro();
    await Api.cambiarEstadoPostulacion({ vacanteId: vacanteId, aspiranteId: idAspirante, estado: estado, mensaje: mensaje });
    await cargar(vacanteId, false);
    await Reclutador.recargar();
  }

  cont.addEventListener('input', function (evento) {
    if (evento.target.id === 'cand-msg') { local.mensaje = evento.target.value; local.errorContacto = ''; }
  });

  cont.addEventListener('change', function (evento) {
    if (evento.target.id === 'cand-orden') { local.orden = evento.target.value; pintar(); }
  });

  cont.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const id = boton.dataset.id;
    const v = ultimoEstado.vacantes.find(function (x) { return x.id === Reclutador.parametro(); });

    if (accion === 'reintentar') { cargar(Reclutador.parametro(), false); return; }
    if (accion === 'pestana')    { local.pestana = boton.dataset.pestana; pintar(); return; }
    if (accion === 'desglose')   { local.abiertos[id] = !local.abiertos[id]; pintar(); return; }

    if (accion === 'contactar') {
      const c = local.candidatos.find(function (x) { return x.id === id; });
      local.contactando = id;
      local.errorContacto = '';
      local.mensaje = 'Hola ' + c.nombre.split(' ')[0] + ', vimos tu perfil y nos interesa conversar contigo sobre la vacante «' + v.titulo +
                      '». ¿Podemos agendar una llamada esta semana? Saludos, ' + ultimoEstado.sesion.nombre + ' (' + ultimoEstado.empresa.nombre + ').';
      pintar();
      const caja = $('cand-msg'); if (caja) caja.focus();
      return;
    }
    if (accion === 'cancelar-contacto') { local.contactando = null; local.errorContacto = ''; pintar(); return; }

    // Descartar pide una segunda confirmación (el primer clic solo "arma" el botón)
    if (accion === 'estado' && boton.dataset.estado === 'Descartado' && !UI.armarConfirmacion(boton, '¿Descartar?')) return;

    boton.disabled = true;                 // evita dobles clics mientras se guarda
    try {
      if (accion === 'enviar-contacto') {
        await aplicarEstado(id, 'Contactado', local.mensaje);
        local.contactando = null;
        pintar();
        Comun.mostrarToast('Mensaje enviado. La persona recibió una notificación.');
      } else if (accion === 'estado') {
        const estado = boton.dataset.estado;
        await aplicarEstado(id, estado);
        Comun.mostrarToast({ Preseleccionado: 'Candidato preseleccionado. Se le avisó.', Descartado: 'Candidato descartado.', Enviada: 'Vuelve a «Nuevo».' }[estado]);
      }
    } catch (error) {
      if (accion === 'enviar-contacto') { local.errorContacto = error.message; pintar(); }
      else { Comun.mostrarToast(error.message, 'error'); boton.disabled = false; }
    }
  });

    // Función que actualiza el estado y luego abre el chat
  window.abrirChatYContactar = async function(aspiranteId, vacanteId, nombre) {
    try {
      // 1. Actualizamos el estado en la base de datos
            await Api.cambiarEstadoPostulacion({
        aspiranteId: aspiranteId,
        vacanteId: vacanteId,
        estado: 'Contactado',
        mensaje: null 
      });
      // 2. Recargamos la vista para que se vea el cambio de estado
      await Reclutador.recargar();
    } catch (error) {
      console.error('No se pudo actualizar el estado:', error);
    }
    // 3. Abrimos el chat (aunque falle el estado, el chat abre)
    Chat.abrir(aspiranteId, vacanteId, nombre);
  };

  Reclutador.registrarVista('candidatos', dibujar);

})();
