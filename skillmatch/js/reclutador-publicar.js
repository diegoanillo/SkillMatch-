/* ============================================================
   reclutador-publicar.js  →  LA VISTA "PUBLICAR VACANTE" (RF-06)
   ============================================================ */
(function () {
  'use strict';

  const esc = Comun.esc;
  const UI = AspiranteUI;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'publicar-contenido';
  const CLAVE_BORRADOR = 'skillmatch_borrador_vacante_';

  const MIN_TEXTO = 20;
  const MAX_TEXTO = 2000;
  const NOMBRES_CATEGORIA = { technical: 'Técnica', soft: 'Blanda', domain: 'De dominio' };

  const EJEMPLOS = [
    { nombre: 'Servicios generales', texto: 'Se busca persona para servicios generales en una empresa. Presencial, tiempo completo.' },
    { nombre: 'Auxiliar de bodega', texto: 'Necesitamos auxiliar de bodega.\nRequisitos:\n- Manejo de montacargas\n- Licencia de conducción C1\n- Control de inventarios\nDeseable: curso de seguridad y salud en el trabajo.\nSe requiere 1 año de experiencia. Presencial.' },
    { nombre: 'Analista de datos', texto: 'Buscamos analista con Excel avanzado y SQL intermedio. Se valora Power BI y buena comunicación. Sin experiencia previa. Trabajo remoto.' }
  ];

  const local = {
    etapa: 'redactar', texto: '', titulo: '', analisis: null, datos: null,
    busqueda: '', nuevaPendiente: null, alcance: null, cargandoAlcance: false,
    publicada: null, analizando: false, mensajeError: '', restaurado: false, enfocarTitulo: false
  };
  let ultimoEstado = null;
  let contadorAlcance = 0;
  let temporizadorAlcance = null;

  function claveBorrador() { return CLAVE_BORRADOR + ultimoEstado.sesion.id; }

  function guardarBorrador() {
    if (!ultimoEstado) return;
    try {
      const vacio = local.etapa === 'redactar' && local.texto.trim() === '' && local.titulo.trim() === '' && !local.datos;
      if (local.etapa === 'publicada' || vacio) { sessionStorage.removeItem(claveBorrador()); return; }
      sessionStorage.setItem(claveBorrador(), JSON.stringify({
        etapa: local.etapa, texto: local.texto, titulo: local.titulo, analisis: local.analisis, datos: local.datos
      }));
    } catch (e) { /* sin almacenamiento */ }
  }

  function borrarBorrador() {
    try { sessionStorage.removeItem(claveBorrador()); } catch (e) { /* ignorar */ }
  }

  function restaurarBorrador() {
    if (local.restaurado) return;
    local.restaurado = true;
    try {
      const b = JSON.parse(sessionStorage.getItem(claveBorrador()));
      if (!b || (b.etapa !== 'redactar' && b.etapa !== 'revisar')) return;
      local.texto = b.texto || '';
      local.titulo = b.titulo || '';
      local.analisis = b.analisis || null;
      local.datos = b.datos || null;
      local.etapa = b.etapa === 'revisar' && local.datos ? 'revisar' : 'redactar';
    } catch (e) { /* borrador dañado */ }
  }

  function nivelSegunExperiencia(anios) {
    if (anios >= 6) return 'Senior';
    if (anios >= 3) return 'Semi-senior';
    return 'Junior';
  }

  // --- AQUÍ ESTÁ LA MAGIA DE LA LIMPIEZA SEMÁNTICA ---
  function datosDesdeAnalisis(est, analisis) {
    const exp = analisis && analisis.experienciaMin !== null ? Math.ceil(analisis.experienciaMin) : 0;
    const sectorEmpresa = est.catalogos.sectores.indexOf(est.empresa.sector) >= 0 ? est.empresa.sector : '';

    return {
      titulo: local.titulo.trim() || (analisis && analisis.cargoDetectado) || '',
      ciudad: est.empresa.ciudad || '',
      modalidad: (analisis && analisis.modalidad) || 'Presencial',
      nivel: nivelSegunExperiencia(exp),
      sector: sectorEmpresa,
      experienciaMin: String(exp),
      salarioMin: '',
      salarioMax: '',
      descripcion: local.texto.trim(),
      habilidades: analisis ? analisis.habilidades.map(function (h) {
        // Intentamos buscar la habilidad en nuestro Diccionario para limpiar el nombre
        let nombreLimpio = h.nombre;
        
        // Buscamos si el nombre de la IA coincide con algún sinónimo de nuestro Diccionario
        const entrada = Diccionario.buscar(nombreLimpio);
        if (entrada) {
          nombreLimpio = entrada.nombre; // Si existe, usamos el nombre oficial
        } else {
          // Si no está en el diccionario, le hacemos una limpieza manual rápida
          const textoOriginal = nombreLimpio.toLowerCase();
          if (textoOriginal.includes('base de datos') || textoOriginal.includes('bases de datos')) nombreLimpio = 'SQL';
          else if (textoOriginal.includes('hoja de cálculo') || textoOriginal.includes('hojas de cálculo')) nombreLimpio = 'Excel';
          else if (textoOriginal.includes('interpretar información') || textoOriginal.includes('análisis de información')) nombreLimpio = 'Análisis de datos';
          else if (textoOriginal.includes('trabajo en equipo')) nombreLimpio = 'Trabajo en equipo';
          else if (textoOriginal.includes('comunicación')) nombreLimpio = 'Comunicación';
          else if (textoOriginal.includes('liderazgo')) nombreLimpio = 'Liderazgo';
        }

        // Buscamos si el nombre limpio ya está en el catálogo (para saber si es "nueva" o no)
        const enCatalogo = ultimoEstado.catalogoHabilidades.find(function(c) {
          return Diccionario.norm(c.nombre) === Diccionario.norm(nombreLimpio);
        });

        return { 
          nombre: nombreLimpio, // <--- Usamos el nombre limpio
          categoria: h.categoria, 
          nivel: h.nivel, 
          obligatoria: h.obligatoria,
          origen: 'texto', 
          confianza: 'alta', 
          enCatalogo: !!enCatalogo, // <--- Sabemos si es nueva o no
          evidencia: h.nombre // Guardamos lo que dijo Qwen para que el usuario sepa de dónde salió
        };
      }) : []
    };
  }
  // ----------------------------------------------------

  function programarAlcance(espera) {
    clearTimeout(temporizadorAlcance);
    if (!local.datos) return;
    const turno = ++contadorAlcance;
    local.cargandoAlcance = true;
    pintarAlcance();

    temporizadorAlcance = setTimeout(async function () {
      try {
        const r = await Api.estimarAlcance({ habilidades: local.datos.habilidades, experienciaMin: local.datos.experienciaMin });
        if (turno !== contadorAlcance) return;
        local.alcance = r;
      } catch (error) {
        if (turno !== contadorAlcance) return;
        local.alcance = null;
      }
      local.cargandoAlcance = false;
      pintarAlcance();
    }, espera);
  }

  function pintarAlcance() {
    const caja = $('pub-alcance');
    if (caja) caja.innerHTML = htmlAlcance();
  }

  function htmlAlcance() {
    const d = local.datos;
    if (!d || d.habilidades.length === 0) return '<p class="panel-sub" style="margin:0">Agrega habilidades para ver cuántos aspirantes encajarían.</p>';

    const a = local.alcance;
    if (!a) return '<p class="panel-sub" style="margin:0">' + (local.cargandoAlcance ? 'Calculando…' : 'No pudimos calcular el alcance.') + '</p>';
    if (a.total === 0) return '<p class="panel-sub" style="margin:0">Todavía no hay aspirantes registrados para comparar.</p>';

    const fila = function (texto, n, clase) {
      return '<div class="pub-alcance-fila"><span>' + texto + '</span><strong>' + n + '</strong>' +
             '<div class="bar-track"><div class="bar-fill' + clase + '" style="width:' + Math.round((n / a.total) * 100) + '%"></div></div></div>';
    };

    const consejo = a.alta === 0
      ? '<p class="aviso-exp">Ningún aspirante registrado cumple hoy con compatibilidad alta. Revisa si todos los requisitos son realmente obligatorios, o si algún nivel pedido es más alto de lo necesario.</p>'
      : '';

    return '<div class="' + (local.cargandoAlcance ? 'pub-alcance is-actualizando' : 'pub-alcance') + '">' +
      '<p class="pub-alcance-resumen"><strong>' + a.alta + ' de ' + a.total + '</strong> aspirantes registrados tendrían compatibilidad <strong>alta</strong> con esta vacante.</p>' +
      fila('Compatibilidad alta', a.alta, '') + fila('Compatibilidad media', a.media, ' bar-fill--mid') + fila('Compatibilidad baja', a.baja, ' bar-fill--gap') +
      consejo + '</div>';
  }

  function htmlPasos() {
    const nombres = ['Describe', 'Revisa', 'Publica'];
    const actual = { redactar: 0, revisar: 1, publicada: 2 }[local.etapa];
    return '<ol class="pub-pasos" aria-label="Progreso">' + nombres.map(function (n, i) {
      return '<li class="' + (i < actual ? 'is-done' : (i === actual ? 'is-current' : '')) + '"' + (i === actual ? ' aria-current="step"' : '') + '>' +
             '<span class="pub-paso-num">' + (i < actual ? '✓' : (i + 1)) + '</span>' + n + '</li>';
    }).join('') + '</ol>';
  }

  function htmlRedactar() {
    const hayRevision = !!local.datos;
    const largo = local.texto.length;

    return '<div class="panel">' +
      '<h2 tabindex="-1">Describe la vacante</h2>' +
      '<p class="panel-sub">Escríbela como se la contarías a un colega: qué hace la persona, qué debe saber y cuánta experiencia necesita. No hace falta un formato especial.</p>' +

      '<div class="pub-ejemplos"><span class="estado-texto">¿Quieres probar? Parte de un ejemplo:</span>' +
        EJEMPLOS.map(function (e, i) {
          return '<button type="button" class="chip chip-neutral chip-btn" data-accion="ejemplo" data-i="' + i + '">' + esc(e.nombre) + '</button>';
        }).join('') + '</div>' +

      '<div class="field"><label for="pub-titulo-inicial">Título del cargo <span class="opcional">(opcional: si lo dejas vacío, lo sugerimos)</span></label>' +
        '<input type="text" id="pub-titulo-inicial" maxlength="100" value="' + esc(local.titulo) + '" placeholder="Ej: Auxiliar de bodega"></div>' +

      '<div class="field"><label for="pub-texto">Descripción de la vacante</label>' +
        '<textarea id="pub-texto" class="pub-textarea" rows="8" maxlength="' + MAX_TEXTO + '" placeholder="Ej: Se busca persona para servicios generales en una empresa. Debe encargarse de la limpieza de oficinas, manejar productos de aseo y ser puntual…">' + esc(local.texto) + '</textarea>' +
        '<p class="field-help"><span id="pub-contador">' + largo + '</span> / ' + MAX_TEXTO + ' caracteres (mínimo ' + MIN_TEXTO + ')</p></div>' +

      (local.mensajeError ? '<p class="form-error" role="alert">' + esc(local.mensajeError) + '</p>' : '') +

      '<div class="pub-acciones">' +
        '<button type="button" class="btn btn-primary" data-accion="analizar" id="pub-analizar"' + (local.analizando ? ' disabled' : '') + '>' +
          (local.analizando ? 'Analizando…' : (hayRevision ? 'Volver a analizar' : 'Analizar y continuar')) + '</button>' +
        (hayRevision ? '<button type="button" class="btn btn-secondary" data-accion="ir-revision">Volver a mi revisión</button>'
                     : '<button type="button" class="btn btn-secondary" data-accion="manual">Prefiero llenarlo yo mismo</button>') +
        '<span class="estado-texto" role="status">' + (local.analizando ? 'Esto toma unos segundos.' : '') + '</span>' +
      '</div>' +
      '<p class="field-help" style="margin-top:12px">El análisis es una sugerencia: siempre podrás revisarla y corregirla antes de publicar.' +
      (hayRevision ? ' <strong>Volver a analizar reemplaza lo que ya corregiste.</strong>' : '') + '</p>' +
    '</div>';
  }

  function opciones(lista, seleccionado, textoVacio) {
    return (textoVacio ? '<option value="">' + textoVacio + '</option>' : '') + lista.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === seleccionado ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
  }

  function htmlDatos(est) {
    const d = local.datos;
    const ciudades = est.catalogos.ciudades;

    const camposSalario = 
      '<div class="field-pair">' +
        '<div class="field"><label for="pub-sal-min">Salario mínimo (COP)</label>' +
          '<input type="number" id="pub-sal-min" data-dato="salarioMin" min="0" step="100000" value="' + esc(d.salarioMin || '') + '" placeholder="Ej: 2000000"></div>' +
        '<div class="field"><label for="pub-sal-max">Salario máximo (COP)</label>' +
          '<input type="number" id="pub-sal-max" data-dato="salarioMax" min="0" step="100000" value="' + esc(d.salarioMax || '') + '" placeholder="Ej: 3000000"></div>' +
      '</div>';

    return '<div class="panel"><h2 tabindex="-1">Datos de la vacante</h2>' +
      '<p class="panel-sub">Revisa que estén bien: así los verán los aspirantes.</p>' +
      '<div class="pub-form">' +
        '<div class="field"><label for="pub-titulo">Título del cargo</label>' +
          '<input type="text" id="pub-titulo" data-dato="titulo" maxlength="100" value="' + esc(d.titulo) + '"></div>' +
        '<div class="field-pair">' +
          '<div class="field"><label for="pub-ciudad">Ciudad</label>' +
            '<input type="text" id="pub-ciudad" data-dato="ciudad" list="pub-lista-ciudades" maxlength="60" value="' + esc(d.ciudad) + '">' +
            '<datalist id="pub-lista-ciudades">' + ciudades.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
          '<div class="field"><label for="pub-modalidad">Modalidad</label>' +
            '<select id="pub-modalidad" data-dato="modalidad">' + opciones(est.catalogos.modalidades, d.modalidad) + '</select></div>' +
        '</div>' +
        '<div class="field-pair">' +
          '<div class="field"><label for="pub-nivel">Nivel del cargo</label>' +
            '<select id="pub-nivel" data-dato="nivel">' + opciones(est.catalogos.niveles, d.nivel) + '</select></div>' +
          '<div class="field"><label for="pub-sector">Sector</label>' +
            '<select id="pub-sector" data-dato="sector">' + opciones(est.catalogos.sectores, d.sector, 'Selecciona…') + '</select></div>' +
        '</div>' +
        '<div class="field"><label for="pub-exp">Años de experiencia mínima</label>' +
          '<input type="number" id="pub-exp" data-dato="experienciaMin" min="0" max="30" step="1" value="' + esc(d.experienciaMin) + '">' +
          '<p class="field-help">Cuenta poco en la compatibilidad (SkillMatch mide potencial, no solo años). Pon 0 si no se pide.</p></div>' +
        
        camposSalario +

        '<div class="field"><label for="pub-desc">Descripción pública</label>' +
          '<textarea id="pub-desc" data-dato="descripcion" rows="5" maxlength="' + MAX_TEXTO + '">' + esc(d.descripcion) + '</textarea></div>' +
      '</div></div>';
  }

  function chipOrigen(h) {
    if (!h.enCatalogo) return '<span class="chip chip-mid">Habilidad nueva</span>';
    if (h.origen === 'texto') return '<span class="chip chip-match">En tu texto</span>';
    if (h.origen === 'cargo') return '<span class="chip chip-mid">Según el cargo</span>';
    return '<span class="chip chip-neutral">Agregada por ti</span>';
  }

  function htmlFilaHabilidad(h, i) {
    const selectorCategoria = !h.enCatalogo
      ? '<label class="reg-skill-cat">Categoría <select data-campo="categoria" aria-label="Categoría de ' + esc(h.nombre) + '">' +
        Object.keys(NOMBRES_CATEGORIA).map(function (k) {
          return '<option value="' + k + '"' + (h.categoria === k ? ' selected' : '') + '>' + NOMBRES_CATEGORIA[k] + '</option>';
        }).join('') + '</select></label>' : '';

    return '<div class="pub-hab" data-i="' + i + '">' +
      '<div class="pub-hab-main"><span class="hab-name">' + esc(h.nombre) + '</span> ' + chipOrigen(h) +
        (h.evidencia ? '<span class="pub-evidencia">' + esc(h.evidencia) + '</span>' : '') + selectorCategoria + '</div>' +
      '<div class="hab-level"><input type="range" min="1" max="10" step="1" value="' + h.nivel + '" data-campo="nivel" data-foco="hab:' + i + '" aria-label="Nivel requerido de ' + esc(h.nombre) + '">' +
        '<output>' + h.nivel + ' · ' + Comun.etiquetaNivel(h.nivel) + '</output></div>' +
      '<label class="check"><input type="checkbox" data-campo="obligatoria"' + (h.obligatoria ? ' checked' : '') + '> Obligatoria</label>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-accion="quitar" aria-label="Quitar ' + esc(h.nombre) + '">Quitar</button>' +
    '</div>';
  }

  function nombresCatalogo(est) { return est.catalogoHabilidades.map(function (c) { return c.nombre; }); }

  function htmlSugerencias(est) {
    const texto = local.busqueda;
    if (texto.trim().length < 2) return '';

    const tiene = local.datos.habilidades.map(function (h) { return h.nombre; });
    let html = Diccionario.sugerir(texto, nombresCatalogo(est), tiene, 8).map(function (n) {
      return '<button type="button" class="chip chip-neutral chip-btn" data-accion="agregar" data-nombre="' + esc(n) + '">+ ' + esc(n) + '</button>';
    }).join('');

    if (Diccionario.esDesconocida(texto, nombresCatalogo(est)) &&
        !tiene.some(function (n) { return Diccionario.norm(n) === Diccionario.norm(texto); })) {
      html += '<button type="button" class="chip chip-neutral chip-btn chip-btn--nueva" data-accion="nueva" data-nombre="' + esc(texto.trim()) + '">+ Añadir «' + esc(texto.trim()) + '» como habilidad nueva</button>';
    }
    if (html === '') html = '<span class="estado-texto">Ya está en la lista o no hay coincidencias.</span>';
    return html;
  }

  function htmlAgregar(est) {
    let contenido;
    if (local.nuevaPendiente) {
      contenido = '<div class="nueva-categoria"><p>¿Qué tipo de habilidad es <strong>«' + esc(local.nuevaPendiente) + '»</strong>?</p><div class="sugerencias">' +
        Object.keys(NOMBRES_CATEGORIA).map(function (k) {
          return '<button type="button" class="chip chip-neutral chip-btn" data-accion="categoria-nueva" data-categoria="' + k + '">' + NOMBRES_CATEGORIA[k] + '</button>';
        }).join('') + '<button type="button" class="link-btn" data-accion="cancelar-nueva">Cancelar</button></div></div>';
    } else {
      contenido = '<input type="text" id="pub-buscar" class="perfil-buscar" autocomplete="off" value="' + esc(local.busqueda) + '" placeholder="Escribe: Excel, ventas, limpieza, cocina…">' +
                  '<div class="sugerencias" id="pub-sugerencias" aria-live="polite">' + htmlSugerencias(est) + '</div>';
    }
    return '<div class="hab-add"><label for="pub-buscar" class="hab-add-titulo">Agregar una habilidad</label>' + contenido + '</div>';
  }

  function htmlHabilidades(est) {
    const hs = local.datos.habilidades;
    const nuevas = hs.filter(function (h) { return !h.enCatalogo; }).length;
    const sinTodasObligatorias = hs.length > 0 && hs.every(function (h) { return h.obligatoria; });

    return '<div class="panel"><h2 tabindex="-1">Habilidades que pide la vacante</h2>' +
      '<p class="panel-sub">Esto es lo que usamos para calcular la compatibilidad de cada aspirante. Ajusta el nivel que realmente necesitas y marca cuáles son obligatorias.</p>' +

      (local.analisis ? '<p class="pub-resumen-ia">' + esc(local.analisis.resumen) + '</p>' +
        local.analisis.advertencias.map(function (a) { return '<p class="reg-aviso">' + esc(a) + '</p>'; }).join('') : '') +

      (hs.length === 0 ? '<p class="empty-state">Todavía no hay habilidades. Agrégalas abajo.</p>'
                       : '<div class="pub-hab-lista">' + hs.map(htmlFilaHabilidad).join('') + '</div>') +

      (hs.length > 0 && hs.length < 3 ? '<p class="aviso-exp">Con menos de 3 habilidades la compatibilidad será poco precisa.</p>' : '') +
      (hs.length >= 3 && sinTodasObligatorias ? '<p class="aviso-exp">Todas están marcadas como obligatorias. Si alguna solo es deseable, desmárcala: así no dejas fuera a buenos candidatos.</p>' : '') +
      (nuevas > 0 ? '<p class="reg-aviso">' + nuevas + (nuevas === 1 ? ' habilidad nueva se agregará' : ' habilidades nuevas se agregarán') + ' al catálogo al publicar.</p>' : '') +

      htmlAgregar(est) + '</div>';
  }

  function htmlRevisar(est) {
    return htmlDatos(est) + htmlHabilidades(est) +
      '<div class="panel"><h2>Alcance estimado</h2>' +
        '<p class="panel-sub">Con estos requisitos, así encajarían los aspirantes que ya están en SkillMatch (solo cifras, sin datos de personas). Se actualiza mientras editas.</p>' +
        '<div id="pub-alcance" aria-live="polite">' + htmlAlcance() + '</div></div>' +

      '<div class="panel"><p class="form-error" id="pub-error" role="alert" hidden></p>' +
        '<div class="pub-acciones">' +
          '<button type="button" class="btn btn-primary" data-accion="publicar" id="pub-publicar">Publicar vacante</button>' +
          '<button type="button" class="btn btn-secondary" data-accion="editar-texto">← Editar el texto</button>' +
          '<button type="button" class="link-btn" data-accion="descartar">Descartar borrador</button>' +
        '</div></div>';
  }

  function htmlPublicada() {
    const p = local.publicada;
    const a = p.alcance;
    return '<div class="panel pub-exito">' +
      '<div class="reg-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h2 tabindex="-1">¡Vacante publicada!</h2>' +
      '<p class="pub-exito-texto"><strong>«' + esc(p.vacante.titulo) + '»</strong> ya está visible para los aspirantes en «Buscar empleos».</p>' +
      (a && a.total > 0 ? '<p class="pub-exito-texto">Al publicarla, <strong>' + a.alta + ' de ' + a.total + '</strong> aspirantes registrados tenían compatibilidad alta.</p>' : '') +
      (p.nuevas.length > 0 ? '<p class="pub-exito-texto">Agregamos al catálogo: ' + p.nuevas.map(esc).join(', ') + '.</p>' : '') +
      '<div class="pub-acciones" style="justify-content:center">' +
        '<button type="button" class="btn btn-primary" data-ir="vacantes">Ver mis vacantes</button>' +
        '<button type="button" class="btn btn-secondary" data-accion="otra">Publicar otra</button>' +
      '</div></div>';
  }

  function dibujar(est) {
    ultimoEstado = est;
    const primeraVez = !local.restaurado;
    restaurarBorrador();

    const cont = $(CONTENEDOR);
    const foco = UI.recordarFoco(cont);

    let cuerpo;
    if (local.etapa === 'publicada' && local.publicada) cuerpo = htmlPublicada();
    else if (local.etapa === 'revisar' && local.datos) cuerpo = htmlRevisar(est);
    else cuerpo = htmlRedactar();

    cont.innerHTML = htmlPasos() + cuerpo;

    if (local.enfocarTitulo) {
      local.enfocarTitulo = false;
      const t = cont.querySelector('h2');
      if (t) { try { t.focus(); } catch (e) { /* ignorar */ } }
    } else {
      UI.restaurarFoco(cont, foco);
    }

    if (primeraVez && local.etapa === 'revisar') programarAlcance(0);
  }

  function cambiarEtapa(etapa) {
    local.etapa = etapa;
    local.enfocarTitulo = true;
    guardarBorrador();
    dibujar(ultimoEstado);
  }

  const cont = $(CONTENEDOR);

  const CAMPO_DE_ERROR = [
    [/título/i, 'pub-titulo'], [/ciudad/i, 'pub-ciudad'], [/modalidad/i, 'pub-modalidad'], [/nivel del cargo/i, 'pub-nivel'],
    [/sector/i, 'pub-sector'], [/experiencia/i, 'pub-exp'], [/descripci/i, 'pub-desc'], [/habilidad/i, 'pub-buscar']
  ];

  function mostrarErrorPublicar(mensaje) {
    const caja = $('pub-error');
    caja.textContent = mensaje;
    caja.hidden = false;
    const par = CAMPO_DE_ERROR.find(function (c) { return c[0].test(mensaje); });
    const campo = par ? $(par[1]) : null;
    if (campo) { campo.classList.add('has-error'); campo.focus(); }
  }

  cont.addEventListener('input', function (evento) {
    const t = evento.target;

    if (t.id === 'pub-texto') {
      local.texto = t.value;
      $('pub-contador').textContent = t.value.length;
      local.mensajeError = '';
      guardarBorrador();
      return;
    }
    if (t.id === 'pub-titulo-inicial') { local.titulo = t.value; guardarBorrador(); return; }

    if (t.dataset.dato) {
      local.datos[t.dataset.dato] = t.value;
      t.classList.remove('has-error');
      $('pub-error').hidden = true;
      if (t.dataset.dato === 'experienciaMin') programarAlcance(400);
      guardarBorrador();
      return;
    }

    if (t.id === 'pub-buscar') {
      local.busqueda = t.value;
      $('pub-sugerencias').innerHTML = htmlSugerencias(ultimoEstado);
      return;
    }

    if (t.dataset.campo === 'nivel') {
      const i = Number(t.closest('.pub-hab').dataset.i);
      const nivel = Number(t.value);
      local.datos.habilidades[i].nivel = nivel;
      t.parentNode.querySelector('output').textContent = nivel + ' · ' + Comun.etiquetaNivel(nivel);
      programarAlcance(400);
      guardarBorrador();
    }
  });

  cont.addEventListener('change', function (evento) {
    const t = evento.target;
    if (t.dataset.dato) {
      local.datos[t.dataset.dato] = t.value;
      t.classList.remove('has-error');
      guardarBorrador();
      return;
    }
    const fila = t.closest('.pub-hab');
    if (!fila) return;
    const h = local.datos.habilidades[Number(fila.dataset.i)];

    if (t.dataset.campo === 'obligatoria') { h.obligatoria = t.checked; programarAlcance(150); guardarBorrador(); }
    if (t.dataset.campo === 'categoria')   { h.categoria = t.value; guardarBorrador(); }
  });

  cont.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Enter' || evento.target.id !== 'pub-buscar') return;
    evento.preventDefault();
    const primera = $('pub-sugerencias').querySelector('[data-accion="agregar"], [data-accion="nueva"]');
    if (primera) primera.click();
  });

  async function analizar() {
    local.mensajeError = '';
    if (local.texto.trim().length < MIN_TEXTO) {
      local.mensajeError = 'Escribe al menos ' + MIN_TEXTO + ' caracteres para poder analizar la vacante.';
      dibujar(ultimoEstado);
      return;
    }

    local.analizando = true;
    dibujar(ultimoEstado);
    try {
      const r = await Api.analizarVacante(local.texto);
      local.analisis = { cargoDetectado: r.cargoDetectado, advertencias: r.advertencias, resumen: r.resumen };
      local.datos = datosDesdeAnalisis(ultimoEstado, r);
      local.alcance = null;
      local.busqueda = '';
      local.nuevaPendiente = null;
      local.analizando = false;
      programarAlcance(0);
      cambiarEtapa('revisar');
    } catch (error) {
      local.analizando = false;
      local.mensajeError = error.message;
      dibujar(ultimoEstado);
    }
  }

  function agregarHabilidad(nombre, categoria) {
    const oficial = Diccionario.canonico(nombre);
    const enCatalogo = ultimoEstado.catalogoHabilidades.find(function (c) { return Diccionario.norm(c.nombre) === Diccionario.norm(oficial); });
    if (local.datos.habilidades.some(function (h) { return Diccionario.norm(h.nombre) === Diccionario.norm(oficial); })) return;
    if (local.datos.habilidades.length >= 20) { Comun.mostrarToast('Máximo 20 habilidades por vacante.', 'error'); return; }

    local.datos.habilidades.push({
      nombre: enCatalogo ? enCatalogo.nombre : oficial,
      categoria: enCatalogo ? enCatalogo.categoria : (categoria || 'domain'),
      nivel: 5, obligatoria: true, origen: 'lista', confianza: 'alta',
      enCatalogo: !!enCatalogo, evidencia: ''
    });
    local.busqueda = '';
    local.nuevaPendiente = null;
    programarAlcance(150);
    guardarBorrador();
    dibujar(ultimoEstado);
  }

  async function publicar(boton) {
    const d = local.datos;
    boton.disabled = true;
    $('pub-error').hidden = true;
    try {
      const vacante = await Api.publicarVacante({
        titulo: d.titulo, ciudad: d.ciudad, modalidad: d.modalidad, nivel: d.nivel, sector: d.sector,
        experienciaMin: d.experienciaMin, descripcion: d.descripcion,
        salarioMin: d.salarioMin,
        salarioMax: d.salarioMax,
        habilidades: d.habilidades.map(function (h) { return { nombre: h.nombre, nivel: h.nivel, obligatoria: h.obligatoria, categoria: h.categoria }; })
      });
      local.publicada = {
        vacante: vacante, alcance: local.alcance,
        nuevas: d.habilidades.filter(function (h) { return !h.enCatalogo; }).map(function (h) { return h.nombre; })
      };
      local.etapa = 'publicada';
      local.enfocarTitulo = true;
      borrarBorrador();
      await Reclutador.recargar();
      Comun.mostrarToast('¡Vacante publicada! Ya la pueden ver los aspirantes.');
    } catch (error) {
      mostrarErrorPublicar(error.message);
      boton.disabled = false;
    }
  }

  function reiniciar() {
    Object.assign(local, {
      etapa: 'redactar', texto: '', titulo: '', analisis: null, datos: null, busqueda: '', nuevaPendiente: null,
      alcance: null, cargandoAlcance: false, publicada: null, analizando: false, mensajeError: ''
    });
    clearTimeout(temporizadorAlcance);
    contadorAlcance++;
    borrarBorrador();
  }

  cont.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;

    if (accion === 'ejemplo') {
      local.texto = EJEMPLOS[Number(boton.dataset.i)].texto;
      local.mensajeError = '';
      guardarBorrador();
      dibujar(ultimoEstado);
      return;
    }

    if (accion === 'analizar') {
      if (local.datos && !UI.armarConfirmacion(boton, '¿Reemplazar mi revisión?')) return;
      analizar();
      return;
    }

    if (accion === 'manual') {
      local.analisis = null;
      local.datos = datosDesdeAnalisis(ultimoEstado, null);
      local.alcance = null;
      programarAlcance(0);
      cambiarEtapa('revisar');
      return;
    }

    if (accion === 'ir-revision')  { cambiarEtapa('revisar'); return; }
    if (accion === 'editar-texto') { cambiarEtapa('redactar'); return; }

    if (accion === 'descartar') {
      if (!UI.armarConfirmacion(boton, '¿Seguro? Se pierde')) return;
      reiniciar();
      cambiarEtapa('redactar');
      return;
    }

    if (accion === 'otra') { reiniciar(); cambiarEtapa('redactar'); return; }

    if (accion === 'quitar') {
      local.datos.habilidades.splice(Number(boton.closest('.pub-hab').dataset.i), 1);
      programarAlcance(150);
      guardarBorrador();
      dibujar(ultimoEstado);
      return;
    }

    if (accion === 'agregar')          { agregarHabilidad(boton.dataset.nombre, null); return; }
    if (accion === 'nueva')            { local.nuevaPendiente = boton.dataset.nombre; dibujar(ultimoEstado); return; }
    if (accion === 'cancelar-nueva')   { local.nuevaPendiente = null; dibujar(ultimoEstado); return; }
    if (accion === 'categoria-nueva')  { agregarHabilidad(local.nuevaPendiente, boton.dataset.categoria); return; }

    if (accion === 'publicar') { publicar(boton); return; }
  });

  Reclutador.registrarVista('publicar', dibujar);

})();