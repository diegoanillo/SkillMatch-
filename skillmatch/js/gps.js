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
  function puntoDePartida(vacante, perfil) {
    // Buscamos cuáles de las habilidades de la vacante ya tiene el usuario
    const habilidadesPedidas = vacante.habilidades.map(h => h.nombre.toLowerCase());
    const utiles = perfil.habilidades.filter(h => habilidadesPedidas.includes(h.nombre.toLowerCase()))
      .sort((a, b) => b.nivel - a.nivel).slice(0, 4);

    return {
      titulo: perfil.cargoActual || 'Tu punto de partida',
      habilidades: utiles.map(h => ({ nombre: h.nombre, nivel: h.nivel }))
    };
  }


  // ============================================================
  // 3. GENERAR LA RUTA
  //   ruta           { id, titulo, descripcion, pasos: [{ rol, descripcion, requisitos }] }
  //   perfil         { habilidades, cargoActual, experienciaAnios }
  //   transferencias el grafo de habilidades
  //   hoy            (opcional) fecha de referencia; por defecto, ahora
  // ============================================================
  function generar(vacante, perfil, transferencias, hoy) {
    hoy = hoy || new Date();

    // Evaluamos la vacante como si fuera el "paso final"
    const resultado = Matching.calcular(perfil.habilidades, vacante.habilidades, transferencias, {
      experienciaAnios: perfil.experienciaAnios,
      experienciaMin: vacante.experienciaMin
    });

    // Calculamos cuánto le falta para el 100% (brechas)
    const listo = resultado.puntaje === 100;

    return {
      ruta: { id: vacante.id, titulo: vacante.titulo, descripcion: vacante.descripcion },
      inicio: puntoDePartida(vacante, perfil), // Adaptaremos esta función
      pasos: [{ // Simulamos un solo paso: la vacante misma
        indice: 0,
        rol: vacante.titulo,
        descripcion: vacante.descripcion,
        resultado: resultado,
        progreso: resultado.puntaje,
        estado: listo ? 'listo' : 'actual'
      }],
      pasoActual: listo ? null : { rol: vacante.titulo, resultado: resultado },
      pasosListos: listo ? 1 : 0,
      completa: listo,
      posicion: resultado.puntaje / 100,
      meta: {
        resultado: resultado,
        progreso: resultado.puntaje,
        semanas: resultado.semanas,
        fechaLlegada: new Date(hoy.getTime() + resultado.semanas * 7 * 24 * 60 * 60 * 1000)
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
