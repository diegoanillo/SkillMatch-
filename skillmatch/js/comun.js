/* ============================================================
   comun.js  →  HERRAMIENTAS COMPARTIDAS POR TODAS LAS PANTALLAS
   ============================================================
   Cosas que login, panel del aspirante y panel del reclutador
   necesitan por igual, para no copiar el mismo código tres veces
   (una regla de oro de programación: DRY, "Don't Repeat Yourself").

   Contiene:
     - Tema día / noche (se recuerda entre visitas)
     - esc(): protege contra inyección de código (¡importante!)
     - Mensajes emergentes ("toasts")
     - Formato de fechas y nombres
   ============================================================ */

(function (global) {
  'use strict';

  const CLAVE_TEMA = 'skillmatch_tema';


  // ==========================================================
  // TEMA DÍA / NOCHE
  // ==========================================================

  // Este código se ejecuta apenas carga el archivo (estando en el <head>),
  // antes de que se dibuje la página. Así evitamos el "parpadeo" de ver
  // un instante el tema equivocado.
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado) document.documentElement.setAttribute('data-theme', guardado);
  } catch (e) { /* si el navegador bloquea localStorage, seguimos sin tema guardado */ }

  // ¿Qué tema se está viendo ahora? Si la persona nunca eligió,
  // usamos la preferencia de su sistema operativo.
  function temaActual() {
    const elegido = document.documentElement.getAttribute('data-theme');
    if (elegido) return elegido;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function aplicarTema(tema, boton) {
    document.documentElement.setAttribute('data-theme', tema);
    try { localStorage.setItem(CLAVE_TEMA, tema); } catch (e) { /* ignorar */ }
    if (boton) actualizarBotonTema(boton);
  }

  function actualizarBotonTema(boton) {
    const esClaro = temaActual() === 'light';
    boton.title = esClaro ? 'Cambiar a modo noche' : 'Cambiar a modo día';
    boton.setAttribute('aria-label', boton.title);
  }

  // Conecta un botón para que alterne el tema al hacer clic
  function vincularBotonTema(boton) {
    actualizarBotonTema(boton);
    boton.addEventListener('click', function () {
      aplicarTema(temaActual() === 'light' ? 'dark' : 'light', boton);
    });
  }


  // ==========================================================
  // SEGURIDAD: esc()
  // ==========================================================
  // Si un usuario escribe como nombre de habilidad: <img src=x onerror=alert(1)>
  // y nosotros lo metemos tal cual en la página con innerHTML, el navegador
  // EJECUTARÍA ese código (ataque "XSS"). esc() convierte los caracteres
  // peligrosos (< > & " ') en texto inofensivo.
  // REGLA: todo texto que venga de una persona se pasa por esc() antes
  // de insertarlo con innerHTML.
  const MAPA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) { return MAPA_ESCAPE[c]; });
  }


  // ==========================================================
  // TEXTOS Y FECHAS
  // ==========================================================

  // "María Gómez" → "MG"
  function iniciales(nombre) {
    const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // Convierte una marca de tiempo en "Hace 2 horas", "Ayer", etc.
  function tiempoRelativo(marca) {
    const minutos = Math.floor((Date.now() - marca) / 60000);
    if (minutos < 1)  return 'Hace un momento';
    if (minutos < 60) return 'Hace ' + minutos + (minutos === 1 ? ' minuto' : ' minutos');
    const horas = Math.floor(minutos / 60);
    if (horas < 24)   return 'Hace ' + horas + (horas === 1 ? ' hora' : ' horas');
    const dias = Math.floor(horas / 24);
    if (dias === 1)   return 'Ayer';
    if (dias < 30)    return 'Hace ' + dias + ' días';
    const meses = Math.floor(dias / 30);
    return 'Hace ' + meses + (meses === 1 ? ' mes' : ' meses');
  }

  // "2026-10-12T15:30:00Z" → "12 de octubre de 2026"
  function formatearFecha(iso) {
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // 3 → "3 semanas" · 14 → "~3 meses" · 0 → "Listo"
  function formatearSemanas(semanas) {
    if (semanas <= 0) return 'Listo';
    if (semanas < 8)  return semanas + (semanas === 1 ? ' semana' : ' semanas');
    const meses = Math.round(semanas / 4.3);
    return '~' + meses + (meses === 1 ? ' mes' : ' meses');
  }


  // ==========================================================
  // MENSAJES EMERGENTES ("toasts")
  // ==========================================================
  // tipo: 'ok' (por defecto) o 'error'
  function mostrarToast(mensaje, tipo) {
    let zona = document.getElementById('toast-zone');

    // Creamos la zona la primera vez que se necesita.
    // role="status" + aria-live: los lectores de pantalla anuncian el mensaje.
    if (!zona) {
      zona = document.createElement('div');
      zona.id = 'toast-zone';
      zona.className = 'toast-zone';
      zona.setAttribute('role', 'status');
      zona.setAttribute('aria-live', 'polite');
      document.body.appendChild(zona);
    }

    const toast = document.createElement('div');
    toast.className = 'toast' + (tipo === 'error' ? ' toast--error' : '');
    toast.textContent = mensaje;
    zona.appendChild(toast);

    // Desaparece solo a los 4 segundos
    setTimeout(function () { toast.remove(); }, 4000);
  }


  // Texto del nivel de una habilidad (1 a 10):
  // 1-3 básico · 4-6 intermedio · 7-8 avanzado · 9-10 experto
  function etiquetaNivel(n) {
    if (n <= 3) return 'Básico';
    if (n <= 6) return 'Intermedio';
    if (n <= 8) return 'Avanzado';
    return 'Experto';
  }

  global.Comun = {
    vincularBotonTema: vincularBotonTema,
    esc: esc,
    iniciales: iniciales,
    tiempoRelativo: tiempoRelativo,
    formatearFecha: formatearFecha,
    formatearSemanas: formatearSemanas,
    mostrarToast: mostrarToast,
    etiquetaNivel: etiquetaNivel
  };

})(window);
