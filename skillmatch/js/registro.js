/* ============================================================
   registro.js  →  EL "CEREBRO" DEL ASISTENTE DE REGISTRO
   ============================================================
   Qué hace este archivo, en orden:
     1. Define los pasos de cada tipo de usuario.
     2. Muestra un paso a la vez y lleva el progreso.
     3. Valida cada paso antes de dejar avanzar.
     4. En "Habilidades": permite contarlas con palabras propias
        (Api.analizarPerfil, el análisis del Punto 3) o elegirlas de
        la lista, y unifica sinónimos con Diccionario (Punto 2).
     5. En "Tu meta": calcula compatibilidades reales con
        Matching.rankearEmpleos (Punto 2), usando lo recién ingresado.
     6. Al final crea la cuenta con Api.registrar(...).

   REGLA DE ORO (igual que en todo el proyecto): esta pantalla NO toca
   datos directamente. Todo lo pide a Api. Cuando exista el backend,
   no hará falta cambiar nada aquí.

   IMPORTANTE: las validaciones de aquí son solo una comodidad (avisan
   rápido). La autoridad es SIEMPRE el backend: Api.registrar repite
   todas las reglas, porque cualquiera podría saltarse esta pantalla.
   ============================================================ */

(function () {
  'use strict';

  // Atajo para buscar un elemento por su id
  const $ = function (id) { return document.getElementById(id); };

  // esc() convierte texto en HTML seguro. Se usa SIEMPRE que metemos
  // texto escrito por una persona dentro de innerHTML.
  const esc = Comun.esc;


  // ============================================================
  // 1. LOS PASOS DE CADA ROL Y LOS TEXTOS LATERALES
  // ------------------------------------------------------------
  // "id" coincide con el id de la sección en registro.html:
  //   id: 'sobre-ti'  →  <div id="paso-sobre-ti">
  // ============================================================
  const PASOS = {
    aspirante: [
      { id: 'cuenta',      nombre: 'Tu cuenta' },
      { id: 'sobre-ti',    nombre: 'Sobre ti' },
      { id: 'habilidades', nombre: 'Habilidades' },
      { id: 'meta',        nombre: 'Tu meta' }
    ],
    reclutador: [
      { id: 'cuenta',  nombre: 'Tu cuenta' },
      { id: 'empresa', nombre: 'Tu empresa' }
    ]
  };

  const TEXTOS_LATERALES = {
    aspirante: {
      titulo: 'Cuéntanos lo que sabes hacer.',
      texto: 'Con tus habilidades calculamos qué tan compatible eres con cada oferta y qué te falta para llegar a la que quieres.'
    },
    reclutador: {
      titulo: 'Encuentra talento más allá del currículum.',
      texto: 'Publica vacantes y te mostraremos candidatos por habilidades y potencial, no solo por años de experiencia.'
    }
  };

  const MINIMO_HABILIDADES = 3;
  const MAXIMO_HABILIDADES = 30;


  // ============================================================
  // 2. ESTADO: lo que la persona lleva ingresado
  // ------------------------------------------------------------
  // Los campos de texto se leen directo del formulario cuando hace
  // falta. Aquí solo guardamos lo que NO vive en un campo simple.
  // ============================================================
  const estado = {
    rol: 'aspirante',
    indice: 0,                // en qué paso va (0 = el primero)
    habilidades: [],          // [{ nombre, categoria, nivel, origen, nueva }]
    metaId: null,             // id de la ruta elegida (o null)
    ocupado: false,           // true mientras se valida o se guarda (evita dobles clics)

    // Datos que llegan de Api al cargar la página:
    catalogoHabilidades: [],
    rutas: [],
    empleos: [],
    transferencias: []
  };

  function pasos() { return PASOS[estado.rol]; }
  function pasoActual() { return pasos()[estado.indice]; }
  function esUltimoPaso() { return estado.indice === pasos().length - 1; }


  // ============================================================
  // 3. ERRORES
  // ------------------------------------------------------------
  // Un error se muestra en el recuadro rojo general y, si se
  // indica el campo, se marca ese campo y se lleva el cursor a él.
  // ============================================================
  function limpiarError() {
    $('form-error').hidden = true;
    document.querySelectorAll('.has-error').forEach(function (e) { e.classList.remove('has-error'); });
  }

  function fallar(mensaje, idCampo) {
    const caja = $('form-error');
    caja.textContent = mensaje;
    caja.hidden = false;
    if (idCampo && $(idCampo)) {
      $(idCampo).classList.add('has-error');
      $(idCampo).focus();
    }
  }


  // ============================================================
  // 4. MOSTRAR UN PASO
  // ============================================================
  function dibujarStepper() {
    $('stepper').innerHTML = pasos().map(function (paso, i) {
      const clase = i < estado.indice ? 'is-done' : (i === estado.indice ? 'is-current' : '');
      return '<li class="stepper-item ' + clase + '"' + (i === estado.indice ? ' aria-current="step"' : '') + '>' +
               '<span class="stepper-bar"></span>' +
               '<span class="stepper-label">' + (i + 1) + '. ' + esc(paso.nombre) + '</span>' +
             '</li>';
    }).join('');
  }

  function mostrarPaso(moverFoco) {
    const actual = pasoActual();

    // Mostramos solo la sección del paso actual
    document.querySelectorAll('.reg-step').forEach(function (seccion) {
      seccion.hidden = seccion.id !== 'paso-' + actual.id;
    });

    dibujarStepper();

    // Textos de la columna izquierda según el rol
    $('aside-title').textContent = TEXTOS_LATERALES[estado.rol].titulo;
    $('aside-text').textContent = TEXTOS_LATERALES[estado.rol].texto;

    // Botones: "Atrás" no aparece en el primer paso; el último dice "Crear cuenta"
    $('btn-atras').hidden = estado.indice === 0;
    $('btn-siguiente').textContent = esUltimoPaso() ? 'Crear mi cuenta' : 'Continuar';

    limpiarError();

    // Al entrar a "Tu meta" dibujamos las rutas y la vista previa
    if (actual.id === 'meta') { dibujarRutas(); dibujarVistaPrevia(); }
    if (actual.id === 'habilidades') dibujarSeleccion();

    if (moverFoco) {
      // Llevamos el foco al título del paso: así quien usa lector de pantalla
      // sabe que cambió de sección. (try: algunos entornos no permiten scroll)
      try { window.scrollTo(0, 0); } catch (e) { /* ignorar */ }
      const titulo = document.querySelector('#paso-' + actual.id + ' h1');
      if (titulo) titulo.focus();
    }
  }


  // ============================================================
  // 5. VALIDACIONES (una por paso)
  // ------------------------------------------------------------
  // Cada una devuelve null si todo está bien, o { mensaje, campo }
  // con el primer problema encontrado.
  // ============================================================
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Reglas de la contraseña (las mismas que exige Api.registrar)
  function reglasPassword(clave) {
    return { largo: clave.length >= 8, letras: /[A-Za-z]/.test(clave), numeros: /\d/.test(clave) };
  }

    async function validarCuenta() {
    const nombre = $('nombre').value.trim();
    if (nombre.length < 2) return { mensaje: 'Escribe tu nombre completo.', campo: 'nombre' };

    const email = $('email').value.trim().toLowerCase();
    if (!REGEX_EMAIL.test(email)) return { mensaje: 'El correo no parece válido.', campo: 'email' };
    
    // Si el correo ya existe (esto ya lo tenías)
    if (!(await Api.emailDisponible(email))) {
      return { mensaje: 'Ya existe una cuenta con ese correo.', campo: 'email' };
    }

    // VALIDACIÓN DE CONTRASEÑA (Nueva y estricta)
    const password = $('password').value;
    if (password.length < 8) {
      return { mensaje: 'La contraseña debe tener al menos 8 caracteres.', campo: 'password' };
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return { mensaje: 'La contraseña debe contener al menos una letra y un número.', campo: 'password' };
    }
    
    if ($('password2').value !== password) {
      return { mensaje: 'Las contraseñas no coinciden.', campo: 'password2' };
    }
    
    return null;
  }

  function validarSobreTi() {
    if ($('educacion').value === '') return { mensaje: 'Indica tu nivel de estudios.', campo: 'educacion' };

    const textoAnios = $('experiencia').value.trim();
    const anios = Number(textoAnios);
    if (textoAnios === '' || !Number.isInteger(anios) || anios < 0 || anios > 60) {
      return { mensaje: 'Escribe tus años de experiencia como un número entero entre 0 y 60 (si no tienes, pon 0).', campo: 'experiencia' };
    }
    if ($('ciudad-persona').value.trim() === '') return { mensaje: 'Indica tu ciudad.', campo: 'ciudad-persona' };
    return null;
  }

  function validarHabilidades() {
    const faltan = MINIMO_HABILIDADES - estado.habilidades.length;
    if (faltan > 0) {
      return { mensaje: 'Agrega ' + (faltan === 1 ? '1 habilidad más' : faltan + ' habilidades más') +
                        ' (mínimo ' + MINIMO_HABILIDADES + ') para poder calcular tu compatibilidad.', campo: 'texto-libre' };
    }
    return null;
  }

  function validarEmpresa() {
    const nombre = $('empresa-nombre').value.trim();
    if (nombre.length < 2) return { mensaje: 'Escribe el nombre de la empresa.', campo: 'empresa-nombre' };
    if ($('empresa-sector').value === '') return { mensaje: 'Elige el sector de la empresa.', campo: 'empresa-sector' };
    if ($('empresa-tamano').value === '') return { mensaje: 'Elige el tamaño de la empresa.', campo: 'empresa-tamano' };
    if ($('empresa-ciudad').value.trim() === '') return { mensaje: 'Indica la ciudad de la empresa.', campo: 'empresa-ciudad' };
    return null;
  }

  async function validarPasoActual() {
    switch (pasoActual().id) {
      case 'cuenta':      return await validarCuenta();
      case 'sobre-ti':    return validarSobreTi();
      case 'habilidades': return validarHabilidades();
      case 'empresa':     return validarEmpresa();
      default:            return null;     // "meta" es opcional
    }
  }


  // ============================================================
  // 6. PASO "TU CUENTA": rol, contraseña y correo
  // ============================================================

  // Cambiar de rol cambia los pasos (4 para aspirante, 2 para reclutador)
  document.querySelectorAll('input[name="rol"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      estado.rol = radio.value;
      estado.indice = 0;
      mostrarPaso(false);
    });
  });

  // Mostrar / ocultar contraseña
  $('show-pass').addEventListener('click', function () {
    const oculta = $('password').type === 'password';
    $('password').type = oculta ? 'text' : 'password';
    $('password2').type = oculta ? 'text' : 'password';
    this.textContent = oculta ? 'Ocultar' : 'Mostrar';
    this.setAttribute('aria-label', oculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  // Las pastillas de reglas se ponen verdes a medida que se cumplen
  $('password').addEventListener('input', function () {
    const reglas = reglasPassword(this.value);
    document.querySelectorAll('#pass-rules .chip').forEach(function (chip) {
      const cumple = reglas[chip.dataset.regla];
      chip.classList.toggle('chip-match', cumple);
      chip.classList.toggle('chip-neutral', !cumple);
    });
  });

  // Al salir del campo de correo, avisamos si ya existe (sin bloquear)
  $('email').addEventListener('blur', async function () {
    const ayuda = $('ayuda-email');
    const email = this.value.trim().toLowerCase();
    ayuda.className = 'field-help';
    if (email === '') { ayuda.textContent = ''; return; }
    if (!REGEX_EMAIL.test(email)) { ayuda.textContent = 'Revisa el formato del correo.'; ayuda.classList.add('is-error'); return; }
    const libre = await Api.emailDisponible(email);
    ayuda.textContent = libre ? 'Correo disponible.' : 'Ya existe una cuenta con este correo.';
    ayuda.classList.add(libre ? 'is-ok' : 'is-error');
  });


  // ============================================================
  // 7. PASO "HABILIDADES"
  // ============================================================

  // Texto del nivel (1-3 básico · 4-6 intermedio · 7-8 avanzado · 9-10 experto)
  const etiquetaNivel = Comun.etiquetaNivel;

  const NOMBRES_CATEGORIA = { technical: 'Técnica', soft: 'Blanda', domain: 'De dominio' };

  // Agrega una habilidad a la lista, SIN repetir.
  // Antes de comparar, unifica sinónimos: "MS Excel" y "Excel" son la misma.
  // Devuelve true si la agregó, false si ya estaba o se llegó al máximo.
  function agregarHabilidad(datos) {
    const oficial = Diccionario.canonico(datos.nombre);
    const clave = Diccionario.norm(oficial);

    if (estado.habilidades.some(function (h) { return Diccionario.norm(h.nombre) === clave; })) return false;
    if (estado.habilidades.length >= MAXIMO_HABILIDADES) return false;

    // ¿Existe en el catálogo? Si no, es una habilidad nueva (la categoría se puede corregir)
    const enCatalogo = estado.catalogoHabilidades.find(function (c) { return Diccionario.norm(c.nombre) === clave; });
    const categoria = enCatalogo ? enCatalogo.categoria
                    : (['technical', 'soft', 'domain'].indexOf(datos.categoria) >= 0 ? datos.categoria : 'domain');

    estado.habilidades.push({
      nombre: enCatalogo ? enCatalogo.nombre : oficial,
      categoria: categoria,
      nivel: Math.min(10, Math.max(1, Math.round(Number(datos.nivel) || 5))),
      origen: datos.origen || 'lista',       // 'lista' | 'texto' | 'cargo' | 'frase'
      nueva: !enCatalogo
    });
    return true;
  }

  // ---------- 7.1 Contarlo con palabras propias (Api.analizarPerfil) ----------
  $('btn-detectar').addEventListener('click', async function () {
    const boton = this;
    const estadoEl = $('estado-detectar');
    const avisos = $('avisos-detectar');
    avisos.innerHTML = '';
    estadoEl.textContent = 'Analizando…';
    boton.disabled = true;

    try {
      // Api.analizarPerfil: hoy usa reglas; con el backend usará la IA real.
      // El formato de la respuesta es el mismo (ver analisis.js).
      const r = await Api.analizarPerfil($('texto-libre').value);

      let agregadas = 0;
      r.habilidades.forEach(function (h) {
        if (agregarHabilidad({ nombre: h.nombre, categoria: h.categoria, nivel: h.nivel, origen: h.origen })) agregadas++;
      });

      if (agregadas > 0) {
        avisos.innerHTML = '<p class="reg-aviso is-ok">Agregamos ' + agregadas + (agregadas === 1 ? ' habilidad' : ' habilidades') +
                           ' a tu lista. Revisa abajo que el nivel de cada una sea el correcto.</p>';
      }
      // Los avisos de la IA (ej: "inferimos habilidades de tu cargo", "hay habilidades nuevas")
      r.advertencias.forEach(function (a) { avisos.innerHTML += '<p class="reg-aviso">' + esc(a) + '</p>'; });
      estadoEl.textContent = '';
      dibujarSeleccion();
    } catch (error) {
      estadoEl.textContent = '';
      avisos.innerHTML = '<p class="reg-aviso">' + esc(error.message) + '</p>';   // Api lanza mensajes listos para mostrar
    }
    boton.disabled = false;
  });

  // ---------- 7.2 Buscar en la lista ----------
  // La lógica de búsqueda (nombres y sinónimos) vive en Diccionario, compartida
  // con la pantalla "Mi perfil".
  function nombresCatalogo() { return estado.catalogoHabilidades.map(function (c) { return c.nombre; }); }

  function buscarSugerencias(texto) {
    return Diccionario.sugerir(texto, nombresCatalogo(), estado.habilidades.map(function (h) { return h.nombre; }), 8);
  }

  function esDesconocida(texto) { return Diccionario.esDesconocida(texto, nombresCatalogo()); }

  function dibujarSugerencias() {
    const texto = $('buscar-habilidad').value;
    const nombres = buscarSugerencias(texto);
    let html = nombres.map(function (n) {
      return '<button type="button" class="chip chip-neutral chip-btn" data-agregar="' + esc(n) + '">+ ' + esc(n) + '</button>';
    }).join('');

    if (esDesconocida(texto)) {
      html += '<button type="button" class="chip chip-neutral chip-btn chip-btn--nueva" data-nueva="' + esc(texto.trim()) + '">' +
              '+ Añadir «' + esc(texto.trim()) + '» como habilidad nueva</button>';
    }
    if (html === '' && texto.trim().length >= 2) {
      html = '<span class="estado-texto">Ya está en tu lista o no hay coincidencias.</span>';
    }
    $('sugerencias').innerHTML = html;
  }

  $('buscar-habilidad').addEventListener('input', dibujarSugerencias);

  // Enter en el buscador agrega la primera opción. Sin esto, Enter enviaría
  // el formulario y saltaría al siguiente paso por accidente.
  $('buscar-habilidad').addEventListener('keydown', function (evento) {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const primera = $('sugerencias').querySelector('[data-agregar], [data-nueva]');
    if (primera) primera.click();
  });

  // Delegación de eventos: UN escuchador en el contenedor atiende todas las pastillas
  $('sugerencias').addEventListener('click', function (evento) {
    const boton = evento.target.closest('button');
    if (!boton) return;

    if (boton.dataset.agregar) agregarHabilidad({ nombre: boton.dataset.agregar, nivel: 5, origen: 'lista' });
    else if (boton.dataset.nueva) agregarHabilidad({ nombre: boton.dataset.nueva, nivel: 5, origen: 'frase' });
    else return;

    $('buscar-habilidad').value = '';
    $('sugerencias').innerHTML = '';
    dibujarSeleccion();
    $('buscar-habilidad').focus();
  });

  // ---------- 7.3 La lista de habilidades elegidas ----------
  function chipOrigen(h) {
    if (h.nueva) return '<span class="chip chip-mid">Nueva</span>';
    if (h.origen === 'texto') return '<span class="chip chip-match">Detectada</span>';
    if (h.origen === 'cargo') return '<span class="chip chip-mid">Según tu cargo</span>';
    return '';
  }

  function dibujarSeleccion() {
    const total = estado.habilidades.length;

    // Contador: se pone verde al llegar al mínimo
    const contador = $('contador-habilidades');
    contador.textContent = total >= MINIMO_HABILIDADES ? total + (total === 1 ? ' habilidad' : ' habilidades') : total + ' de ' + MINIMO_HABILIDADES + ' mínimo';
    contador.classList.toggle('is-ok', total >= MINIMO_HABILIDADES);

    if (total === 0) {
      $('habilidades-elegidas').innerHTML = '<p class="reg-empty">Aún no hay habilidades. Cuéntalo arriba o búscalas en la lista.</p>';
      return;
    }

    $('habilidades-elegidas').innerHTML = estado.habilidades.map(function (h, i) {
      let selectorCategoria = '';
      if (h.nueva) {
        // A una habilidad nueva se le puede corregir la categoría
        selectorCategoria = '<label class="reg-skill-cat">Categoría ' +
          '<select data-campo="categoria" aria-label="Categoría de ' + esc(h.nombre) + '">' +
          Object.keys(NOMBRES_CATEGORIA).map(function (k) {
            return '<option value="' + k + '"' + (h.categoria === k ? ' selected' : '') + '>' + NOMBRES_CATEGORIA[k] + '</option>';
          }).join('') + '</select></label>';
      }
      return '<div class="reg-skill" data-i="' + i + '">' +
        '<div class="reg-skill-top">' +
          '<span class="reg-skill-name">' + esc(h.nombre) + '</span>' + chipOrigen(h) +
          '<button type="button" class="icon-btn icon-btn--sm" data-accion="quitar" aria-label="Quitar ' + esc(h.nombre) + '" title="Quitar">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="reg-skill-level">' +
          '<input type="range" min="1" max="10" step="1" value="' + h.nivel + '" data-campo="nivel" aria-label="Nivel de ' + esc(h.nombre) + '">' +
          '<output>' + h.nivel + ' · ' + etiquetaNivel(h.nivel) + '</output>' +
        '</div>' + selectorCategoria +
      '</div>';
    }).join('');
  }

  // Edición de la lista (delegación de eventos).
  // 'input' se dispara MIENTRAS se mueve la barra: actualizamos solo el texto,
  // sin volver a dibujar todo (así la barra no pierde el foco al arrastrar).
  $('habilidades-elegidas').addEventListener('input', function (evento) {
    if (evento.target.dataset.campo !== 'nivel') return;
    const fila = evento.target.closest('.reg-skill');
    const habilidad = estado.habilidades[Number(fila.dataset.i)];
    habilidad.nivel = Number(evento.target.value);
    fila.querySelector('output').textContent = habilidad.nivel + ' · ' + etiquetaNivel(habilidad.nivel);
  });

  $('habilidades-elegidas').addEventListener('change', function (evento) {
    if (evento.target.dataset.campo !== 'categoria') return;
    const fila = evento.target.closest('.reg-skill');
    estado.habilidades[Number(fila.dataset.i)].categoria = evento.target.value;
  });

  $('habilidades-elegidas').addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-accion="quitar"]');
    if (!boton) return;
    estado.habilidades.splice(Number(boton.closest('.reg-skill').dataset.i), 1);
    dibujarSeleccion();
  });


  // ============================================================
  // 8. PASO "TU META": rutas y vista previa de coincidencias
  // ============================================================
  function dibujarRutas() {
    // Primera opción: "Todavía no lo sé" (value vacío). Después, las rutas del catálogo.
    let html = '<div class="ruta"><input type="radio" name="ruta" id="ruta-ninguna" value=""' + (estado.metaId === null ? ' checked' : '') + '>' +
               '<label for="ruta-ninguna"><span class="ruta-titulo">Todavía no lo sé</span>' +
               '<span class="ruta-desc">Podrás elegir una ruta más adelante desde tu panel.</span></label></div>';

    estado.rutas.forEach(function (ruta) {
      html += '<div class="ruta"><input type="radio" name="ruta" id="ruta-' + esc(ruta.id) + '" value="' + esc(ruta.id) + '"' + (estado.metaId === ruta.id ? ' checked' : '') + '>' +
              '<label for="ruta-' + esc(ruta.id) + '"><span class="ruta-titulo">' + esc(ruta.titulo) + '</span>' +
              '<span class="ruta-desc">' + esc(ruta.descripcion) + '</span></label></div>';
    });
    $('lista-rutas').innerHTML = html;
  }

  $('lista-rutas').addEventListener('change', function (evento) {
    estado.metaId = evento.target.value === '' ? null : evento.target.value;
  });

  function dibujarVistaPrevia() {
    // Armamos un perfil "temporal" con lo ingresado hasta ahora y se lo damos al motor
    const perfil = {
      experienciaAnios: Number($('experiencia').value) || 0,
      habilidades: estado.habilidades.map(function (h) { return { nombre: h.nombre, nivel: h.nivel }; })
    };

    const ranking = Matching.rankearEmpleos(perfil, estado.empleos, estado.transferencias).slice(0, 3);

    if (ranking.length === 0) {
      $('vista-previa').innerHTML = '<p class="reg-empty">Todavía no hay ofertas para comparar.</p>';
      return;
    }

    $('vista-previa').innerHTML = ranking.map(function (fila) {
      const r = fila.resultado;
      const clase = r.nivel === 'alta' ? '' : (r.nivel === 'media' ? ' is-mid' : ' is-low');
      const chip = r.nivel === 'alta' ? 'chip-match' : (r.nivel === 'media' ? 'chip-mid' : 'chip-gap');
      return '<div class="preview-row">' +
        '<span class="preview-num' + clase + '">' + r.puntaje + '%</span>' +
        '<span class="preview-title">' + esc(fila.empleo.titulo) +
          '<span class="preview-sub">' + esc(fila.empleo.empresa) + ' · ' + esc(fila.empleo.ciudad) + '</span></span>' +
        '<span class="chip ' + chip + '">' + r.nivel + '</span>' +
      '</div>';
    }).join('');
  }


  // ============================================================
  // 9. CREAR LA CUENTA
  // ============================================================
  function armarDatos() {
    const datos = {
      rol: estado.rol,
      nombre: $('nombre').value.trim(),
      email: $('email').value.trim().toLowerCase(),
      password: $('password').value
    };

    if (estado.rol === 'aspirante') {
      datos.perfil = {
        educacion: $('educacion').value,
        cargoActual: $('cargo-actual').value.trim(),
        experienciaAnios: Number($('experiencia').value),
        ubicacion: $('ciudad-persona').value.trim(),
        habilidades: estado.habilidades.map(function (h) { return { nombre: h.nombre, nivel: h.nivel, categoria: h.categoria }; }),
        rutaMetaId: estado.metaId
      };
    } else {
      datos.empresa = {
        nombre: $('empresa-nombre').value.trim(),
        sector: $('empresa-sector').value,
        ciudad: $('empresa-ciudad').value.trim(),
        tamano: $('empresa-tamano').value,
        cargo: $('empresa-cargo').value.trim(),
        descripcion: $('empresa-descripcion').value.trim()
      };
    }
    return datos;
  }

  function mostrarExito(resultado, datos) {
    const primerNombre = datos.nombre.split(' ')[0];

    $('reg-form').hidden = true;
    $('stepper').hidden = true;
    $('enlace-login').hidden = true;
    $('exito').hidden = false;

    if (datos.rol === 'aspirante') {
      $('exito-titulo').textContent = '¡Bienvenido, ' + primerNombre + '!';
      $('exito-texto').textContent = 'Tu perfil está listo y ya calculamos tu compatibilidad con las ofertas disponibles.';
      $('exito-detalle').innerHTML = resultado.mejorOferta
        ? '<div class="reg-best"><p class="reg-best-label">Tu mejor coincidencia hoy</p>' +
          '<div class="preview-row"><span class="preview-num">' + resultado.mejorOferta.puntaje + '%</span>' +
          '<span class="preview-title">' + esc(resultado.mejorOferta.titulo) + '<span class="preview-sub">' + esc(resultado.mejorOferta.empresa) + '</span></span><span></span></div></div>'
        : '';
      $('exito-enlace').textContent = 'Ir a mi panel';
    } else {
      $('exito-titulo').textContent = '¡Tu empresa está lista, ' + primerNombre + '!';
      $('exito-texto').textContent = datos.empresa.nombre + ' quedó registrada. Ya puedes publicar tu primera vacante.';
      $('exito-detalle').innerHTML = '';
      $('exito-enlace').textContent = 'Publicar mi primera vacante';
    }

    // Api.paginaPorRol dice a qué pantalla va cada rol (la sesión ya quedó iniciada)
    $('exito-enlace').href = Api.paginaPorRol[datos.rol];
    $('exito-titulo').focus();
  }

    async function crearCuenta() {
    const datos = armarDatos();
    try {
      const resultado = await Api.registrar(datos);
      mostrarExito(resultado, datos);
    } catch (error) {
      // Si el backend rechaza algo, mostramos el mensaje en el formulario
      fallar(error.message); 
      $('btn-siguiente').textContent = 'Crear mi cuenta';
    }
  }


  // ============================================================
  // 10. NAVEGACIÓN: Continuar / Atrás
  // ============================================================

  // Enter en un campo, o pulsar "Continuar", envía el formulario
  $('reg-form').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    if (estado.ocupado) return;           // evita dobles clics mientras se valida o se guarda
    estado.ocupado = true;
    $('btn-siguiente').disabled = true;
    limpiarError();

    try {
      const problema = await validarPasoActual();
      if (problema) { fallar(problema.mensaje, problema.campo); return; }

      if (esUltimoPaso()) {
        $('btn-siguiente').textContent = 'Creando tu cuenta…';
        try {
          await crearCuenta();
        } catch (error) {
          fallar(error.message);
          $('btn-siguiente').textContent = 'Crear mi cuenta';
          // Si el problema es el correo (ej: lo registraron en otra pestaña), volvemos al primer paso
          if (/correo/i.test(error.message)) { estado.indice = 0; mostrarPaso(true); fallar(error.message, 'email'); }
        }
      } else {
        estado.indice++;
        mostrarPaso(true);
      }
    } finally {
      estado.ocupado = false;
      $('btn-siguiente').disabled = false;
    }
  });

  $('btn-atras').addEventListener('click', function () {
    if (estado.indice > 0) { estado.indice--; mostrarPaso(true); }
  });

  // Contador de caracteres de la descripción de la empresa
  $('empresa-descripcion').addEventListener('input', function () {
    $('contador-descripcion').textContent = this.value.length;
  });

  // Al corregir un campo con error, le quitamos el borde rojo
  $('reg-form').addEventListener('input', function (evento) { evento.target.classList.remove('has-error'); });


  // ============================================================
  // 11. ARRANQUE
  // ============================================================
  function llenarSelect(select, opciones) {
    opciones.forEach(function (op) {
      const o = document.createElement('option');
      o.value = op;
      o.textContent = op;
      select.appendChild(o);
    });
  }

  async function iniciar() {
    Comun.vincularBotonTema($('theme-toggle'));

    // Si ya hay una sesión abierta, no tiene sentido registrarse: vamos a su panel
    const sesion = Api.sesionActual();
    if (sesion) { window.location.replace(Api.paginaPorRol[sesion.rol]); return; }

    // El login puede mandar el rol elegido: registro.html?rol=reclutador
    const rolUrl = new URLSearchParams(window.location.search).get('rol');
    if (rolUrl === 'aspirante' || rolUrl === 'reclutador') {
      $('rol-' + rolUrl).checked = true;
      estado.rol = rolUrl;
    }
    mostrarPaso(false);

    // Pedimos las listas a Api. Promise.all las pide a la vez (más rápido).
    try {
      const r = await Promise.all([
        Api.getCatalogos(), Api.getCatalogoHabilidades(), Api.getEmpleos(), Api.getTransferencias(), Api.getRutas()
      ]);
      const catalogos = r[0];
      estado.catalogoHabilidades = r[1];
      estado.empleos = r[2];
      estado.transferencias = r[3];
      estado.rutas = r[4];

      llenarSelect($('educacion'), catalogos.educacion);
      llenarSelect($('empresa-sector'), catalogos.sectores);
      llenarSelect($('empresa-tamano'), catalogos.tamanosEmpresa);

      // Ciudades sugeridas (sin "Remoto": una persona vive en una ciudad real)
      catalogos.ciudades.filter(function (c) { return c !== 'Remoto'; }).forEach(function (c) {
        const o = document.createElement('option');
        o.value = c;
        $('lista-ciudades').appendChild(o);
      });
    } catch (error) {
      fallar('No pudimos cargar los datos del formulario. Recarga la página e inténtalo de nuevo.');
    }
  }

  iniciar();

})();
