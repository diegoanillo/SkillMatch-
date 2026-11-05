/* ============================================================
   aspirante.js  →  EL "ARMAZÓN" DEL PANEL DEL ASPIRANTE
   ============================================================
   Este archivo NO dibuja el contenido de ninguna vista. Se
   encarga de lo que es común a todas:

     1. Proteger la pantalla (solo entra quien inició sesión como aspirante).
     2. Cargar los datos UNA vez (perfil, ofertas, etc.) y calcular
        el ranking de compatibilidad.
     3. Cambiar de vista (Panel, Mi perfil, ...) con el menú y con la URL
        (#perfil, #empleos/j2, ...): así el botón "Atrás" del navegador
        funciona y se puede recargar la página sin perder el sitio.
     4. La barra superior: saludo, notificaciones y menú de usuario.
     5. Volver a cargar y redibujar todo cuando algo cambia.

   Cada vista vive en su propio archivo y se "registra" aquí:

       Aspirante.registrarVista('panel', function (estado) {
         // dibuja la vista usando "estado"
       });

   Así, para agregar una vista nueva (puntos 7, 8, 9) basta con
   crear su archivo y cargarlo en el HTML: este armazón no cambia.

   Lo que las vistas pueden usar (objeto global "Aspirante"):
     Aspirante.estado          los datos ya cargados (ver abajo)
     Aspirante.recargar()      vuelve a pedir datos y redibuja todo
     Aspirante.navegar(v, p)   cambia de vista (p = parámetro opcional)
     Aspirante.parametro()     el parámetro de la URL actual (ej: id de una oferta)
   ============================================================ */

(function (global) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const esc = Comun.esc;

  // Vistas que existen (coinciden con data-vista del menú y con #vista-xxx del HTML)
  const VISTAS = ['panel', 'perfil', 'gps', 'recomendaciones', 'empleos'];
  const TITULOS = { panel: 'Panel', perfil: 'Mi perfil', gps: 'Career GPS', recomendaciones: 'Recomendaciones', empleos: 'Buscar empleos' };


  // ============================================================
  // 1. ESTADO COMPARTIDO
  // ------------------------------------------------------------
  // Todo lo que las vistas necesitan, ya calculado:
  //   sesion         quién inició sesión { id, nombre, email, rol }
  //   perfil         el perfil del aspirante (habilidades, postulaciones, ...)
  //   empleos        todas las ofertas
  //   transferencias el grafo de habilidades
  //   rutas, cursos  para Career GPS y Recomendaciones
  //   ranking        [{ empleo, resultado }] ordenado de mayor a menor compatibilidad
  //   objetivo       el elemento del ranking que se usa como "oferta de referencia"
  // ============================================================
  const estado = {
    sesion: null, perfil: null, empleos: [], transferencias: [], rutas: [], cursos: [],
    catalogos: null, catalogoHabilidades: [],
    ranking: [], objetivo: null
  };

  const renderizadores = {};   // { nombreDeVista: función(estado) }
  let vistaActual = null;
  let parametroActual = null;


  // ============================================================
  // 2. CARGAR DATOS
  // ============================================================
  async function cargar() {
    // Promise.all pide todo a la vez (más rápido que uno por uno)
        const r = await Promise.all([
      Api.getPerfil().catch(() => ({ habilidades: [], postulaciones: [], notificaciones: [], guardadas: [], aprendizaje: {} })), // Si falla, usamos perfil vacío para que no rompa
      Api.getEmpleos().catch(() => []),
      Api.getTransferencias().catch(() => []),
      Api.getRutas().catch(() => []),
      Api.getCursos().catch(() => []),
      Api.getCatalogos().catch(() => ({ educacion: [], sectores: [], tamanosEmpresa: [], modalidades: [], niveles: [], ciudades: [] })),
      Api.getCatalogoHabilidades().catch(() => [])
    ]);
    estado.sesion = Api.sesionActual() || estado.sesion;   // al día (el nombre puede haber cambiado)
    estado.perfil = r[0];
    estado.empleos = r[1];
    estado.transferencias = r[2];
    estado.rutas = r[3];
    estado.cursos = r[4];
    estado.catalogos = r[5];
    estado.catalogoHabilidades = r[6];

    // Compatibilidad del perfil con CADA oferta (lo hace el motor del punto 2)
    estado.ranking = Matching.rankearEmpleos(estado.perfil, estado.empleos, estado.transferencias);

        // Oferta de referencia
    const idObjetivo = estado.perfil.ofertaObjetivoId;
    estado.objetivo = idObjetivo 
      ? estado.ranking.find(function (fila) { return fila.empleo.id === String(idObjetivo); })
      : null;
      
    // Si no se encontró (o no había), usamos la mejor por defecto
    if (!estado.objetivo) {
      estado.objetivo = estado.ranking[0] || null;
    }
  }


  // ============================================================
  // 3. REGISTRO Y DIBUJO DE VISTAS
  // ============================================================
  function registrarVista(nombre, funcionDibujar) {
    renderizadores[nombre] = funcionDibujar;
  }

  // Aviso provisional para las vistas que todavía no se construyen
  function htmlPendiente() {
    return '<div class="panel vista-pendiente">' +
             '<p>Esta sección se construye en uno de los siguientes pasos del proyecto. Mientras tanto, puedes seguir usando el Panel.</p>' +
             '<button type="button" class="btn btn-primary btn-sm" data-ir="panel">Volver al Panel</button>' +
           '</div>';
  }

  // Dibuja UNA vista. Si falla, las demás siguen funcionando.
  function dibujarUna(nombre) {
    const contenedor = $(nombre + '-contenido');
    if (!contenedor) return;

    if (!renderizadores[nombre]) { contenedor.innerHTML = htmlPendiente(); return; }

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
  //   dashboard-aspirante.html#perfil
  //   dashboard-aspirante.html#empleos/j2    (j2 = parámetro)
  // ============================================================
  function leerHash() {
    const partes = global.location.hash.replace('#', '').split('/');
    const vista = VISTAS.indexOf(partes[0]) >= 0 ? partes[0] : 'panel';
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
    vistaActual = destino.vista;
    parametroActual = destino.parametro;

    VISTAS.forEach(function (nombre) { $('vista-' + nombre).hidden = nombre !== vistaActual; });

    document.querySelectorAll('.nav-item').forEach(function (boton) {
      if (boton.dataset.vista === vistaActual) boton.setAttribute('aria-current', 'page');
      else boton.removeAttribute('aria-current');
    });

    document.title = TITULOS[vistaActual] + ' · SkillMatch';

    // Al llegar a una vista la volvemos a dibujar: así siempre muestra datos al día, y las
    // vistas con parámetro (ej: #empleos/j2 = detalle de una oferta) cambian cuando cambia la URL.
    // (Si los datos aún no cargaron, no hay nada que dibujar: lo hará recargar() al terminar.)
    if (estado.perfil) dibujarUna(vistaActual);

    if (moverFoco) {
      try { global.scrollTo(0, 0); } catch (e) { /* ignorar */ }
      const titulo = document.querySelector('#vista-' + vistaActual + ' h1');
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
    const primerNombre = estado.sesion.nombre.split(' ')[0];
    $('saludo').textContent = saludoSegunHora() + ', ' + primerNombre;

    // Debajo del saludo: la meta y cuánto se ha avanzado hacia ella. Se ve en TODAS las vistas,
    // así la persona siente su avance sin tener que entrar al Career GPS.
    const ruta = estado.rutas.find(function (r) { return r.id === estado.perfil.rutaMetaId; });
    if (ruta) {
      const g = CareerGPS.generar(ruta, estado.perfil, estado.transferencias);
      $('saludo-sub').textContent = g.completa
        ? 'Tu ruta hacia ' + ruta.titulo + ': ¡meta alcanzada!'
        : 'Tu ruta hacia ' + ruta.titulo + ' · ' + g.meta.progreso + ' % de avance.';
    } else {
      $('saludo-sub').textContent = 'Aún no has elegido una ruta profesional.';
    }

    $('avatar-btn').textContent = Comun.iniciales(estado.sesion.nombre);
    $('avatar-btn').title = estado.sesion.nombre;
    $('menu-nombre').textContent = estado.sesion.nombre;
    $('menu-email').textContent = estado.sesion.email;
  }


  // ============================================================
  // 6. NOTIFICACIONES
  // ============================================================
  // Un ícono distinto según el tipo de aviso
  const ICONOS_NOTIF = {
    match: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" stroke="currentColor" stroke-width="1.7"/></svg>',
    gps:   '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reco:  '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a5.5 5.5 0 0 0-3 10.1c.5.4.8 1 .8 1.6v.3h4.4v-.3c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  };

  function dibujarNotificaciones() {
    const lista = estado.perfil.notificaciones.slice().sort(function (a, b) { return b.fecha - a.fecha; });
    const sinLeer = lista.filter(function (n) { return !n.leida; }).length;

    $('notif-dot').hidden = sinLeer === 0;
    $('notif-toggle').setAttribute('aria-label', sinLeer > 0 ? 'Notificaciones (' + sinLeer + ' sin leer)' : 'Notificaciones');
    $('notif-todas').disabled = sinLeer === 0;

    if (lista.length === 0) {
      $('notif-lista').innerHTML = '<p class="notif-empty">No tienes notificaciones.</p>';
      return;
    }

    $('notif-lista').innerHTML = lista.map(function (n) {
      return '<button type="button" class="notif-item' + (n.leida ? '' : ' is-unread') + '" data-notif="' + esc(n.id) + '">' +
               '<span class="notif-item-icon' + (n.tipo === 'reco' ? ' notif-item-icon--reco' : '') + '">' + (ICONOS_NOTIF[n.tipo] || ICONOS_NOTIF.match) + '</span>' +
               '<span><p class="notif-item-text"><strong>' + esc(n.titulo) + '</strong> ' + esc(n.texto) + '</p>' +
               '<span class="notif-item-time">' + esc(Comun.tiempoRelativo(n.fecha)) + '</span></span>' +
             '</button>';
    }).join('');
  }

  // Abrir una notificación: la marca como leída y lleva a la vista que corresponde
  $('notif-lista').addEventListener('click', async function (evento) {
    const item = evento.target.closest('[data-notif]');
    if (!item) return;

    const notif = estado.perfil.notificaciones.find(function (n) { return n.id === item.dataset.notif; });
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
    try {
      await Api.marcarTodasLeidas();
      await recargar();
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
    }
  });


  // ============================================================
  // 7. MENÚS DESPLEGABLES (abrir / cerrar)
  // ============================================================
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

  $('menu-perfil').addEventListener('click', function () { cerrarMenus(); navegar('perfil'); });

  $('menu-salir').addEventListener('click', async function () {
    await Api.logout();                         // borra la sesión
    global.location.replace('index.html');      // replace: "Atrás" no vuelve al panel
  });


  // ============================================================
  // 8. RECARGAR: pedir datos de nuevo y redibujar todo
  // ------------------------------------------------------------
  // Las vistas lo llaman después de cambiar algo (guardar una
  // oferta, postular, editar una habilidad...). Así TODAS las vistas
  // y las notificaciones quedan al día con un solo llamado.
  // ============================================================
  async function recargar() {
    try {
      await cargar();
      $('error-carga').hidden = true;
      dibujarCabecera();
      dibujarNotificaciones();
      dibujarVistas();
    } catch (error) {
      // Si la sesión ya no existe, al login
      if (!Api.sesionActual()) { global.location.replace('index.html'); return; }
      
      // Si el error es por un problema al cargar el perfil (ej: notificaciones),
      // lo ignoramos y dibujamos igual para que la página funcione.
      console.warn('Aviso al recargar (ignorado):', error.message);
      $('error-carga').hidden = true;
      dibujarCabecera();
      dibujarNotificaciones();
      dibujarVistas();
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
  // 9. ARRANQUE
  // ------------------------------------------------------------
  // Se ejecuta cuando la página terminó de cargar (así las vistas,
  // que se cargan después de este archivo, ya están registradas).
  // ============================================================
  async function iniciar() {
    // Guardia de seguridad: sin sesión de aspirante, redirige y devuelve null
    const sesion = Api.exigirRol('aspirante');
    if (!sesion) return;
    estado.sesion = sesion;

    Comun.vincularBotonTema($('theme-toggle'));
    mostrarVista(false);
    await recargar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  global.Aspirante = {
    estado: estado,
    registrarVista: registrarVista,
    recargar: recargar,
    navegar: navegar,
    parametro: function () { return parametroActual; }
  };

})(window);
