(function () {
  'use strict';

  const widget = document.getElementById('chat-widget');
  if (!widget) return; // Si no existe, no hace nada

  const titulo = document.getElementById('chat-titulo');
  const cuerpo = document.getElementById('chat-mensajes');
  const input = document.getElementById('chat-input');
  const btnEnviar = document.getElementById('chat-enviar');
  const btnCerrar = document.getElementById('chat-cerrar');

  let contexto = null; // { otroId, vacanteId, nombreOtro }
  let intervalo = null;

  function cargarHistorial() {
    if (!contexto) return;
    Api.obtenerHistorialChat(contexto.otroId, contexto.vacanteId).then(function (mensajes) {
      const sesion = Api.sesionActual();
      cuerpo.innerHTML = mensajes.map(function (m) {
        const esMio = String(m.remitente_id) === String(sesion.id);
        return '<div class="chat-msg ' + (esMio ? 'mine' : 'theirs') + '">' + Comun.esc(m.texto) + '</div>';
      }).join('');
      cuerpo.scrollTop = cuerpo.scrollHeight;
    }).catch(function (err) {
      console.error('Error cargando chat:', err);
    });
  }

  function abrirChat(otroId, vacanteId, nombreOtro) {
    contexto = { otroId: otroId, vacanteId: vacanteId, nombreOtro: nombreOtro };
    titulo.textContent = 'Chat con ' + nombreOtro;
    widget.hidden = false;
    cargarHistorial();
    clearInterval(intervalo);
    intervalo = setInterval(cargarHistorial, 3000); // Recargar cada 3 segundos
  }

  function cerrarChat() {
    widget.hidden = true;
    contexto = null;
    clearInterval(intervalo);
  }

  // AQUÍ ESTÁ LA CORRECCIÓN: Enganchamos el evento click del botón de cerrar
  btnCerrar.addEventListener('click', cerrarChat);

  btnEnviar.addEventListener('click', function () {
    if (!contexto) return;
    const texto = input.value.trim();
    if (texto === '') return;
    input.value = '';
    
    // 1. Enviamos el mensaje
    Api.enviarMensajeChat(contexto.otroId, contexto.vacanteId, texto).then(function () {
      cargarHistorial();

      // 2. Si quien escribe es el RECLUTADOR, actualizamos el estado a "Contactado"
      const sesion = Api.sesionActual();
      if (sesion && sesion.rol === 'reclutador') {
        Api.cambiarEstadoPostulacion({
          aspiranteId: contexto.otroId,
          vacanteId: contexto.vacanteId,
          estado: 'Contactado',
          mensaje: null // Sin mensaje verde
        }).then(function () {
          // Recargamos la vista de candidatos para que se vea el cambio de estado
          if (typeof Reclutador !== 'undefined' && Reclutador.recargar) {
            Reclutador.recargar();
          }
        }).catch(function (err) {
          console.error('Error actualizando estado desde chat:', err);
        });
      }
    }).catch(function (err) {
      alert(err.message);
    });
  });
  
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') btnEnviar.click();
  });

  // Exponer la función para que otras vistas (como candidatos o empleos) puedan abrir el chat
  window.Chat = {
    abrir: abrirChat,
    cerrar: cerrarChat
  };

})();