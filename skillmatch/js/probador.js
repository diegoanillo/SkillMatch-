/* ============================================================
   probador.js  →  LÓGICA DEL LABORATORIO DE PRUEBAS
   ============================================================
   Conecta las piezas que construimos:

     Api.analizarVacante / Api.analizarPerfil   (texto → habilidades)
     Matching.calcular / Matching.rankearEmpleos (habilidades → %)

   Flujo:  texto → análisis → (la persona corrige) → cálculo → pantalla

   Esta página usa crearDatosDemo() directamente (sin iniciar sesión)
   porque es una herramienta de desarrollo. Las pantallas reales
   siempre pedirán los datos a través de Api.
   ============================================================ */


// ============================================================
// 1. TEXTOS DE EJEMPLO
// ============================================================
const EJEMPLOS_VACANTE = [
  // 0: el caso que motivó todo: casi sin información
  'Se busca persona para servicios generales en una empresa. Presencial, tiempo completo.',

  // 1: con lista de requisitos y una habilidad que el diccionario no conoce
  'Necesitamos auxiliar de bodega.\nRequisitos:\n- Manejo de montacargas\n- Licencia de conducción C1\n- Control de inventarios\nDeseable: curso de seguridad y salud en el trabajo.\nSe requiere 1 año de experiencia. Presencial.',

  // 2: con niveles explícitos, deseables y "sin experiencia"
  'Buscamos analista con Excel avanzado y SQL intermedio. Se valora Power BI y buena comunicación. Sin experiencia previa. Trabajo remoto.',

  // 3: texto corto
  'Restaurante busca mesero con disponibilidad de fines de semana, 6 meses de experiencia.'
];

const EJEMPLOS_PERFIL = {
  aseo: 'Trabajé 2 años en limpieza de oficinas y edificios. Manejo productos de limpieza y sé clasificar residuos. Soy responsable y puntual.',
  mesero: 'Tengo 3 años de experiencia como mesero en restaurantes. Soy responsable, puntual y trabajo bien en equipo. Manejo Excel básico.'
};


// ============================================================
// 2. ESTADO DE LA PÁGINA
// ------------------------------------------------------------
// "estado" guarda lo que la persona está probando ahora mismo.
// Cada vez que cambia algo, se vuelve a calcular y dibujar.
// ============================================================
const datos = window.crearDatosDemo();       // transferencias y ofertas de demostración

const estado = {
  vacante: null,   // { habilidades: [...], experienciaMin, resumen, advertencias }
  perfil: null     // { habilidades: [...], experienciaAnios, resumen, advertencias }
};

// Atajo para buscar elementos por id
function el(id) { return document.getElementById(id); }

// Convierte texto en HTML seguro (evita que algo escrito rompa la página)
function esc(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ============================================================
// 3. ANALIZAR TEXTO
// ============================================================

// tipo = 'vacante' o 'perfil'
async function analizar(tipo) {
  const boton = el('btn-' + tipo);
  const mensaje = el('estado-' + tipo);
  const texto = el('texto-' + tipo).value;

  boton.disabled = true;
  mensaje.textContent = 'Analizando…';

  try {
    // Fíjate: llamamos a Api (no a Analisis directamente). Cuando exista
    // el backend, esta misma línea hablará con la IA real.
    const r = tipo === 'vacante' ? await Api.analizarVacante(texto) : await Api.analizarPerfil(texto);

    if (tipo === 'vacante') {
      estado.vacante = {
        habilidades: r.habilidades,
        experienciaMin: r.experienciaMin === null ? 0 : r.experienciaMin,
        resumen: r.resumen,
        advertencias: r.advertencias
      };
    } else {
      estado.perfil = {
        habilidades: r.habilidades,
        experienciaAnios: r.experienciaAnios === null ? 0 : r.experienciaAnios,
        resumen: r.resumen,
        advertencias: r.advertencias
      };
    }
    mensaje.textContent = '';
  } catch (error) {
    mensaje.textContent = error.message;   // Api lanza errores con mensaje listo para mostrar
  }

  boton.disabled = false;
  dibujarTodo();
}

// Carga el perfil de María (ya estructurado, no hace falta analizar texto)
function cargarPerfilMaria() {
  const p = datos.perfiles.u1;
  estado.perfil = {
    habilidades: p.habilidades.map(function (h) {
      return { nombre: h.nombre, nivel: h.nivel, origen: 'perfil', evidencia: 'Perfil guardado' };
    }),
    experienciaAnios: p.experienciaAnios,
    resumen: 'Perfil de demostración con ' + p.habilidades.length + ' habilidades.',
    advertencias: []
  };
}


// ============================================================
// 4. DIBUJAR "LO DETECTADO" (vacante o perfil)
// ============================================================
function chipOrigen(origen) {
  if (origen === 'texto') return '<span class="chip chip-match">En el texto</span>';
  if (origen === 'cargo') return '<span class="chip chip-mid">Del cargo</span>';
  if (origen === 'frase') return '<span class="chip chip-gap">Nueva</span>';
  return '<span class="chip chip-neutral">Perfil</span>';
}

function dibujarDetectado(tipo) {
  const contenedor = el('detectado-' + tipo);
  const datosTipo = estado[tipo];

  if (!datosTipo) { contenedor.innerHTML = ''; return; }

  const esVacante = tipo === 'vacante';
  let html = '<div class="pb-detected">';
  html += '<p class="pb-summary">' + esc(datosTipo.resumen) + '</p>';

  datosTipo.advertencias.forEach(function (a) {
    html += '<p class="pb-warn">' + esc(a) + '</p>';
  });

  // Campo de experiencia (se puede corregir a mano)
  const campoExp = esVacante ? 'experienciaMin' : 'experienciaAnios';
  html += '<div class="pb-meta"><label>' +
          (esVacante ? 'Experiencia mínima (años)' : 'Años de experiencia') +
          ' <input type="number" min="0" max="40" step="0.5" class="pb-num" data-campo="' + campoExp + '" value="' + datosTipo[campoExp] + '"></label></div>';

  if (datosTipo.habilidades.length === 0) {
    html += '<p class="pb-empty">No hay habilidades. Prueba con otro texto.</p>';
  }

  // Una fila por habilidad: nombre, de dónde salió, nivel, obligatoria, quitar
  datosTipo.habilidades.forEach(function (h, i) {
    html += '<div class="pb-skill" data-i="' + i + '">' +
              '<span class="pb-skill-name">' + esc(h.nombre) +
                '<span class="pb-skill-evidence">' + esc(h.evidencia || '') + '</span></span>' +
              chipOrigen(h.origen) +
              '<input type="number" min="1" max="10" class="pb-num" data-campo="nivel" value="' + h.nivel + '" aria-label="Nivel de ' + esc(h.nombre) + '">' +
              (esVacante
                ? '<label class="pb-check"><input type="checkbox" data-campo="obligatoria"' + (h.obligatoria ? ' checked' : '') + '> obligatoria</label>'
                : '') +
              '<button type="button" class="icon-btn icon-btn--sm" data-accion="quitar" aria-label="Quitar ' + esc(h.nombre) + '" title="Quitar">' +
                '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
              '</button>' +
            '</div>';
  });

  html += '</div>';
  contenedor.innerHTML = html;
}

// "Delegación de eventos": en vez de poner un escuchador en cada fila,
// ponemos UNO en el contenedor y miramos qué elemento recibió el cambio.
// Es más simple y funciona aunque las filas se vuelvan a dibujar.
function conectarEdicion(tipo) {
  const contenedor = el('detectado-' + tipo);

  contenedor.addEventListener('change', function (evento) {
    const campo = evento.target.dataset.campo;
    const datosTipo = estado[tipo];
    if (!campo || !datosTipo) return;

    if (campo === 'experienciaMin' || campo === 'experienciaAnios') {
      datosTipo[campo] = Math.max(0, parseFloat(evento.target.value) || 0);
    } else {
      const fila = evento.target.closest('.pb-skill');
      const habilidad = datosTipo.habilidades[Number(fila.dataset.i)];
      if (campo === 'nivel') {
        habilidad.nivel = Math.min(10, Math.max(1, parseInt(evento.target.value, 10) || 1));
      } else if (campo === 'obligatoria') {
        habilidad.obligatoria = evento.target.checked;
      }
    }
    dibujarTodo();
  });

  contenedor.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-accion="quitar"]');
    if (!boton) return;
    const fila = boton.closest('.pb-skill');
    estado[tipo].habilidades.splice(Number(fila.dataset.i), 1);
    dibujarTodo();
  });
}


// ============================================================
// 5. DIBUJAR EL RESULTADO
// ============================================================
const RANGO_ESTADO = { brecha: 0, transferible: 1, parcial: 2, cumple: 3 };

function chipEstado(est) {
  if (est === 'cumple')       return '<span class="chip chip-match">Cumple</span>';
  if (est === 'parcial')      return '<span class="chip chip-mid">Cerca</span>';
  if (est === 'transferible') return '<span class="chip chip-mid">Transferible</span>';
  return '<span class="chip chip-gap">Brecha</span>';
}

function claseBarra(est) {
  if (est === 'brecha') return ' bar-fill--gap';
  if (est === 'cumple') return '';
  return ' bar-fill--mid';
}

// Calcula la compatibilidad del perfil actual con la vacante actual
function calcularActual() {
  return Matching.calcular(
    estado.perfil.habilidades,
    estado.vacante.habilidades,
    datos.transferencias,
    { experienciaAnios: estado.perfil.experienciaAnios, experienciaMin: estado.vacante.experienciaMin }
  );
}

function dibujarResultado() {
  const contenedor = el('resultado');

  if (!estado.vacante || !estado.perfil) {
    contenedor.innerHTML = '<p class="pb-empty">Analiza una vacante y elige un perfil para ver el resultado.</p>';
    return;
  }
  if (estado.vacante.habilidades.length === 0) {
    contenedor.innerHTML = '<p class="pb-empty">La vacante no tiene habilidades. Analiza otro texto o agrega alguna.</p>';
    return;
  }

  const r = calcularActual();
  const clase = r.nivel === 'alta' ? '' : (r.nivel === 'media' ? ' is-mid' : ' is-low');
  const chipNivel = r.nivel === 'alta' ? 'chip-match' : (r.nivel === 'media' ? 'chip-mid' : 'chip-gap');

  let html = '<div class="pb-score">' +
    '<div><div class="pb-score-num' + clase + '">' + r.puntaje + '<small>%</small></div>' +
    '<span class="chip ' + chipNivel + '" style="margin-top:8px">Compatibilidad ' + r.nivel + '</span></div>' +
    '<div class="pb-minibars">' +
      '<div><div class="pb-minibar-top"><span>Lo que cumples hoy</span><span>' + r.puntajeActual + '%</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + r.puntajeActual + '%"></div></div></div>' +
      '<div><div class="pb-minibar-top"><span>Tu potencial (con lo que podrías aprender)</span><span>' + r.puntajePotencial + '%</span></div>' +
        '<div class="bar-track"><div class="bar-fill bar-fill--mid" style="width:' + r.puntajePotencial + '%"></div></div></div>' +
    '</div></div>';

  html += '<p class="pb-summary">' + esc(r.resumen) + '</p>';

  if (r.aniosFaltantes > 0) {
    html += '<p class="pb-warn">Faltan ' + r.aniosFaltantes + (r.aniosFaltantes === 1 ? ' año' : ' años') +
            ' de experiencia: el porcentaje se multiplica por ' + r.factorExperiencia + '.</p>';
  }

  // Detalle: primero lo que más falta
  const filas = r.desglose.slice().sort(function (a, b) {
    return RANGO_ESTADO[a.estado] - RANGO_ESTADO[b.estado];
  });

  html += '<div class="pb-detail">';
  filas.forEach(function (d) {
    html += '<div class="pb-detail-row">' +
      '<div class="pb-detail-top">' +
        '<span class="pb-detail-name">' + esc(d.nombre) + (d.obligatoria ? '' : ' <span class="chip chip-neutral">opcional</span>') + '</span>' +
        '<span>' + chipEstado(d.estado) + ' <span class="pb-detail-levels">tienes ' + d.nivelUsuario + ' · pide ' + d.nivelRequerido + '</span></span>' +
      '</div>' +
      '<div class="bar-track"><div class="bar-fill' + claseBarra(d.estado) + '" style="width:' + Math.round(d.credito * 100) + '%"></div></div>' +
      '<p class="pb-detail-text">' + esc(d.explicacion) + '</p>' +
    '</div>';
  });
  html += '</div>';

  contenedor.innerHTML = html;
}


// ============================================================
// 6. RANKING contra las ofertas de demostración
// ============================================================
function dibujarRanking() {
  const contenedor = el('ranking');
  if (!estado.perfil) { contenedor.innerHTML = '<p class="pb-empty">Elige un perfil.</p>'; return; }

  // Juntamos las ofertas de demostración con la vacante que se está probando
  const empleos = datos.empleos.slice();
  if (estado.vacante && estado.vacante.habilidades.length > 0) {
    empleos.push({
      id: 'mia', titulo: 'Tu vacante analizada', empresa: 'La que escribiste arriba',
      experienciaMin: estado.vacante.experienciaMin, habilidades: estado.vacante.habilidades
    });
  }

  const ranking = Matching.rankearEmpleos(estado.perfil, empleos, datos.transferencias);

  contenedor.innerHTML = ranking.map(function (fila) {
    const r = fila.resultado;
    const chip = r.nivel === 'alta' ? 'chip-match' : (r.nivel === 'media' ? 'chip-mid' : 'chip-gap');
    return '<div class="pb-rank-row' + (fila.empleo.id === 'mia' ? ' is-mine' : '') + '">' +
      '<span class="pb-rank-num">' + r.puntaje + '%</span>' +
      '<span class="pb-rank-title">' + esc(fila.empleo.titulo) + '<span class="pb-rank-sub">' + esc(fila.empleo.empresa) + '</span></span>' +
      '<span class="chip ' + chip + '">' + r.nivel + '</span>' +
    '</div>';
  }).join('');
}

function dibujarTodo() {
  dibujarDetectado('vacante');
  dibujarDetectado('perfil');
  dibujarResultado();
  dibujarRanking();
}


// ============================================================
// 7. CONTROLES DE LA PÁGINA
// ============================================================

// --- Ejemplos de vacante ---
el('ejemplo-vacante').addEventListener('change', function () {
  el('texto-vacante').value = EJEMPLOS_VACANTE[Number(this.value)];
  analizar('vacante');
});
el('btn-vacante').addEventListener('click', function () { analizar('vacante'); });

// --- Selector de perfil ---
el('ejemplo-perfil').addEventListener('change', function () {
  const opcion = this.value;
  const area = el('texto-perfil');
  const acciones = el('acciones-perfil');

  if (opcion === 'maria') {
    area.hidden = true;
    acciones.hidden = true;
    cargarPerfilMaria();
    dibujarTodo();
    return;
  }

  area.hidden = false;
  acciones.hidden = false;
  area.value = opcion === 'libre' ? '' : EJEMPLOS_PERFIL[opcion];
  if (opcion !== 'libre') analizar('perfil');
  else { estado.perfil = null; dibujarTodo(); area.focus(); }
});
el('btn-perfil').addEventListener('click', function () { analizar('perfil'); });

conectarEdicion('vacante');
conectarEdicion('perfil');


// --- Ajustes del algoritmo ---
// Guardamos los valores originales para poder "Restablecer".
const ORIGINAL = {
  potencial: Matching.CONFIG.PESO_POTENCIAL,
  porAnio: Matching.CONFIG.PENALIZ_POR_ANIO,
  maxima: Matching.CONFIG.PENALIZ_MAXIMA
};

function sincronizarAjustes() {
  el('ajuste-potencial').value = Math.round(Matching.CONFIG.PESO_POTENCIAL * 100);
  el('ajuste-experiencia').value = Math.round(Matching.CONFIG.PENALIZ_POR_ANIO * 100);
  el('valor-potencial').textContent = Math.round(Matching.CONFIG.PESO_POTENCIAL * 100) + ' %';
  el('valor-experiencia').textContent = Math.round(Matching.CONFIG.PENALIZ_POR_ANIO * 100) + ' %';
}

el('ajuste-potencial').addEventListener('input', function () {
  Matching.CONFIG.PESO_POTENCIAL = Number(this.value) / 100;
  sincronizarAjustes();
  dibujarTodo();
});

el('ajuste-experiencia').addEventListener('input', function () {
  const porAnio = Number(this.value) / 100;
  Matching.CONFIG.PENALIZ_POR_ANIO = porAnio;
  // El tope total sube con la penalización por año (y es 0 si se ignora la experiencia)
  Matching.CONFIG.PENALIZ_MAXIMA = porAnio === 0 ? 0 : Math.max(ORIGINAL.maxima, porAnio * 3);
  sincronizarAjustes();
  dibujarTodo();
});

el('btn-restablecer').addEventListener('click', function () {
  Matching.CONFIG.PESO_POTENCIAL = ORIGINAL.potencial;
  Matching.CONFIG.PENALIZ_POR_ANIO = ORIGINAL.porAnio;
  Matching.CONFIG.PENALIZ_MAXIMA = ORIGINAL.maxima;
  sincronizarAjustes();
  dibujarTodo();
});


// --- Tema día / noche (usa la misma preferencia guardada que el login) ---
el('theme-toggle').addEventListener('click', function () {
  const actual = document.documentElement.getAttribute('data-theme');
  const nuevo = actual === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', nuevo);
  localStorage.setItem('skillmatch_tema', nuevo);
});
const temaGuardado = localStorage.getItem('skillmatch_tema');
if (temaGuardado) document.documentElement.setAttribute('data-theme', temaGuardado);


// ============================================================
// 8. ARRANQUE: al abrir la página dejamos todo ya probado
// ============================================================
sincronizarAjustes();
cargarPerfilMaria();
el('texto-vacante').value = EJEMPLOS_VACANTE[0];
analizar('vacante');   // al terminar, dibuja todo
