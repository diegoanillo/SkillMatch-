/* ============================================================
   aspirante-perfil.js  →  LA VISTA "MI PERFIL" (RF-01)
   ============================================================ */

(function () {
  'use strict';

  const esc = Comun.esc;
  const $ = function (id) { return document.getElementById(id); };
  const CONTENEDOR = 'perfil-contenido';

  const CATEGORIAS = { technical: 'Técnicas', soft: 'Blandas', domain: 'De dominio' };
  const CATEGORIA_UNA = { technical: 'Técnica', soft: 'Blanda', domain: 'De dominio' };
  const MAX_SOBRE_MI = 500;

  const local = {
    filtro: 'todas',
    borrador: null,
    busqueda: '',
    nuevaPendiente: null,
    propuestas: null,
    focoPendiente: null,
    cola: Promise.resolve()
  };
  let ultimoEstado = null;

  function datosGuardados(est) {
    return {
      nombre: est.sesion.nombre,
      educacion: est.perfil.educacion || '',
      cargoActual: est.perfil.cargoActual || '',
      experienciaAnios: String(est.perfil.experienciaAnios),
      ubicacion: est.perfil.ubicacion || '',
      sobreMi: est.perfil.sobreMi || ''
    };
  }

  function leerFormulario() {
    return {
      nombre: $('perfil-nombre').value,
      educacion: $('perfil-educacion').value,
      cargoActual: $('perfil-cargo').value,
      experienciaAnios: $('perfil-experiencia').value,
      ubicacion: $('perfil-ciudad').value,
      sobreMi: $('perfil-sobremi').value
    };
  }

  function iguales(a, b) {
    return Object.keys(a).every(function (k) { return String(a[k]).trim() === String(b[k]).trim(); });
  }

  const recordarFoco = AspiranteUI.recordarFoco;
  const restaurarFoco = AspiranteUI.restaurarFoco;

  function enCola(accion) {
    local.cola = local.cola.then(accion).catch(function (error) {
      Comun.mostrarToast(error.message, 'error');
      return Aspirante.recargar();
    });
    return local.cola;
  }

  const fotoImpacto = AspiranteUI.fotoImpacto;
  const avisarImpacto = AspiranteUI.avisarImpacto;

  // ============================================================
  // 4. HTML: DATOS PERSONALES
  // ============================================================
  function opcionesSelect(lista, seleccionado) {
    const opciones = lista.slice();
    if (seleccionado && opciones.indexOf(seleccionado) < 0) opciones.push(seleccionado);
    return '<option value="">Selecciona…</option>' + opciones.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === seleccionado ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
  }

  function htmlDatos(est, datos, hayCambios) {
    const ciudades = est.catalogos.ciudades.filter(function (c) { return c !== 'Remoto'; });

    return '<div class="panel">' +
      '<h2>Tus datos</h2>' +
      '<p class="panel-sub">Esta información se usa para calcular tus coincidencias.</p>' +
      '<form id="perfil-form" class="perfil-form" novalidate>' +

        '<div class="field"><label for="perfil-nombre">Nombre completo</label>' +
          '<input type="text" id="perfil-nombre" maxlength="100" value="' + esc(datos.nombre) + '" autocomplete="name"></div>' +

        '<div class="field"><label for="perfil-email">Correo electrónico</label>' +
          '<input type="email" id="perfil-email" value="' + esc(est.sesion.email) + '" disabled>' +
          '<p class="field-help">El correo no se puede cambiar desde aquí.</p></div>' +

        '<div class="field"><label for="perfil-educacion">Nivel de estudios</label>' +
          '<select id="perfil-educacion">' + opcionesSelect(est.catalogos.educacion, datos.educacion) + '</select></div>' +

        '<div class="field-pair">' +
          '<div class="field"><label for="perfil-experiencia">Años de experiencia</label>' +
            '<input type="number" id="perfil-experiencia" min="0" max="60" step="1" value="' + esc(datos.experienciaAnios) + '"></div>' +
          '<div class="field"><label for="perfil-ciudad">Ciudad</label>' +
            '<input type="text" id="perfil-ciudad" list="lista-ciudades-perfil" maxlength="60" value="' + esc(datos.ubicacion) + '">' +
            '<datalist id="lista-ciudades-perfil">' + ciudades.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
        '</div>' +

        '<div class="field"><label for="perfil-cargo">Cargo actual <span class="opcional">(opcional)</span></label>' +
          '<input type="text" id="perfil-cargo" maxlength="80" value="' + esc(datos.cargoActual) + '"></div>' +

        '<div class="field"><label for="perfil-sobremi">Sobre mí <span class="opcional">(opcional)</span></label>' +
          '<textarea id="perfil-sobremi" rows="4" maxlength="' + MAX_SOBRE_MI + '" placeholder="Cuéntalo con tus palabras: qué has hecho, qué sabes hacer, a dónde quieres llegar.">' + esc(datos.sobreMi) + '</textarea>' +
          '<p class="field-help"><span id="perfil-contador">' + datos.sobreMi.length + '</span> / ' + MAX_SOBRE_MI + ' caracteres · Después puedes pulsar «Detectar en mi descripción» para sacar habilidades de este texto.</p></div>' +

        '<p class="form-error" id="perfil-error" role="alert" hidden></p>' +

        '<div class="perfil-acciones">' +
          '<button type="submit" class="btn btn-primary" id="perfil-guardar"' + (hayCambios ? '' : ' disabled') + '>Guardar datos</button>' +
          '<button type="button" class="btn btn-secondary" id="perfil-descartar" data-accion="descartar"' + (hayCambios ? '' : ' hidden') + '>Descartar</button>' +
          '<span class="estado-texto" id="perfil-sin-guardar"' + (hayCambios ? '' : ' hidden') + '>Tienes cambios sin guardar</span>' +
        '</div>' +
      '</form></div>';
  }

  // ============================================================
  // 5. HTML: HABILIDADES
  // ============================================================
  function htmlFila(h) {
    return '<div class="hab-row" data-nombre="' + esc(h.nombre) + '">' +
      '<div class="hab-main"><span class="hab-name">' + esc(h.nombre) + '</span>' +
        '<span class="chip chip-neutral">' + CATEGORIA_UNA[h.categoria] + '</span></div>' +
      '<div class="hab-level">' +
        '<input type="range" min="1" max="10" step="1" value="' + h.nivel + '" data-campo="nivel" data-foco="hab:' + esc(h.nombre) + '" aria-label="Nivel de ' + esc(h.nombre) + '">' +
        '<output>' + h.nivel + ' · ' + Comun.etiquetaNivel(h.nivel) + '</output>' +
      '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-accion="quitar" aria-label="Quitar ' + esc(h.nombre) + '">Quitar</button>' +
    '</div>';
  }

  function htmlPestanas(habilidades) {
    const cuenta = { todas: habilidades.length, technical: 0, soft: 0, domain: 0 };
    habilidades.forEach(function (h) { cuenta[h.categoria]++; });

    return '<div class="cat-tabs" role="group" aria-label="Filtrar por categoría">' +
      ['todas', 'technical', 'soft', 'domain'].map(function (k) {
        return '<button type="button" class="cat-btn" data-accion="filtro" data-filtro="' + k + '" aria-pressed="' + (local.filtro === k) + '">' +
               (k === 'todas' ? 'Todas' : CATEGORIAS[k]) + ' <span class="cat-count">' + cuenta[k] + '</span></button>';
      }).join('') + '</div>';
  }

  function htmlAgregar(est) {
    let contenido;
    if (local.nuevaPendiente) {
      contenido = '<div class="nueva-categoria"><p>¿Qué tipo de habilidad es <strong>«' + esc(local.nuevaPendiente) + '»</strong>?</p>' +
        '<div class="sugerencias">' +
        Object.keys(CATEGORIA_UNA).map(function (k) {
          return '<button type="button" class="chip chip-neutral chip-btn" data-accion="categoria-nueva" data-categoria="' + k + '">' + CATEGORIA_UNA[k] + '</button>';
        }).join('') +
        '<button type="button" class="link-btn" data-accion="cancelar-nueva">Cancelar</button></div></div>';
    } else {
      contenido = '<input type="text" id="perfil-buscar" class="perfil-buscar" autocomplete="off" value="' + esc(local.busqueda) + '" placeholder="Escribe: Excel, ventas, limpieza, cocina…">' +
                  '<div class="sugerencias" id="perfil-sugerencias" aria-live="polite">' + htmlSugerencias(est) + '</div>';
    }

    return '<div class="hab-add"><label for="perfil-buscar" class="hab-add-titulo">Añadir una habilidad</label>' + contenido + '</div>';
  }

  function nombresCatalogo(est) { return est.catalogoHabilidades.map(function (c) { return c.nombre; }); }

  function htmlSugerencias(est) {
    const texto = local.busqueda;
    if (texto.trim().length < 2) return '';

    const tiene = est.perfil.habilidades.map(function (h) { return h.nombre; });
    let html = Diccionario.sugerir(texto, nombresCatalogo(est), tiene, 8).map(function (n) {
      return '<button type="button" class="chip chip-neutral chip-btn" data-accion="agregar" data-nombre="' + esc(n) + '">+ ' + esc(n) + '</button>';
    }).join('');

    if (Diccionario.esDesconocida(texto, nombresCatalogo(est)) &&
        !tiene.some(function (n) { return Diccionario.norm(n) === Diccionario.norm(texto); })) {
      html += '<button type="button" class="chip chip-neutral chip-btn chip-btn--nueva" data-accion="nueva" data-nombre="' + esc(texto.trim()) + '">+ Añadir «' + esc(texto.trim()) + '» como habilidad nueva</button>';
    }
    if (html === '') html = '<span class="estado-texto">Ya la tienes o no hay coincidencias.</span>';
    return html;
  }

  function htmlPropuestas() {
    const p = local.propuestas;
    if (!p) return '';

    const marcadas = p.items.filter(function (i) { return i.marcada; }).length;
    let cuerpo;

    if (p.items.length === 0) {
      cuerpo = '<p class="reg-aviso">' + (p.yaTenia > 0 ? 'Todas las habilidades que detectamos ya están en tu perfil.' : 'No detectamos habilidades nuevas en tu descripción.') + '</p>';
    } else {
      cuerpo = p.items.map(function (i, idx) {
        const chip = i.nueva ? '<span class="chip chip-mid">Nueva</span>' : (i.origen === 'cargo' ? '<span class="chip chip-mid">Según tu cargo</span>' : '');
        return '<div class="propuesta-row" data-i="' + idx + '">' +
          '<label class="propuesta-check"><input type="checkbox" data-campo="marcar"' + (i.marcada ? ' checked' : '') + '> <span class="hab-name">' + esc(i.nombre) + '</span></label>' + chip +
          '<div class="hab-level"><input type="range" min="1" max="10" step="1" value="' + i.nivel + '" data-campo="nivel-propuesta" aria-label="Nivel de ' + esc(i.nombre) + '">' +
          '<output>' + i.nivel + ' · ' + Comun.etiquetaNivel(i.nivel) + '</output></div></div>';
      }).join('');
    }

    const avisos = p.avisos.map(function (a) { return '<p class="reg-aviso">' + esc(a) + '</p>'; }).join('');

    return '<div class="panel propuestas">' +
      '<h2>Habilidades detectadas en tu descripción</h2>' +
      '<p class="panel-sub">Marca las que quieras agregar y ajusta su nivel' + (p.yaTenia > 0 ? ' (' + p.yaTenia + (p.yaTenia === 1 ? ' ya estaba' : ' ya estaban') + ' en tu perfil)' : '') + '.</p>' +
      cuerpo + avisos +
      '<div class="perfil-acciones">' +
        (p.items.length > 0 ? '<button type="button" class="btn btn-primary btn-sm" data-accion="propuesta-agregar"' + (marcadas === 0 ? ' disabled' : '') + '>Agregar seleccionadas (' + marcadas + ')</button>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" data-accion="propuesta-cerrar">' + (p.items.length > 0 ? 'Descartar' : 'Cerrar') + '</button>' +
      '</div></div>';
  }

  function htmlHabilidades(est) {
    const todas = est.perfil.habilidades.slice().sort(function (a, b) { return b.nivel - a.nivel || a.nombre.localeCompare(b.nombre); });
    const visibles = todas.filter(function (h) { return local.filtro === 'todas' || h.categoria === local.filtro; });
    const mejor = est.ranking[0];

    let lista;
    if (todas.length === 0) lista = '<p class="empty-state">Aún no tienes habilidades. Agrégalas abajo para empezar a ver tus coincidencias.</p>';
    else if (visibles.length === 0) lista = '<p class="empty-state">No tienes habilidades en esta categoría.</p>';
    else lista = visibles.map(htmlFila).join('');

    return '<div class="panel">' +
      '<h2>Tus habilidades</h2>' +
      '<p class="panel-sub">' + (mejor
        ? 'Con tu perfil actual, tu mejor coincidencia es <strong>' + esc(mejor.empleo.titulo) + '</strong> (' + mejor.resultado.puntaje + ' %).'
        : 'Mueve la barra para indicar tu nivel: 1-3 básico · 4-6 intermedio · 7-8 avanzado · 9-10 experto.') + '</p>' +
      (todas.length > 0 && todas.length < 3 ? '<p class="aviso-exp">Con menos de 3 habilidades tus resultados serán poco fiables. Agrega más.</p>' : '') +
      htmlPestanas(todas) +
      '<div class="hab-lista">' + lista + '</div>' +
      htmlAgregar(est) +
      '<div class="hab-detectar"><button type="button" class="btn btn-secondary btn-sm" data-accion="detectar">Detectar en mi descripción</button>' +
      '<span class="estado-texto" id="perfil-estado-detectar" role="status"></span></div>' +

       // --- BOTÓN GUARDAR HABILIDADES ---
      '<div class="perfil-acciones" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px;">' +
        '<button type="button" class="btn btn-primary" data-accion="guardar-habilidades" id="btn-guardar-habilidades" disabled>Guardar cambios</button>' +
        '<span class="estado-texto" id="perfil-sin-guardar-hab" hidden>Tienes cambios sin guardar</span>' +
      '</div>' +
      // ---------------------------------
      
    '</div>';
  }


  // ============================================================
  // 6. DIBUJAR LA VISTA
  // ============================================================
  function dibujar(est) {
    ultimoEstado = est;
    const cont = $(CONTENEDOR);
    const foco = recordarFoco(cont);

    const guardados = datosGuardados(est);
    if (local.borrador && iguales(local.borrador, guardados)) local.borrador = null;
    const datos = local.borrador || guardados;

    cont.innerHTML = '<div class="perfil-grid">' +
      '<div>' + htmlDatos(est, datos, local.borrador !== null) + '</div>' +
      '<div class="perfil-col">' + htmlPropuestas() + htmlHabilidades(est) + '</div>' +
    '</div>';

    if (local.focoPendiente) {
      let el = null;
      cont.querySelectorAll('[data-foco]').forEach(function (e) { if (e.dataset.foco === local.focoPendiente) el = e; });
      local.focoPendiente = null;
      if (el) { el.focus(); try { el.scrollIntoView({ block: 'center' }); } catch (e) { /* ignorar */ } }
    } else {
      restaurarFoco(cont, foco);
    }
  }


  // ============================================================
  // 7. ACCIONES
  // ============================================================
  const cont = $(CONTENEDOR);

  function mostrarErrorForm(mensaje, idCampo) {
    $('perfil-error').textContent = mensaje;
    $('perfil-error').hidden = false;
    if (idCampo) { $(idCampo).classList.add('has-error'); $(idCampo).focus(); }
  }

  cont.addEventListener('input', function (evento) {
    const t = evento.target;

    if (t.closest('#perfil-form')) {
      t.classList.remove('has-error');
      $('perfil-error').hidden = true;
      const ahora = leerFormulario();
      local.borrador = iguales(ahora, datosGuardados(ultimoEstado)) ? null : ahora;
      const hay = local.borrador !== null;
      $('perfil-guardar').disabled = !hay;
      $('perfil-descartar').hidden = !hay;
      $('perfil-sin-guardar').hidden = !hay;
      $('perfil-contador').textContent = $('perfil-sobremi').value.length;
      return;
    }

    if (t.id === 'perfil-buscar') {
      local.busqueda = t.value;
      $('perfil-sugerencias').innerHTML = htmlSugerencias(ultimoEstado);
      return;
    }

    if (t.dataset.campo === 'nivel' || t.dataset.campo === 'nivel-propuesta') {
      const nivel = Number(t.value);
      t.parentNode.querySelector('output').textContent = nivel + ' · ' + Comun.etiquetaNivel(nivel);
      if (t.dataset.campo === 'nivel-propuesta') local.propuestas.items[Number(t.closest('.propuesta-row').dataset.i)].nivel = nivel;
      
      if (t.dataset.campo === 'nivel') {
        $('btn-guardar-habilidades').disabled = false;
        $('perfil-sin-guardar-hab').hidden = false;
      }
    }
  });

  cont.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    if (evento.target.id !== 'perfil-form') return;

    const d = leerFormulario();
    $('perfil-error').hidden = true;

    if (d.nombre.trim().length < 2) return mostrarErrorForm('Escribe tu nombre completo.', 'perfil-nombre');
    if (d.educacion === '') return mostrarErrorForm('Indica tu nivel de estudios.', 'perfil-educacion');
    const anios = Number(d.experienciaAnios);
    if (d.experienciaAnios.trim() === '' || !Number.isInteger(anios) || anios < 0 || anios > 60) {
      return mostrarErrorForm('Escribe tus años de experiencia como un número entero entre 0 y 60 (si no tienes, pon 0).', 'perfil-experiencia');
    }
    if (d.ubicacion.trim() === '') return mostrarErrorForm('Indica tu ciudad.', 'perfil-ciudad');

    $('perfil-guardar').disabled = true;
    try {
      await Api.actualizarDatosBasicos({
        nombre: d.nombre, educacion: d.educacion, cargoActual: d.cargoActual,
        experienciaAnios: anios, ubicacion: d.ubicacion, sobreMi: d.sobreMi
      });
      local.borrador = null;
      const antes = fotoImpacto();
      await Aspirante.recargar();
      avisarImpacto(antes, 'Datos guardados.');
    } catch (error) {
      mostrarErrorForm(error.message);
      $('perfil-guardar').disabled = false;
    }
  });

  cont.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton || boton.disabled) return;
    const accion = boton.dataset.accion;
    const fila = boton.closest('.hab-row');

    if (accion === 'descartar') { local.borrador = null; dibujar(ultimoEstado); return; }
    if (accion === 'filtro') { local.filtro = boton.dataset.filtro; dibujar(ultimoEstado); return; }

    if (accion === 'quitar') {
      if (!AspiranteUI.armarConfirmacion(boton, '¿Quitar?')) return;
      const nombre = fila.dataset.nombre;
      boton.disabled = true;
      enCola(async function () {
        const antes = fotoImpacto();
        await Api.eliminarHabilidad(nombre);
        await Aspirante.recargar();
        avisarImpacto(antes, 'Quitaste «' + nombre + '».');
      });
      return;
    }

    if (accion === 'agregar') { agregarHabilidad(boton.dataset.nombre, null); return; }
    if (accion === 'nueva') { local.nuevaPendiente = boton.dataset.nombre; dibujar(ultimoEstado); return; }
    if (accion === 'cancelar-nueva') { local.nuevaPendiente = null; dibujar(ultimoEstado); return; }
    if (accion === 'categoria-nueva') { agregarHabilidad(local.nuevaPendiente, boton.dataset.categoria); return; }
    if (accion === 'detectar') { detectar(boton); return; }
    if (accion === 'propuesta-cerrar') { local.propuestas = null; dibujar(ultimoEstado); return; }
    if (accion === 'propuesta-agregar') { agregarPropuestas(); return; }
    
    // --- ACCIÓN GUARDAR HABILIDADES ---
    if (accion === 'guardar-habilidades') {
      guardarHabilidades(boton);
      return;
    }
    // ---------------------------------
  });

  cont.addEventListener('change', function (evento) {
    const t = evento.target;

    // NOTA: Se ha eliminado el guardado automático de las barras de nivel.
    // Ahora se guardan todas juntas con el botón "Guardar cambios".

    if (t.dataset.campo === 'marcar') {
      local.propuestas.items[Number(t.closest('.propuesta-row').dataset.i)].marcada = t.checked;
      dibujar(ultimoEstado);
    }
  });

  cont.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Enter' || evento.target.id !== 'perfil-buscar') return;
    evento.preventDefault();
    const primera = $('perfil-sugerencias').querySelector('[data-accion="agregar"], [data-accion="nueva"]');
    if (primera) primera.click();
  });

  function agregarHabilidad(nombre, categoria) {
    const oficial = Diccionario.canonico(nombre);
    enCola(async function () {
      const antes = fotoImpacto();
      await Api.agregarHabilidad({ nombre: nombre, nivel: 5, categoria: categoria || undefined });
      local.busqueda = '';
      local.nuevaPendiente = null;
      local.focoPendiente = 'hab:' + oficial;
      await Aspirante.recargar();
      avisarImpacto(antes, 'Agregaste «' + oficial + '» con nivel 5. Ajusta su nivel con la barra.');
    });
  }

  async function detectar(boton) {
    const texto = (local.borrador || datosGuardados(ultimoEstado)).sobreMi;
    if (texto.trim() === '') {
      Comun.mostrarToast('Primero escribe algo en «Sobre mí» para poder analizarlo.', 'error');
      $('perfil-sobremi').focus();
      return;
    }

    boton.disabled = true;
    $('perfil-estado-detectar').textContent = 'Analizando…';
    try {
      const r = await Api.analizarPerfil(texto);
      const yaTiene = ultimoEstado.perfil.habilidades.map(function (h) { return Diccionario.norm(Diccionario.canonico(h.nombre)); });

      const items = r.habilidades
        .filter(function (h) { return yaTiene.indexOf(Diccionario.norm(Diccionario.canonico(h.nombre))) < 0; })
        .map(function (h) { return { nombre: h.nombre, categoria: h.categoria, nivel: h.nivel, origen: h.origen, nueva: !h.enCatalogo, marcada: true }; });

      local.propuestas = { items: items, avisos: r.advertencias, yaTenia: r.habilidades.length - items.length };
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
    }
    dibujar(ultimoEstado);
  }

  function agregarPropuestas() {
    const elegidas = local.propuestas.items.filter(function (i) { return i.marcada; });
    enCola(async function () {
      const antes = fotoImpacto();
      let agregadas = 0;
      for (let k = 0; k < elegidas.length; k++) {
        try {
          await Api.agregarHabilidad({ nombre: elegidas[k].nombre, nivel: elegidas[k].nivel, categoria: elegidas[k].categoria });
          agregadas++;
        } catch (error) { /* ya la tenía u otro problema puntual: seguimos con las demás */ }
      }
      local.propuestas = null;
      await Aspirante.recargar();
      avisarImpacto(antes, 'Agregaste ' + agregadas + (agregadas === 1 ? ' habilidad.' : ' habilidades.'));
    });
  }

  // --- NUEVA FUNCIÓN PARA GUARDAR TODAS LAS HABILIDADES ---
  async function guardarHabilidades(boton) {
    boton.disabled = true;
    const estadoEl = $('perfil-sin-guardar-hab');
    estadoEl.textContent = 'Guardando...';
    estadoEl.hidden = false;

    try {
      const filas = document.querySelectorAll('.hab-row');
      const promesas = [];
      const antes = fotoImpacto();

      // Recorremos todas las barras para obtener su valor actual
      filas.forEach(function (fila) {
        const nombre = fila.dataset.nombre;
        const input = fila.querySelector('input[type="range"]');
        if (input) {
          const nivel = Number(input.value);
          promesas.push(Api.actualizarHabilidad(nombre, nivel));
        }
      });

      // Esperamos a que todas se guarden
      await Promise.all(promesas);
      
      await Aspirante.recargar();
      avisarImpacto(antes, 'Habilidades guardadas correctamente.');
      
    } catch (error) {
      Comun.mostrarToast(error.message, 'error');
      boton.disabled = false;
      estadoEl.textContent = 'Error al guardar';
    }
  }
  // ---------------------------------------------------------

  Aspirante.registrarVista('perfil', dibujar);

})();