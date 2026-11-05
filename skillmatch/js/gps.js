/* ============================================================
   gps.js  →  EL MOTOR DEL CAREER GPS (RF-03)
   ============================================================
   Responde: "Desde donde estoy hoy, ¿cuánto me falta para llegar a
   mi meta profesional, y por qué pasos?"

   Una RUTA es una lista de pasos (cargos) por los que se suele pasar
   para llegar a una meta. Por ejemplo, para "Analista de datos":
       Analista de datos jr.  →  Analista de datos
   Cada paso lista las habilidades (y niveles) que hay que cumplir.

   Este módulo toma una ruta y el perfil de la persona y calcula, para
   cada paso, qué tan cerca está (usando el mismo motor Matching que
   calcula las ofertas). Con eso decide el estado de cada paso:

       listo      → ya cumple todas las habilidades obligatorias del paso
       actual     → el primer paso que todavía no cumple: el que sigue
       pendiente  → los pasos posteriores

   Y estima el tiempo hasta la meta con las mismas "semanas" que ya
   calcula Matching.

   Es un módulo PURO: recibe datos y devuelve datos, sin tocar la
   pantalla ni guardar nada. Así se puede probar solo, y el equipo de
   backend puede reemplazarlo por el suyo respetando estas entradas y salidas.
   ============================================================ */

(function (global) {
  'use strict';

  const DIA_MS = 24 * 60 * 60 * 1000;

  // Clave de una habilidad: su nombre oficial sin tildes ni mayúsculas.
  // clave('MS Excel') === clave('excel')
  function clave(nombre) { return Diccionario.norm(Diccionario.canonico(nombre)); }


  // ============================================================
  // 1. REQUISITOS DE LA RUTA COMPLETA
  // ------------------------------------------------------------
  // Para estimar el tiempo hasta la META hay que sumar lo que se
  // necesita a lo largo de TODOS los pasos, sin contar dos veces la
  // misma habilidad. Si dos pasos piden SQL (nivel 5 y nivel 7),
  // lo que hay que alcanzar al final es el 7. Y basta que un paso
  // la pida como obligatoria para que cuente como obligatoria.
  // ============================================================
  function fusionarRequisitos(pasos) {
    const porClave = {};
    pasos.forEach(function (paso) {
      paso.requisitos.forEach(function (req) {
        const k = clave(req.nombre);
        if (!porClave[k]) {
          porClave[k] = { nombre: req.nombre, nivel: req.nivel, obligatoria: req.obligatoria !== false };
        } else {
          porClave[k].nivel = Math.max(porClave[k].nivel, req.nivel);
          if (req.obligatoria !== false) porClave[k].obligatoria = true;
        }
      });
    });
    return Object.keys(porClave).map(function (k) { return porClave[k]; });
  }


  // ============================================================
  // 2. PUNTO DE PARTIDA
  // ------------------------------------------------------------
  // "Posición actual": el cargo de la persona y las habilidades suyas
  // que más sirven para esta ruta (las que la ruta pide, de mayor a
  // menor nivel). Si ninguna coincide, sus habilidades más fuertes.
  // ============================================================
  function puntoDePartida(ruta, perfil) {
    const pedidas = {};
    ruta.pasos.forEach(function (p) { p.requisitos.forEach(function (r) { pedidas[clave(r.nombre)] = true; }); });

    const ordenadas = perfil.habilidades.slice().sort(function (a, b) { return b.nivel - a.nivel; });
    const utiles = ordenadas.filter(function (h) { return pedidas[clave(h.nombre)]; });
    const elegidas = (utiles.length > 0 ? utiles : ordenadas).slice(0, 4);

    return {
      titulo: perfil.cargoActual && perfil.cargoActual.trim() !== '' ? perfil.cargoActual : 'Tu punto de partida',
      habilidades: elegidas.map(function (h) { return { nombre: h.nombre, nivel: h.nivel }; })
    };
  }


  // ============================================================
  // 3. GENERAR LA RUTA
  //   ruta           { id, titulo, descripcion, pasos: [{ rol, descripcion, requisitos }] }
  //   perfil         { habilidades, cargoActual, experienciaAnios }
  //   transferencias el grafo de habilidades
  //   hoy            (opcional) fecha de referencia; por defecto, ahora
  // ============================================================
  function generar(ruta, perfil, transferencias, hoy) {
    hoy = hoy || new Date();

    // Cada paso se evalúa con el mismo motor que las ofertas
    const pasos = ruta.pasos.map(function (paso, i) {
      const resultado = Matching.calcular(perfil.habilidades, paso.requisitos, transferencias);

      // "Listo" = todas las habilidades OBLIGATORIAS del paso están cumplidas
      const listo = resultado.desglose.every(function (d) { return !d.obligatoria || d.estado === 'cumple'; });

      // "progreso" = qué parte de lo que pide este paso ya cumples HOY (0 a 100).
      // Solo sube cuando subes un nivel: nunca baja por mejorar.
      return { indice: i, rol: paso.rol, descripcion: paso.descripcion, requisitos: paso.requisitos, resultado: resultado,
               progreso: listo ? 100 : resultado.puntajeActual, estado: listo ? 'listo' : null };
    });

    // El primer paso que NO está listo es el "actual"; los siguientes quedan "pendientes".
    let hayActual = false;
    pasos.forEach(function (paso) {
      if (paso.estado === 'listo') return;
      paso.estado = hayActual ? 'pendiente' : 'actual';
      hayActual = true;
    });

    const pasosListos = pasos.filter(function (p) { return p.estado === 'listo'; }).length;
    const completa = pasosListos === pasos.length;

    // Tiempo hasta la meta: lo que falta para cumplir TODOS los requisitos de la ruta
    const resultadoMeta = Matching.calcular(perfil.habilidades, fusionarRequisitos(ruta.pasos), transferencias);
    const semanas = completa ? 0 : resultadoMeta.semanas;

    const pasoActual = pasos.find(function (p) { return p.estado === 'actual'; }) || null;

    // POSICIÓN sobre la línea de la ruta, de 0 (punto de partida) a 1 (meta).
    // Los pasos anteriores al actual están todos "listos" (el actual es el primero que no lo está),
    // así que la persona está "entre el paso anterior y el actual", avanzada según su progreso en él.
    // Es lo que se dibuja como el punto "Estás aquí" y el tramo coloreado de la línea.
    const posicion = completa ? 1 : (pasoActual.indice + pasoActual.progreso / 100) / pasos.length;

    return {
      ruta: { id: ruta.id, titulo: ruta.titulo, descripcion: ruta.descripcion },
      inicio: puntoDePartida(ruta, perfil),
      pasos: pasos,
      pasoActual: pasoActual,
      pasosListos: pasosListos,
      completa: completa,
      posicion: posicion,
      meta: {
        resultado: resultadoMeta,
        // PROGRESO hacia la meta (0 a 100): qué parte de TODO lo que pide la ruta cumples hoy.
        // Es la cifra principal que ve la persona: sube con cada nivel que mejora.
        progreso: completa ? 100 : resultadoMeta.puntajeActual,
        semanas: semanas,
        fechaLlegada: new Date(hoy.getTime() + semanas * 7 * DIA_MS)
      }
    };
  }


  // ============================================================
  // 4. COMPARAR LAS RUTAS ALTERNATIVAS
  // ------------------------------------------------------------
  // Un resumen por ruta, de la más corta a la más larga, para que
  // la persona elija con información.
  // ============================================================
  function comparar(rutas, perfil, transferencias, hoy) {
    return rutas.map(function (ruta) {
      const g = generar(ruta, perfil, transferencias, hoy);
      return {
        ruta: ruta,
        pasosListos: g.pasosListos,
        pasosTotal: g.pasos.length,
        puntajeMeta: g.meta.resultado.puntaje,
        progreso: g.meta.progreso,
        semanas: g.meta.semanas,
        fechaLlegada: g.meta.fechaLlegada,
        completa: g.completa
      };
    }).sort(function (a, b) { return a.semanas - b.semanas || b.puntajeMeta - a.puntajeMeta; });
  }

  global.CareerGPS = {
    generar: generar,
    comparar: comparar,
    fusionarRequisitos: fusionarRequisitos
  };

})(window);
