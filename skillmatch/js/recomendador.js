/* ============================================================
   recomendador.js  →  EL MOTOR DE RECOMENDACIONES DE APRENDIZAJE (RF-04)
   ============================================================
   Responde: "¿Qué curso o proyecto me conviene hacer primero?"

   No recomienda por popularidad ni al azar: parte de lo que le FALTA
   a la persona de verdad. Funciona en 3 pasos:

     1. NECESIDADES: junta las brechas de dos lugares
          - la oferta de referencia que eligió (lo que le piden)
          - el paso actual de su Career GPS (lo que necesita para avanzar)
        Una habilidad que falta en AMBOS sitios pesa más.

     2. RELEVANCIA: a cada recurso le da un puntaje según cuánto de lo
        que enseña cubre esas necesidades (sin contar de más: si solo
        faltan 2 niveles de SQL, un curso que da +5 aporta 2).

     3. IMPACTO: simula que la persona completa el recurso y vuelve a
        calcular su compatibilidad con la oferta de referencia. Así se
        puede decir "esto te subiría de 67 % a 74 %", un dato real,
        calculado con el mismo motor Matching.

   Es un módulo PURO (recibe datos, devuelve datos). El equipo de
   backend puede reemplazarlo respetando estas entradas y salidas.

   Un "recurso" (curso o proyecto) tiene esta forma:
     { id, titulo, tipo: 'Curso' | 'Proyecto', horas, url,
       habilidades: [{ nombre, boost }] }      // boost = cuántos niveles sube
   ============================================================ */

(function (global) {
  'use strict';

  function clave(nombre) { return Diccionario.norm(Diccionario.canonico(nombre)); }

  function nivelDe(habilidades, nombre) {
    const k = clave(nombre);
    const h = habilidades.find(function (x) { return clave(x.nombre) === k; });
    return h ? h.nivel : 0;
  }


  // ============================================================
  // 1. NECESIDADES
  //   objetivo   { empleo, resultado } de la oferta de referencia, o null
  //   pasoActual { rol, resultado } del Career GPS, o null
  // Devuelve [{ nombre, clave, brecha, peso, motivos }], las más
  // importantes primero. "brecha" = niveles que faltan.
  // ============================================================
  function necesidades(objetivo, pasoActual) {
    const porClave = {};

    // "armarMotivo" recibe la fila del desglose y devuelve la frase que explica por qué se necesita
    function sumar(desglose, armarMotivo) {
      desglose.forEach(function (d) {
        if (d.estado === 'cumple') return;

        const k = clave(d.nombre);
        const brecha = Math.max(1, d.nivelRequerido - d.nivelUsuario);
        const peso = d.obligatoria ? 2 : 1;
        const motivo = armarMotivo(d);

        if (!porClave[k]) {
          porClave[k] = { nombre: d.nombre, clave: k, brecha: brecha, peso: peso, motivos: [motivo] };
        } else {
          // Aparece en más de un lugar: pesa más y se guardan todos los motivos
          porClave[k].brecha = Math.max(porClave[k].brecha, brecha);
          porClave[k].peso += peso;
          porClave[k].motivos.push(motivo);
        }
      });
    }

    if (objetivo) {
      sumar(objetivo.resultado.desglose, function (d) {
        return 'La oferta «' + objetivo.empleo.titulo + '» pide ' + d.nombre + ' en nivel ' + d.nivelRequerido;
      });
    }
    if (pasoActual) {
      sumar(pasoActual.resultado.desglose, function (d) {
        return d.nombre + ' es necesaria para el paso «' + pasoActual.rol + '» de tu ruta';
      });
    }

    return Object.keys(porClave).map(function (k) { return porClave[k]; })
      .sort(function (a, b) { return b.peso * b.brecha - a.peso * a.brecha; });
  }


  // ============================================================
  // 2. EFECTO DE COMPLETAR UN RECURSO
  // ============================================================

  // Qué pasaría con cada habilidad que enseña (sin modificar el perfil original).
  // Misma regla que Api.cambiarEstadoCurso: sube "boost" niveles (máximo 10);
  // si la habilidad es nueva, empieza en "boost".
  function mejorasDe(recurso, perfil) {
    return recurso.habilidades.map(function (h) {
      const antes = nivelDe(perfil.habilidades, h.nombre);
      const despues = antes > 0 ? Math.min(10, antes + h.boost) : Math.min(10, h.boost);
      return { nombre: h.nombre, antes: antes, despues: despues };
    });
  }

  // Copia de las habilidades de la persona con el recurso ya aplicado
  function habilidadesConRecurso(recurso, perfil) {
    const copia = perfil.habilidades.map(function (h) { return { nombre: h.nombre, nivel: h.nivel }; });
    mejorasDe(recurso, perfil).forEach(function (m) {
      const k = clave(m.nombre);
      const existente = copia.find(function (h) { return clave(h.nombre) === k; });
      if (existente) existente.nivel = m.despues;
      else copia.push({ nombre: m.nombre, nivel: m.despues });
    });
    return copia;
  }

  // Cambio estimado en la compatibilidad con la oferta de referencia
  function impacto(recurso, perfil, objetivo, transferencias) {
    if (!objetivo) return null;
    const despues = Matching.calcular(
      habilidadesConRecurso(recurso, perfil), objetivo.empleo.habilidades, transferencias,
      { experienciaAnios: perfil.experienciaAnios, experienciaMin: objetivo.empleo.experienciaMin }
    );
    return { titulo: objetivo.empleo.titulo, antes: objetivo.resultado.puntaje, despues: despues.puntaje, delta: despues.puntaje - objetivo.resultado.puntaje };
  }


  // ============================================================
  // 3. EVALUAR Y ORDENAR LOS RECURSOS
  //   recursos        el catálogo completo
  //   perfil          { habilidades, experienciaAnios, aprendizaje }
  //   necesidades     lo que devuelve necesidades()
  //   objetivo        la oferta de referencia (para el impacto), o null
  //   transferencias  el grafo de habilidades
  // Devuelve TODOS los recursos, cada uno con:
  //   estado      'pendiente' | 'en_curso' | 'completado'
  //   relevancia  puntaje (0 = no cubre ninguna necesidad)
  //   prioridad   3 alta · 2 media · 1 baja · 0 no recomendado
  //   mejoras     [{ nombre, antes, despues }]
  //   motivos     por qué se recomienda (frases)
  //   impacto     { titulo, antes, despues, delta } o null
  // Ordenados: primero los más relevantes.
  // ============================================================
  function evaluar(recursos, perfil, listaNecesidades, objetivo, transferencias) {
    const porClave = {};
    listaNecesidades.forEach(function (n) { porClave[n.clave] = n; });

    const filas = recursos.map(function (recurso) {
      let relevancia = 0;
      const motivos = [];

      recurso.habilidades.forEach(function (h) {
        const n = porClave[clave(h.nombre)];
        if (!n) return; // Si la habilidad del curso no está en las necesidades, se ignora
        relevancia += Math.min(h.boost, n.brecha) * n.peso;
        n.motivos.forEach(function (m) { if (motivos.indexOf(m) < 0) motivos.push(m); });
      });

      return {
        recurso: recurso,
        estado: (perfil.aprendizaje && perfil.aprendizaje[recurso.id]) || 'pendiente',
        relevancia: relevancia,
        prioridad: 0,
        mejoras: mejorasDe(recurso, perfil),
        motivos: motivos.slice(0, 2),
        impacto: relevancia > 0 ? impacto(recurso, perfil, objetivo, transferencias) : null
      };
    });

    // Filtrar los que no tienen relevancia (es decir, los que no cubren las brechas de la meta)
    const relevantes = filas.filter(function (f) { return f.relevancia > 0; });

    // Prioridad y orden
    const maxima = relevantes.reduce(function (m, f) { return Math.max(m, f.relevancia); }, 0);
    relevantes.forEach(function (f) {
      const proporcion = f.relevancia / maxima;
      f.prioridad = proporcion >= 0.66 ? 3 : (proporcion >= 0.33 ? 2 : 1);
    });

    function delta(f) { return f.impacto ? f.impacto.delta : 0; }
    return relevantes.sort(function (a, b) {
      return b.relevancia - a.relevancia || delta(b) - delta(a) || a.recurso.horas - b.recurso.horas;
    });
  }

  global.Recomendador = {
    necesidades: necesidades,
    evaluar: evaluar,
    mejorasDe: mejorasDe,
    impacto: impacto
  };

})(window);
