/* ============================================================
   login.js  →  EL "CEREBRO" DE LA PANTALLA DE LOGIN
   ============================================================
   Esta pantalla ya NO sabe nada de cuentas ni contraseñas: le
   pregunta a la capa de servicios (api.js) con Api.login(...).
   Hoy esa capa responde con datos de prueba; mañana responderá
   el backend real, y este archivo no tendrá que cambiar.

   Secciones:
     1. Textos que cambian según el rol
     2. Buscar los elementos del HTML
     3. Si ya hay sesión iniciada, saltar el login
     4. Cambio de rol (Aspirante / Reclutador)
     5. Mostrar / ocultar contraseña
     6. Envío del formulario
   ============================================================ */

// ============================================================
// 1. TEXTOS POR ROL
// ============================================================
const textosPorRol = {
  aspirante: {
    titulo: 'Lo que puedes llegar a hacer también cuenta.',
    texto:  'Descubre oportunidades según tu potencial y recibe una ruta clara para llegar a ellas.',
    boton:  'Entrar como aspirante'
  },
  reclutador: {
    titulo: 'Encuentra talento más allá de los años de experiencia.',
    texto:  'Descubre candidatos por sus habilidades transferibles y su capacidad de aprender.',
    boton:  'Entrar como reclutador'
  }
};


// ============================================================
// 2. BUSCAR LOS ELEMENTOS DEL HTML
// document.getElementById('x') busca el elemento con id="x".
// ============================================================
const formulario   = document.getElementById('login-form');
const inputEmail   = document.getElementById('email');
const inputPass    = document.getElementById('password');
const botonMostrar = document.getElementById('show-pass');
const botonEnviar  = document.getElementById('submit-btn');
const mensajeError = document.getElementById('form-error');
const asideTitulo  = document.getElementById('aside-title');
const asideTexto   = document.getElementById('aside-text');
const botonTema    = document.getElementById('theme-toggle');
const radiosRol    = document.querySelectorAll('input[name="rol"]');


// ============================================================
// 3. SI YA HAY SESIÓN, NO HACE FALTA VER EL LOGIN
// ============================================================
const sesionExistente = Api.sesionActual();
if (sesionExistente) {
  // location.replace cambia de página sin dejar el login en el historial
  window.location.replace(Api.paginaPorRol[sesionExistente.rol]);
}


// ============================================================
// 4. CAMBIO DE ROL
// ============================================================
function rolSeleccionado() {
  return document.querySelector('input[name="rol"]:checked').value;
}

function actualizarTextosPorRol() {
  const textos = textosPorRol[rolSeleccionado()];
  asideTitulo.textContent = textos.titulo;
  asideTexto.textContent  = textos.texto;
  botonEnviar.textContent = textos.boton;
  // El enlace "Crear cuenta" lleva el rol elegido: registro.html?rol=reclutador
  document.getElementById('link-registro').href = 'registro.html?rol=' + rolSeleccionado();
  ocultarError();
}

// 'change' se dispara cuando la persona elige el otro rol
radiosRol.forEach(function (radio) {
  radio.addEventListener('change', actualizarTextosPorRol);
});


// ============================================================
// 5. MOSTRAR / OCULTAR CONTRASEÑA
// ============================================================
botonMostrar.addEventListener('click', function () {
  // type="password" muestra puntitos; type="text" muestra las letras
  const estaOculta = inputPass.type === 'password';
  inputPass.type = estaOculta ? 'text' : 'password';
  botonMostrar.textContent = estaOculta ? 'Ocultar' : 'Mostrar';
  botonMostrar.setAttribute('aria-label', estaOculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
});


// ============================================================
// 6. ENVÍO DEL FORMULARIO
// ============================================================
function mostrarError(mensaje, campo) {
  mensajeError.textContent = mensaje;
  mensajeError.hidden = false;
  if (campo) {
    campo.classList.add('has-error');
    campo.focus();             // lleva el cursor al campo con el problema
  }
}

function ocultarError() {
  mensajeError.hidden = true;
  inputEmail.classList.remove('has-error');
  inputPass.classList.remove('has-error');
}

// "async" permite usar "await": esperar la respuesta de Api.login
// sin congelar la página (con un servidor real tardaría un poco).
formulario.addEventListener('submit', async function (evento) {

  // Un formulario normal recarga la página al enviarse; lo cancelamos
  evento.preventDefault();
  ocultarError();

  const email    = inputEmail.value.trim().toLowerCase();
  const password = inputPass.value;
  const rol      = rolSeleccionado();

  // --- Validaciones rápidas (antes de molestar al servidor) ---
  if (email === '') {
    mostrarError('Escribe tu correo electrónico.', inputEmail);
    return;                    // "return" detiene la función aquí
  }

  const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // algo@algo.algo
  if (!formatoCorreo.test(email)) {
    mostrarError('El correo no parece válido. Revisa que tenga @ y un dominio, por ejemplo nombre@correo.com.', inputEmail);
    return;
  }

  if (password === '') {
    mostrarError('Escribe tu contraseña.', inputPass);
    return;
  }

  // --- Pedirle la verificación a la capa de servicios ---
  botonEnviar.disabled = true;
  botonEnviar.textContent = 'Entrando…';

  try {
    const sesion = await Api.login(email, password, rol);
    // Éxito: enviamos a la persona a la pantalla de su rol
    window.location.href = Api.paginaPorRol[sesion.rol];
  } catch (error) {
    // Api.login lanza un Error con el mensaje listo para mostrar
    botonEnviar.disabled = false;
    botonEnviar.textContent = textosPorRol[rol].boton;
    mostrarError(error.message);
  }
});


// ============================================================
// TEMA DÍA / NOCHE (la lógica vive en comun.js)
// ============================================================
Comun.vincularBotonTema(botonTema);
