/* ============================================================
   aspirante-ui.js  →  PIEZAS DE DIBUJO COMPARTIDAS DEL PANEL DEL ASPIRANTE
   ============================================================
   Varias vistas necesitan lo mismo: el radar, el desglose por
   habilidad, los colores según el nivel de compatibilidad, la
   confirmación en dos pasos... Para no copiar ese código en cada
   vista, vive aquí UNA sola vez y todas lo usan:

       const UI = AspiranteUI;
       UI.dibujarRadar(resultado.desglose)

   Todo son "funciones puras" de dibujo: reciben datos y devuelven
   HTML (o hacen una pequeña acción sobre un elemento). No hablan
   con Api ni guardan nada.
   ============================================================ */

(function (global) {
  'use strict';

  const esc = Comun.esc;

  // ============================================================
  // 1. AYUDAS DE DIBUJO
  // ============================================================

  // Clase de color según el nivel de compatibilidad
  function claseNumero(nivel) { return nivel === 'alta' ? '' : (nivel === 'media' ? ' is-mid' : ' is-low'); }
  function claseChipNivel(nivel) { return nivel === 'alta' ? 'chip-match' : (nivel === 'media' ? 'chip-mid' : 'chip-gap'); }

  // Chip y barra según el estado de cada habilidad
  const ETIQUETA_ESTADO = { cumple: 'Cumple', parcial: 'Cerca', transferible: 'Transferible', brecha: 'Brecha' };
  function claseChipEstado(est) { return est === 'cumple' ? 'chip-match' : (est === 'brecha' ? 'chip-gap' : 'chip-mid'); }
  function claseBarra(est) { return est === 'brecha' ? ' bar-fill--gap' : (est === 'cumple' ? '' : ' bar-fill--mid'); }

  // Primero lo que más falta
  const RANGO_ESTADO = { brecha: 0, transferible: 1, parcial: 2, cumple: 3 };


  // ============================================================
  // 2. RADAR DE HABILIDADES
  // ------------------------------------------------------------
  // Un polígono con un eje por habilidad que pide la oferta. Se
  // dibuja a mano con trigonometría básica (sin librerías): el
  // número de ejes cambia según la oferta.
  //   - Ámbar:         lo que pide la oferta
  //   - Cian sólido:   tu nivel actual
  //   - Cian punteado: tu nivel con tu potencial (lo que podrías aprender)
  // ============================================================

  // Parte un nombre largo en hasta 2 líneas de ~14 caracteres
  function partirEtiqueta(texto) {
    const palabras = texto.split(' ');
    const lineas = [''];
    palabras.forEach(function (p) {
      const ultima = lineas.length - 1;
      if ((lineas[ultima] + ' ' + p).trim().length <= 14 || lineas[ultima] === '') lineas[ultima] = (lineas[ultima] + ' ' + p).trim();
      else lineas.push(p);
    });
    return lineas.slice(0, 2);
  }

  function dibujarRadar(desglose) {
    // Los ejes más importantes: obligatorias primero, luego las de mayor nivel. Máximo 8.
    const ejes = desglose.slice().sort(function (a, b) {
      if (a.obligatoria !== b.obligatoria) return a.obligatoria ? -1 : 1;
      return b.nivelRequerido - a.nivelRequerido;
    }).slice(0, 8);

    // Con menos de 3 ejes no hay polígono: mostramos barras
    if (ejes.length < 3) return dibujarBarrasAlternas(ejes);

    const ancho = 380, alto = 320, cx = 190, cy = 160, radio = 92;
    const n = ejes.length;

    // Convierte (número de eje, valor 0-10) en coordenadas x,y.
    // Empezamos arriba (-90°) y repartimos los 360° entre los ejes.
    function punto(i, valor, extra) {
      const angulo = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (Math.min(10, valor) / 10) * radio + (extra || 0);
      return { x: cx + r * Math.cos(angulo), y: cy + r * Math.sin(angulo), cos: Math.cos(angulo), sin: Math.sin(angulo) };
    }
    function poligono(valorDe) {
      return ejes.map(function (e, i) { const p = punto(i, valorDe(e)); return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    }

    let svg = '<svg class="radar-svg" viewBox="0 0 ' + ancho + ' ' + alto + '" role="img" aria-label="Radar con tu nivel frente al nivel requerido en ' + n + ' habilidades">';

    // Malla de fondo: 3 anillos
    [3.3, 6.6, 10].forEach(function (nivel) {
      svg += '<polygon points="' + poligono(function () { return nivel; }) + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
    });

    // Líneas y etiquetas de cada eje
    ejes.forEach(function (e, i) {
      const borde = punto(i, 10);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + borde.x.toFixed(1) + '" y2="' + borde.y.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';

      const et = punto(i, 10, 14);
      const ancla = et.cos > 0.3 ? 'start' : (et.cos < -0.3 ? 'end' : 'middle');
      const lineas = partirEtiqueta(e.nombre);
      const yInicio = et.y - (lineas.length - 1) * 5.5 + (et.sin > 0.5 ? 6 : (et.sin < -0.5 ? -2 : 3));
      svg += '<text x="' + et.x.toFixed(1) + '" text-anchor="' + ancla + '">' +
             lineas.map(function (linea, k) { return '<tspan x="' + et.x.toFixed(1) + '" y="' + (yInicio + k * 11).toFixed(1) + '">' + esc(linea) + '</tspan>'; }).join('') + '</text>';
    });

    // Polígonos: primero el requerido (queda detrás), luego el potencial, al final el tuyo
    svg += '<polygon points="' + poligono(function (e) { return e.nivelRequerido; }) + '" fill="var(--waypoint)" fill-opacity="0.12" stroke="var(--waypoint)" stroke-width="1.5"/>';
    svg += '<polygon points="' + poligono(function (e) { return e.nivelEfectivo; }) + '" fill="none" stroke="var(--route)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    svg += '<polygon points="' + poligono(function (e) { return e.nivelUsuario; }) + '" fill="var(--route)" fill-opacity="0.18" stroke="var(--route)" stroke-width="2"/>';

    return svg + '</svg>';
  }

  // Alternativa cuando la oferta pide menos de 3 habilidades
  function dibujarBarrasAlternas(ejes) {
    return '<div style="flex:1;min-width:220px">' + ejes.map(function (e) {
      return '<div class="bd-row"><div class="bd-top"><span class="bd-name">' + esc(e.nombre) + '</span>' +
             '<span class="bd-levels">tienes ' + e.nivelUsuario + ' · pide ' + e.nivelRequerido + '</span></div>' +
             '<div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, (e.nivelUsuario / e.nivelRequerido) * 100) + '%"></div></div></div>';
    }).join('') + '</div>';
  }



  // ============================================================
  // 3. DESGLOSE POR HABILIDAD (la "IA explicable")
  // ------------------------------------------------------------
  // Dos bloques que se repiten en el Panel y en el detalle de una oferta.
  // ============================================================

  // Barras "lo que cumples hoy" frente a "tu potencial"
  // (tercera = true → "Lo que cumple hoy" / "Su potencial", para que lo lea un reclutador)
  function htmlBarrasHoyPotencial(r, tercera) {
    return '<div class="explica-bars">' +
      '<div><div class="explica-bar-top"><span>' + (tercera ? 'Lo que cumple hoy' : 'Lo que cumples hoy') + '</span><strong>' + r.puntajeActual + '%</strong></div><div class="bar-track"><div class="bar-fill" style="width:' + r.puntajeActual + '%"></div></div></div>' +
      '<div><div class="explica-bar-top"><span>' + (tercera ? 'Su potencial (lo que podría aprender)' : 'Tu potencial (lo que podrías aprender)') + '</span><strong>' + r.puntajePotencial + '%</strong></div><div class="bar-track"><div class="bar-fill bar-fill--mid" style="width:' + r.puntajePotencial + '%"></div></div></div>' +
    '</div>';
  }

  // Una fila por habilidad que pide la oferta, con su estado, nivel y explicación.
  // Primero lo que más falta.
  function htmlDesglose(r, tercera) {
    return r.desglose.slice().sort(function (a, b) { return RANGO_ESTADO[a.estado] - RANGO_ESTADO[b.estado]; }).map(function (d) {
      return '<div class="bd-row"><div class="bd-top">' +
               '<span class="bd-name">' + esc(d.nombre) + (d.obligatoria ? '' : ' <span class="chip chip-neutral">opcional</span>') + '</span>' +
               '<span><span class="chip ' + claseChipEstado(d.estado) + '">' + ETIQUETA_ESTADO[d.estado] + '</span> <span class="bd-levels">' + (tercera ? 'tiene ' : 'tienes ') + d.nivelUsuario + ' · pide ' + d.nivelRequerido + '</span></span>' +
             '</div>' +
             '<div class="bar-track"><div class="bar-fill' + claseBarra(d.estado) + '" style="width:' + Math.round(d.credito * 100) + '%"></div></div>' +
             '<p class="bd-text">' + esc(d.explicacion) + '</p></div>';
    }).join('');
  }


  // Leyenda del radar (qué significa cada línea)
  function htmlLeyendaRadar(tercera) {
    return '<div class="radar-legend">' +
      '<div class="legend-row"><span class="legend-dot" style="background:var(--route)"></span> ' + (tercera ? 'Su nivel actual' : 'Tu nivel actual') + '</div>' +
      '<div class="legend-row"><span class="legend-line"></span> ' + (tercera ? 'Su nivel con su potencial' : 'Tu nivel con tu potencial') + '</div>' +
      '<div class="legend-row"><span class="legend-dot" style="background:var(--waypoint)"></span> Nivel requerido</div>' +
    '</div>';
  }

  // Aviso cuando a la persona le faltan años de experiencia para la oferta ('' si no le faltan)
  function htmlAvisoExperiencia(perfil, empleo, resultado, tercera) {
    if (resultado.aniosFaltantes <= 0) return '';
    return '<p class="aviso-exp">Esta oferta pide ' + empleo.experienciaMin + (empleo.experienciaMin === 1 ? ' año' : ' años') +
           ' de experiencia y ' + (tercera ? 'la persona tiene ' : 'tienes ') + perfil.experienciaAnios + ': el resultado se ajusta levemente (×' + resultado.factorExperiencia + ').</p>';
  }


  // ============================================================
  // 4. CONFIRMACIÓN EN DOS PASOS
  // ------------------------------------------------------------
  // Para acciones que conviene confirmar (postular, quitar). El primer
  // clic "arma" el botón y cambia su texto; el segundo confirma.
  // Si no se confirma en 4 segundos, vuelve a su estado normal.
  //   Devuelve true  → es el segundo clic: seguir con la acción
  //   Devuelve false → es el primer clic: ya se armó el botón, no hacer nada más
  // ============================================================
  function armarConfirmacion(boton, textoConfirmar) {
    if (boton.dataset.armado === '1') return true;

    const textoOriginal = boton.textContent;
    boton.dataset.armado = '1';
    boton.textContent = textoConfirmar;
    setTimeout(function () {
      if (boton.isConnected) { boton.dataset.armado = '0'; boton.textContent = textoOriginal; }
    }, 4000);
    return false;
  }


  // ============================================================
  // 5. CONSERVAR EL FOCO AL REDIBUJAR
  // ------------------------------------------------------------
  // Al redibujar una vista, el navegador pierde el foco. Lo anotamos
  // antes y lo devolvemos después: así quien usa el teclado (por
  // ejemplo, moviendo una barra con las flechas) no tiene que volver
  // a buscar el control. El control se identifica por su "id" o por
  // un atributo data-foco="clave".
  // ============================================================
  function recordarFoco(contenedor) {
    const a = document.activeElement;
    if (!a || !contenedor.contains(a)) return null;
    return { foco: a.dataset.foco || null, id: a.id || null, ini: a.selectionStart, fin: a.selectionEnd };
  }

  function restaurarFoco(contenedor, f) {
    if (!f) return;
    let el = null;
    if (f.foco) {
      contenedor.querySelectorAll('[data-foco]').forEach(function (e) { if (e.dataset.foco === f.foco) el = e; });
    } else if (f.id) {
      el = document.getElementById(f.id);
    }
    if (!el) return;
    el.focus();
    if (typeof f.ini === 'number' && el.setSelectionRange) { try { el.setSelectionRange(f.ini, f.fin); } catch (e) { /* ignorar */ } }
  }

  // ============================================================
  // 6. AVISO DE IMPACTO EN LA COMPATIBILIDAD
  // ------------------------------------------------------------
  // Cuando la persona hace algo que puede mover su compatibilidad
  // (cambiar un nivel, completar un curso...), le contamos CUÁNTO:
  //     const antes = AspiranteUI.fotoImpacto();   // ANTES de la acción
  //     ... Api...; await Aspirante.recargar();
  //     AspiranteUI.avisarImpacto(antes, 'Listo.'); // DESPUÉS
  // Compara la oferta de referencia antes y después.
  // ============================================================
  function fotoImpacto() {
    const obj = Aspirante.estado.objetivo;
    return obj ? { id: obj.empleo.id, titulo: obj.empleo.titulo, puntaje: obj.resultado.puntaje } : null;
  }

  function avisarImpacto(antes, mensaje) {
    let texto = mensaje;
    if (antes) {
      const fila = Aspirante.estado.ranking.find(function (f) { return f.empleo.id === antes.id; });
      if (fila && fila.resultado.puntaje !== antes.puntaje) {
        texto += ' Tu compatibilidad con «' + antes.titulo + '» pasó de ' + antes.puntaje + ' % a ' + fila.resultado.puntaje + ' %.';
      }
    }
    Comun.mostrarToast(texto);
  }

  // ============================================================
  // 7. FOTO DEL CAREER GPS
  // ------------------------------------------------------------
  // El estado del GPS de la ruta que es la META de la persona, en un
  // momento dado. Se toma ANTES y DESPUÉS de algo que puede hacerla
  // avanzar (completar un curso) para poder contarle cuánto avanzó:
  //     const antes = AspiranteUI.fotoGPS();
  //     ... Api...; await Aspirante.recargar();
  //     const despues = AspiranteUI.fotoGPS();
  // Devuelve null si no tiene una meta elegida.
  // ============================================================
  function fotoGPS() {
    const est = Aspirante.estado;
    const ruta = est.rutas.find(function (r) { return r.id === est.perfil.rutaMetaId; });
    if (!ruta) return null;

    const g = CareerGPS.generar(ruta, est.perfil, est.transferencias);
    return {
      rutaId: ruta.id, titulo: ruta.titulo,
      progreso: g.meta.progreso, semanas: g.meta.semanas,
      listos: g.pasos.filter(function (p) { return p.estado === 'listo'; }).map(function (p) { return p.rol; }),
      completa: g.completa
    };
  }

  global.AspiranteUI = {
    claseNumero: claseNumero,
    claseChipNivel: claseChipNivel,
    ETIQUETA_ESTADO: ETIQUETA_ESTADO,
    claseChipEstado: claseChipEstado,
    claseBarra: claseBarra,
    RANGO_ESTADO: RANGO_ESTADO,
    dibujarRadar: dibujarRadar,
    htmlBarrasHoyPotencial: htmlBarrasHoyPotencial,
    htmlDesglose: htmlDesglose,
    htmlLeyendaRadar: htmlLeyendaRadar,
    htmlAvisoExperiencia: htmlAvisoExperiencia,
    armarConfirmacion: armarConfirmacion,
    recordarFoco: recordarFoco,
    restaurarFoco: restaurarFoco,
    fotoImpacto: fotoImpacto,
    avisarImpacto: avisarImpacto,
    fotoGPS: fotoGPS
  };

})(window);
