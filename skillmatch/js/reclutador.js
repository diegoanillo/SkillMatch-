/* ============================================================
   reclutador.js  →  EL "ARMAZÓN" DEL PANEL DEL RECLUTADOR
   ============================================================
   Hace por el reclutador lo mismo que aspirante.js hace por el aspirante.
   No dibuja el contenido de ninguna vista; se encarga de lo común:

     1. Proteger la pantalla (solo entra quien inició sesión como reclutador).
     2. Cargar los datos UNA vez (su empresa, sus vacantes, catálogos) y mantenerlos al día.
     3. Cambiar de vista con el menú y con la URL (#vacantes, #publicar).
     4. La barra superior: saludo, tema, NOTIFICACIONES y menú de usuario (cerrar sesión).
     5. Volver a cargar y redibujar todo cuando algo cambia.

   Cada vista vive en su propio archivo y se "registra" aquí:

       Reclutador.registrarVista('publicar', function (estado) { ... });

   Lo que las vistas pueden usar (objeto global "Reclutador"):
     Reclutador.estado          los datos ya cargados (ver abajo)
     Reclutador.recargar()      vuelve a pedir datos y redibuja todo
     Reclutador.navegar(v, p)   cambia de vista (p = parámetro opcional)
     Reclutador.parametro()     el parámetro de la URL actual

   NOTA: este archivo se parece mucho a aspirante.js a propósito. Cuando el
   proyecto crezca se puede extraer lo común a un solo archivo; por ahora
   mantenerlos separados evita que un cambio en un panel rompa el otro.
   ============================================================ */

(function (global) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };

  // Vistas que existen (coinciden con data-vista del menú y con #vista-xxx del HTML)
  const VISTAS = ['vacantes', 'publicar', 'candidatos'];
  const TITULOS = { vacantes: 'Mis vacantes', publicar: 'Publicar vacante', candidatos: 'Candidatos' };
  // "Candidatos" no tiene su propio botón en el menú: se llega desde Mis vacantes, así que ese botón queda marcado
  const NAV_DE_VISTA = { candidatos: 'vacantes' };
  const VISTA_INICIAL = 'vacantes';


  // ============================================================
  // 1. ESTADO COMPARTIDO
  //   sesion               quién inició sesión { id, nombre, email, rol }
  //   empresa              los datos de su empresa
  //   vacantes             sus vacantes, con "postulantes" (cuántas personas se postularon)
  //   catalogos            sectores, ciudades, modalidades, niveles...
  //   catalogoHabilidades  todas las habilidades que existen
  // ============================================================
  const estado = { sesion: null, empresa: null, vacantes: [], catalogos: null, catalogoHabilidades: [] };

  const renderizadores = {};   // { nombreDeVista: función(estado) }
  let parametroActual = null;


  // ============================================================
  // 2. CARGAR DATOS
  // ============================================================
    async function cargar() {
    const r = await Promise.all([Api.getEmpresa(), Api.getMisVacantes(), Api.getCatalogos(), Api.getCatalogoHabilidades()]);
    estado.empresa = r[0];
    estado.vacantes = r[1];
    estado.catalogos = r[2];
    estado.catalogoHabilidades = r[3];
    estado.sesion = Api.sesionActual() || estado.sesion;
  }


  // ============================================================
  // 3. REGISTRO Y DIBUJO DE VISTAS
  // ============================================================
  function registrarVista(nombre, funcionDibujar) { renderizadores[nombre] = funcionDibujar; }

  // Dibuja UNA vista. Si falla, la otra sigue funcionando.
  function dibujarUna(nombre) {
    const contenedor = $(nombre + '-contenido');
    if (!contenedor || !renderizadores[nombre]) return;
    try {
      renderizadores[nombre](estado);
    } catch (error) {
      console.error('Error al dibujar la vista "' + nombre + '":', error);
      contenedor.innerHTML = '<div class="panel panel-error"><h2>Algo salió mal en esta sección</h2>' +
                             '<p>Recarga la página. Si el problema continúa, avísanos.</p></div>';
    }
  }

  function dibujarVistas() { VISTAS.forEach(dibujarUna); }


  // ============================================================
  // 4. NAVEGACIÓN ENTRE VISTAS
  // ------------------------------------------------------------
  // La vista actual vive en la parte final de la URL ("hash"):
  //   dashboard-reclutador.html#publicar
  //   dashboard-reclutador.html#candidatos/j1   (los candidatos de la vacante j1)
  // Así el botón "Atrás" del navegador funciona y se puede recargar sin perder el sitio.
  // ============================================================
  function leerHash() {
    const partes = global.location.hash.replace('#', '').split('/');
    const vista = VISTAS.indexOf(partes[0]) >= 0 ? partes[0] : VISTA_INICIAL;
    return { vista: vista, parametro: partes[1] ? decodeURIComponent(partes[1]) : null };
  }

  function navegar(vista, parametro) {
    if (VISTAS.indexOf(vista) < 0) return;
    const hash = '#' + vista + (parametro ? '/' + encodeURIComponent(parametro) : '');
    if (global.location.hash === hash) mostrarVista(true);   // ya estaba ahí: solo refrescamos
    else global.location.hash = hash;                        // dispara "hashchange" → mostrarVista
  }

  function mostrarVista(moverFoco) {
    const destino = leerHash();
    parametroActual = destino.parametro;

    VISTAS.forEach(function (nombre) { $('vista-' + nombre).hidden = nombre !== destino.vista; });

    document.querySelectorAll('.nav-item').forEach(function (boton) {
      if (boton.dataset.vista === (NAV_DE_VISTA[destino.vista] || destino.vista)) boton.setAttribute('aria-current', 'page');
      else boton.removeAttribute('aria-current');
    });

    document.title = TITULOS[destino.vista] + ' · SkillMatch';

    // Al llegar a una vista la volvemos a dibujar, para que siempre muestre datos al día.
    // (Si los datos aún no cargaron, no hay nada que dibujar: lo hará recargar() al terminar.)
    if (estado.empresa) dibujarUna(destino.vista);

    if (moverFoco) {
      try { global.scrollTo(0, 0); } catch (e) { /* ignorar */ }
      const titulo = document.querySelector('#vista-' + destino.vista + ' h1');
      if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus(); }
    }
  }

  global.addEventListener('hashchange', function () { mostrarVista(true); });

  document.querySelectorAll('.nav-item').forEach(function (boton) {
    boton.addEventListener('click', function () { navegar(boton.dataset.vista); });
  });

  // Cualquier elemento con data-ir="vista" funciona como enlace interno
  document.addEventListener('click', function (evento) {
    const enlace = evento.target.closest('[data-ir]');
    if (enlace) navegar(enlace.dataset.ir, enlace.dataset.param || null);
  });


  // ============================================================
  // 5. BARRA SUPERIOR: saludo, avatar y menú de usuario
  // ============================================================
  function saludoSegunHora() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function dibujarCabecera() {
    const n = estado.vacantes.length;
    $('saludo').textContent = saludoSegunHora() + ', ' + estado.sesion.nombre.split(' ')[0];
    $('saludo-sub').textContent = estado.empresa.nombre + ' · ' +
      (n === 0 ? 'Aún no has publicado vacantes.' : n + (n === 1 ? ' vacante publicada.' : ' vacantes publicadas.'));

    $('avatar-btn').textContent = Comun.iniciales(estado.sesion.nombre);
    $('avatar-btn').title = estado.sesion.nombre;
    $('menu-nombre').textContent = estado.sesion.nombre;
    $('menu-email').textContent = estado.sesion.email;
  }

  // ---------- Notificaciones ----------
  // Un ícono distinto según el tipo de aviso
  const ICONOS_NOTIF = {
    candidato: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    mensaje:   '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  };

  function dibujarNotificaciones() {
    const lista = (estado.empresa.notificaciones || []).slice().sort(function (a, b) { return b.fecha - a.fecha; });
    const sinLeer = lista.filter(function (n) { return !n.leida; }).length;

    $('notif-dot').hidden = sinLeer === 0;
    $('notif-toggle').setAttribute('aria-label', sinLeer > 0 ? 'Notificaciones (' + sinLeer + ' sin leer)' : 'Notificaciones');
    $('notif-todas').disabled = sinLeer === 0;

    if (lista.length === 0) {
      $('notif-lista').innerHTML = '<p class="notif-empty">No tienes notificaciones. Te avisaremos cuando alguien se postule o responda.</p>';
      return;
    }
    $('notif-lista').innerHTML = lista.map(function (n) {
      return '<button type="button" class="notif-item' + (n.leida ? '' : ' is-unread') + '" data-notif="' + Comun.esc(n.id) + '">' +
               '<span class="notif-item-icon">' + (ICONOS_NOTIF[n.tipo] || ICONOS_NOTIF.candidato) + '</span>' +
               '<span><p class="notif-item-text"><strong>' + Comun.esc(n.titulo) + '</strong> ' + Comun.esc(n.texto) + '</p>' +
               '<span class="notif-item-time">' + Comun.esc(Comun.tiempoRelativo(n.fecha)) + '</span></span>' +
             '</button>';
    }).join('');
  }

  // Abrir una notificación: la marca como leída y lleva a la vista que corresponde
  $('notif-lista').addEventListener('click', async function (evento) {
    const item = evento.target.closest('[data-notif]');
    if (!item) return;
    const notif = estado.empresa.notificaciones.find(function (n) { return n.id === item.dataset.notif; });
    cerrarMenus();
    try {
      await Api.marcarNotificacionLeida(item.dataset.notif);
      await recargar();
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
    }
    if (notif && notif.destino) navegar(notif.destino.vista, notif.destino.empleoId || null);
  });

  $('notif-todas').addEventListener('click', async function () {
    try { await Api.marcarTodasLeidas(); await recargar(); } catch (error) { Comun.mostrarToast(error.message, 'error'); }
  });

  // ---------- Menús desplegables (notificaciones y usuario): abrir / cerrar ----------
  const MENUS = [
    { boton: 'notif-toggle', panel: 'notif-panel' },
    { boton: 'avatar-btn',   panel: 'menu-usuario' }
  ];

  function cerrarMenus(exceptoPanel) {
    MENUS.forEach(function (m) {
      if (m.panel === exceptoPanel) return;
      $(m.panel).hidden = true;
      $(m.boton).setAttribute('aria-expanded', 'false');
    });
  }

  MENUS.forEach(function (m) {
    $(m.boton).addEventListener('click', function (evento) {
      evento.stopPropagation();                 // evita que el clic "de afuera" lo cierre al instante
      const abierto = !$(m.panel).hidden;
      cerrarMenus(m.panel);
      $(m.panel).hidden = abierto;
      $(m.boton).setAttribute('aria-expanded', String(!abierto));
    });
  });

  // Clic fuera de un menú = cerrarlo. Escape = cerrarlo y devolver el foco al botón.
  document.addEventListener('click', function (evento) {
    if (!evento.target.closest('.dropdown')) cerrarMenus();
  });
  document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Escape') return;
    const abierto = MENUS.find(function (m) { return !$(m.panel).hidden; });
    if (abierto) { cerrarMenus(); $(abierto.boton).focus(); }
  });

  $('menu-salir').addEventListener('click', async function () {
    await Api.logout();                         // borra la sesión
    global.location.replace('index.html');      // replace: "Atrás" no vuelve al panel
  });


  // ============================================================
  // 6. RECARGAR: pedir datos de nuevo y redibujar todo
  // ------------------------------------------------------------
  // Las vistas lo llaman después de cambiar algo (publicar una vacante...).
  // ============================================================
  async function recargar() {
    try {
      await cargar();
      $('error-carga').hidden = true;
      dibujarCabecera();
      dibujarNotificaciones();
      dibujarVistas();
    } catch (error) {
      // Sesión vencida: de vuelta al login. Cualquier otro error: aviso con "Reintentar".
      if (!Api.sesionActual()) { global.location.replace('index.html'); return; }
      $('error-carga-texto').textContent = error.message;
      $('error-carga').hidden = false;
    }
  }

  $('reintentar').addEventListener('click', recargar);

  // ACTUALIZACIÓN AUTOMÁTICA
  // En esta versión de práctica los datos viven en el navegador, así que "otra persona" es otra
  // pestaña (por ejemplo, un reclutador en una y un aspirante en otra). Cuando OTRA pestaña cambia
  // los datos el navegador avisa con el evento "storage", y cuando la persona vuelve a esta pestaña
  // con "visibilitychange": en ambos casos se vuelve a cargar todo. Con el backend real esto se
  // reemplaza por consultas periódicas o por notificaciones en vivo.
  let temporizadorActualizar = null;
  function recargarPronto() {
    clearTimeout(temporizadorActualizar);
    temporizadorActualizar = setTimeout(recargar, 300);   // la espera junta varios cambios seguidos en uno solo
  }
  global.addEventListener('storage', function (evento) { if (evento.key === Api.CLAVE_DB) recargarPronto(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') recargarPronto(); });


  // ============================================================
  // 7. ARRANQUE
  // ------------------------------------------------------------
  // Se ejecuta cuando la página terminó de cargar (así las vistas,
  // que se cargan después de este archivo, ya están registradas).
  // ============================================================
  async function iniciar() {
    // Guardia de seguridad: sin sesión de reclutador, redirige y devuelve null
    const sesion = Api.exigirRol('reclutador');
    if (!sesion) return;
    estado.sesion = sesion;

    Comun.vincularBotonTema($('theme-toggle'));
    mostrarVista(false);
    await recargar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  global.Reclutador = {
    estado: estado,
    registrarVista: registrarVista,
    recargar: recargar,
    navegar: navegar,
    parametro: function () { return parametroActual; }
  };

})(window);
