/* ============================================================
   api.js  →  LA "CAPA DE SERVICIOS" (el puente hacia el backend)
   ============================================================ */

(function (global) {
  'use strict';

  const CLAVE_DB = 'skillmatch_db';
  const CLAVE_SESION = 'skillmatch_sesion';
  const LATENCIA_MS = 60;

  const paginaPorRol = {
    aspirante: 'dashboard-aspirante.html',
    reclutador: 'dashboard-reclutador.html'
  };

  function clonar(x) { return JSON.parse(JSON.stringify(x)); }

  function esperar() {
    return new Promise(function (resolver) { setTimeout(resolver, LATENCIA_MS); });
  }

  function norm(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function leerDB() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(CLAVE_DB)); } catch (e) { db = null; }
    if (!db || db.version !== global.DATOS_DEMO_VERSION) {
      db = global.crearDatosDemo();
      guardarDB(db);
    }
    return db;
  }

  function guardarDB(db) {
    localStorage.setItem(CLAVE_DB, JSON.stringify(db));
  }

  function contexto() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    const db = leerDB();
    const perfil = db.perfiles[sesion.id];
    if (!perfil) throw new Error('No encontramos tu perfil.');
    return { sesion: sesion, db: db, perfil: perfil };
  }

  function sesionActual() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch (e) { return null; }
  }

  function exigirRol(rol) {
    const sesion = sesionActual();
    if (!sesion) { global.location.replace('index.html'); return null; }
    if (sesion.rol !== rol) { global.location.replace(paginaPorRol[sesion.rol]); return null; }
    return sesion;
  }

  async function login(email, password, rol) {
    const respuesta = await fetch('http://127.0.0.1:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password: password })
    });

    if (!respuesta.ok) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const usuarioBackend = await respuesta.json();
    const tipoEsperado = rol === 'aspirante' ? 'ASPIRANTE' : 'EMPLEADOR';
    if (usuarioBackend.tipo_usuario !== tipoEsperado) {
      throw new Error('Elegiste un tipo de usuario incorrecto.');
    }

    const sesion = {
      id: String(usuarioBackend.id),
      nombre: usuarioBackend.nombre + ' ' + usuarioBackend.apellido,
      email: usuarioBackend.email,
      rol: rol
    };

    sessionStorage.setItem('skillmatch_sesion', JSON.stringify(sesion));
    return sesion;
  }

  async function logout() {
    sessionStorage.removeItem(CLAVE_SESION);
  }

  async function emailDisponible(email) {
    const e = String(email || '').trim().toLowerCase();
    if (e === '') return true;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/auth/email-disponible?email=${encodeURIComponent(e)}`);
      if (res.ok) {
        const data = await res.json();
        return data.disponible;
      }
    } catch (error) {
      console.warn('Error al verificar el correo:', error);
    }
    return true;
  }

  async function registrar(datos) {
    // 1. Crear el usuario
    const partesNombre = datos.nombre.trim().split(/\s+/);
    const nombre = partesNombre[0];
    const apellido = partesNombre.slice(1).join(' ') || '-';

    const resUsuario = await fetch('http://127.0.0.1:8000/usuarios/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre,
        apellido: apellido,
        email: datos.email,
        password: datos.password,
        tipo_usuario: datos.rol === 'aspirante' ? 'ASPIRANTE' : 'EMPLEADOR'
      })
    });

        if (!resUsuario.ok) {
      const err = await resUsuario.json();
      if (err.detail && Array.isArray(err.detail)) {
         // Extraemos el mensaje del validador de Pydantic
         const mensaje = err.detail[0].msg || 'Datos inválidos.';
         throw new Error(mensaje);
      }
      throw new Error(err.detail || 'Error al crear el usuario.');
    }
    
    const usuarioCreado = await resUsuario.json();

    // 2. Si es ASPIRANTE, crear su perfil y habilidades
    if (datos.rol === 'aspirante') {
      
      // 2.1 Guardar el perfil
      const resPerfil = await fetch('http://127.0.0.1:8000/perfiles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioCreado.id,
          formacion_academica: datos.perfil.educacion || null,
          experiencia_laboral: String(datos.perfil.experienciaAnios || 0) + ' años',
          ubicacion: datos.perfil.ubicacion || null,
          resumen_profesional: datos.perfil.sobreMi || null
        })
      });

            if (!resPerfil.ok) {
        const errorPerfil = await resPerfil.json();
        // Extraemos el mensaje de validación de Pydantic (que viene en un arreglo)
        let mensaje = 'Revisa los datos de tu perfil.';
        if (errorPerfil.detail && Array.isArray(errorPerfil.detail) && errorPerfil.detail.length > 0) {
          mensaje = errorPerfil.detail[0].msg;
        } else if (errorPerfil.detail) {
          mensaje = errorPerfil.detail;
        }
        throw new Error(mensaje);
      }

      // 2.2 Guardar las habilidades (con try/catch para no romper el bucle)
      if (datos.perfil.habilidades && datos.perfil.habilidades.length > 0) {
        const resCat = await fetch('http://127.0.0.1:8000/habilidades/');
        const catalogo = await resCat.json();
        
        const guardadas = {};

        for (let h of datos.perfil.habilidades) {
          const clave = h.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          
          if (guardadas[clave]) continue;
          
          let hab = catalogo.find(c => c.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === clave);
          
          if (!hab) {
            const resNueva = await fetch('http://127.0.0.1:8000/habilidades/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nombre: h.nombre })
            });
            if (resNueva.ok) {
                hab = await resNueva.json();
            } else {
                const resCat2 = await fetch('http://127.0.0.1:8000/habilidades/');
                const cat2 = await resCat2.json();
                hab = cat2.find(c => c.nombre.toLowerCase().trim() === h.nombre.toLowerCase().trim());
            }
          }

          if (hab) {
            const resAsociar = await fetch('http://127.0.0.1:8000/habilidades/usuarios/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usuario_id: usuarioCreado.id,
                habilidad_id: hab.id,
                nivel: h.nivel // <--- Enviamos el número exacto
              })
            });

            if (!resAsociar.ok && resAsociar.status !== 409) {
               console.warn('No se pudo asociar la habilidad:', h.nombre);
            }
          }
          
          guardadas[clave] = true;
        }
      }
    }

    // 3. Si es RECLUTADOR, crear su empresa
    if (datos.rol === 'reclutador') {
      await fetch('http://127.0.0.1:8000/usuarios/empresas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioCreado.id,
          nombre: datos.empresa.nombre,
          sector: datos.empresa.sector,
          ciudad: datos.empresa.ciudad
        })
      });
    }

    // 4. Iniciar sesión con el usuario recién creado
    const sesion = {
      id: String(usuarioCreado.id),
      nombre: usuarioCreado.nombre + ' ' + usuarioCreado.apellido,
      email: usuarioCreado.email,
      rol: datos.rol
    };

    sessionStorage.setItem('skillmatch_sesion', JSON.stringify(sesion));
    return { sesion: sesion, mejorOferta: null };
  }

  async function getCatalogos() {
    const res = await fetch('http://127.0.0.1:8000/catalogos/');
    if (!res.ok) throw new Error('No se pudieron cargar los catálogos.');
    return await res.json();
  }

  async function getCatalogoHabilidades() { await esperar(); return clonar(leerDB().habilidades); }
  async function getTransferencias()      { await esperar(); return clonar(leerDB().transferencias); }

  async function getEmpleos() {
    const respuesta = await fetch('http://127.0.0.1:8000/vacantes/');
    if (!respuesta.ok) throw new Error('No pudimos cargar las vacantes.');
    const vacantesBackend = await respuesta.json();

    const respCat = await fetch('http://127.0.0.1:8000/habilidades/');
    const catalogo = respCat.ok ? await respCat.json() : [];

    const promesasVacantes = vacantesBackend.map(async (v) => {
      const respHab = await fetch(`http://127.0.0.1:8000/vacantes/${v.id}/habilidades`);
      const vacanteHabilidades = respHab.ok ? await respHab.json() : [];

      let nombreEmpresa = "Empresa Confidencial";
      try {
        const respEmp = await fetch(`http://127.0.0.1:8000/vacantes/${v.id}/empresa`);
        if (respEmp.ok) {
          const dataEmp = await respEmp.json();
          if (dataEmp && dataEmp.nombre) nombreEmpresa = dataEmp.nombre;
        }
      } catch (e) { /* Si falla, se queda con el genérico */ }

      const habilidadesMapeadas = vacanteHabilidades.map(vh => {
        const habilidadReal = catalogo.find(c => c.id === vh.habilidad_id);
        return {
          nombre: habilidadReal ? habilidadReal.nombre : "Habilidad Desconocida",
          nivel: Number(vh.nivel_requerido) || 5,
          obligatoria: true
        };
      });

      return {
        id: String(v.id),
        titulo: v.titulo,
        empresa: nombreEmpresa,
        ciudad: v.ubicacion || 'No especificada',
        empleador_id: String(v.empleador_id),
        modalidad: v.modalidad || 'Presencial',
        nivel: 'Junior', 
        sector: 'General',
        experienciaMin: 0, 
        salarioMin: v.salario_min || null,
        salarioMax: v.salario_max || null,
        publicado: new Date(v.fecha_publicacion).getTime(),
        descripcion: v.descripcion,
        estado: v.estado ? v.estado.toLowerCase() : 'activa',
        habilidades: habilidadesMapeadas
      };
    });

    return await Promise.all(promesasVacantes);
  }

  async function getCursos() {
    const res = await fetch('http://127.0.0.1:8000/cursos/');
    const cursosBackend = res.ok ? await res.json() : [];
    
    const cursosCompletos = await Promise.all(cursosBackend.map(async (c) => {
      const resHab = await fetch(`http://127.0.0.1:8000/cursos/${c.id}/habilidades`);
      const habs = resHab.ok ? await resHab.json() : [];
      
      const resCat = await fetch('http://127.0.0.1:8000/habilidades/');
      const catalogo = await resCat.json();

      return {
        id: String(c.id),
        titulo: c.titulo,
        tipo: c.tipo,
        horas: c.horas,
        url: c.url,
        habilidades: habs.map(h => {
          const info = catalogo.find(cat => cat.id === h.habilidad_id);
          return { nombre: info ? info.nombre : "Habilidad", boost: h.boost };
        })
      };
    }));
    return cursosCompletos;
  }

  async function getRutas()               { await esperar(); return clonar(leerDB().rutas); }

  async function getPerfil() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

    const respuestaPerfil = await fetch(`http://127.0.0.1:8000/perfiles/${sesion.id}`);
    if (!respuestaPerfil.ok) throw new Error('No encontramos tu perfil.');
    const perfilBackend = await respuestaPerfil.json();

    const respuestaHabilidades = await fetch(`http://127.0.0.1:8000/habilidades/usuarios/${sesion.id}`);
    const habilidadesBackend = respuestaHabilidades.ok ? await respuestaHabilidades.json() : [];
    
    const respuestaCatalogo = await fetch(`http://127.0.0.1:8000/habilidades/`);
    const catalogoBackend = respuestaCatalogo.ok ? await respuestaCatalogo.json() : [];

    const resCursosUser = await fetch(`http://127.0.0.1:8000/cursos/usuarios/${sesion.id}`);
    const cursosUserBackend = resCursosUser.ok ? await resCursosUser.json() : [];
    
    const aprendizaje = {};
    cursosUserBackend.forEach(cu => {
      aprendizaje[String(cu.curso_id)] = cu.estado;
    });

    const resPost = await fetch(`http://127.0.0.1:8000/interacciones/postulaciones/${sesion.id}`);
    const postulacionesBackend = resPost.ok ? await resPost.json() : [];
    
    const resGuardadas = await fetch(`http://127.0.0.1:8000/interacciones/guardadas/${sesion.id}`);
    const guardadasBackend = resGuardadas.ok ? await resGuardadas.json() : [];

    const resNotif = await fetch(`http://127.0.0.1:8000/interacciones/notificaciones/${sesion.id}`);
    const notificacionesBackend = resNotif.ok ? await resNotif.json() : [];

    const perfilFrontend = {
      cargoActual: '',
      educacion: perfilBackend.formacion_academica || '',
      experienciaAnios: parseInt(perfilBackend.experiencia_laboral) || 0,
      ubicacion: perfilBackend.ubicacion || '',
      sobreMi: perfilBackend.resumen_profesional || '',
      habilidades: habilidadesBackend.map(h => {
        const habilidadReal = catalogoBackend.find(cat => cat.id === h.habilidad_id);
        const nombreReal = habilidadReal ? habilidadReal.nombre : "Habilidad Desconocida";

        return { nombre: nombreReal, categoria: 'domain', nivel: h.nivel || 5 };
      }),
      rutaMetaId: perfilBackend.ruta_meta_id || null,
      ofertaObjetivoId: perfilBackend.oferta_objetivo_id || null,
      
      guardadas: guardadasBackend.map(g => String(g.vacante_id)),
      postulaciones: postulacionesBackend.map(p => ({ 
        empleoId: String(p.vacante_id), 
        fecha: p.fecha, 
        estado: p.estado,
        mensaje: p.mensaje || null, 
        respuesta: p.respuesta || null
      })),
      
       notificaciones: notificacionesBackend.map(n => ({
        id: String(n.id),
        tipo: 'match',
        titulo: n.titulo,
        texto: n.texto,
        fecha: new Date(n.fecha).getTime(),
        leida: n.leida === 1,
        destino: { vista: 'empleos', empleoId: n.vacante_id ? String(n.vacante_id) : null }
      })),
      
      aprendizaje: aprendizaje
    };

    return perfilFrontend;
  }

  async function actualizarDatosBasicos(datos) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const respuesta = await fetch(`http://127.0.0.1:8000/perfiles/${sesion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formacion_academica: datos.educacion,
        ubicacion: datos.ubicacion,
        resumen_profesional: datos.sobreMi,
        experiencia_laboral: String(datos.experienciaAnios) + ' años'
      })
    });

      if (!respuesta.ok) {
      const err = await respuesta.json();
      if (err.detail && Array.isArray(err.detail)) {
         throw new Error(err.detail[0].msg || 'Datos inválidos.');
      }
      throw new Error('No se pudieron guardar los datos en el servidor.');
    }

    return await getPerfil();
  }

  async function agregarHabilidad(datos) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const nombreHabilidad = datos.nombre.trim();
    
    const resCatalogo = await fetch('http://127.0.0.1:8000/habilidades/');
    const catalogo = await resCatalogo.json();
    let habilidadExistente = catalogo.find(h => h.nombre.toLowerCase() === nombreHabilidad.toLowerCase());

    if (!habilidadExistente) {
      const resCrear = await fetch('http://127.0.0.1:8000/habilidades/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreHabilidad })
      });
      if (!resCrear.ok) throw new Error('No se pudo crear la nueva habilidad.');
      habilidadExistente = await resCrear.json();
    }

    const resAsociar = await fetch('http://127.0.0.1:8000/habilidades/usuarios/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(sesion.id),
        habilidad_id: habilidadExistente.id,
        nivel: datos.nivel // <--- Enviamos el número exacto
      })
    });

    if (!resAsociar.ok) {
      if (resAsociar.status !== 409) {
        throw new Error('No se pudo agregar la habilidad a tu perfil.');
      }
    }

    return await getPerfil();
  }

  async function actualizarHabilidad(nombre, nivel) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const resCat = await fetch('http://127.0.0.1:8000/habilidades/');
    const catalogo = await resCat.json();
    const habInfo = catalogo.find(h => h.nombre.toLowerCase() === nombre.toLowerCase());
    if (!habInfo) throw new Error('Esa habilidad no existe en el catálogo.');

    const resAsoc = await fetch(`http://127.0.0.1:8000/habilidades/usuarios/${sesion.id}`);
    const asociaciones = await resAsoc.json();
    const asociacion = asociaciones.find(a => a.habilidad_id === habInfo.id);
    if (!asociacion) throw new Error('No tienes esa habilidad en tu perfil.');

    const resUpdate = await fetch(`http://127.0.0.1:8000/habilidades/usuarios/asociaciones/${asociacion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(sesion.id),
        habilidad_id: habInfo.id,
        nivel: nivel // <--- Enviamos el número exacto
      })
    });

    if (!resUpdate.ok) throw new Error('No se pudo actualizar el nivel de la habilidad.');

    return await getPerfil();
  }

  async function eliminarHabilidad(nombre) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const resCat = await fetch('http://127.0.0.1:8000/habilidades/');
    const catalogo = await resCat.json();
    const habInfo = catalogo.find(h => h.nombre.toLowerCase() === nombre.toLowerCase());
    
    if (!habInfo) throw new Error('Esa habilidad no existe en el catálogo.');

    const resAsoc = await fetch(`http://127.0.0.1:8000/habilidades/usuarios/${sesion.id}`);
    const asociaciones = await resAsoc.json();
    const asociacion = asociaciones.find(a => a.habilidad_id === habInfo.id);

    if (!asociacion) throw new Error('No tienes esa habilidad en tu perfil.');

    const resBorrar = await fetch(`http://127.0.0.1:8000/habilidades/usuarios/asociaciones/${asociacion.id}`, {
      method: 'DELETE'
    });

    if (!resBorrar.ok) throw new Error('No se pudo eliminar la habilidad.');

    return await getPerfil();
  }

  async function getEmpresa() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('No hay sesión.');
    
    const res = await fetch(`http://127.0.0.1:8000/usuarios/${sesion.id}/empresa`);
    const empresa = res.ok ? await res.json() : { nombre: "Sin empresa" };

    const resNotif = await fetch(`http://127.0.0.1:8000/interacciones/notificaciones/${sesion.id}`);
    const notificaciones = resNotif.ok ? await resNotif.json() : [];

    return {
      ...empresa,
      notificaciones: notificaciones.map(n => ({
        id: String(n.id),
        titulo: n.titulo,
        texto: n.texto,
        fecha: new Date(n.fecha).getTime(),
        leida: n.leida === 1,
        destino: { vista: 'candidatos', empleoId: String(n.vacante_id) }
      }))
    };
  }

  async function establecerRutaMeta(rutaId) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    await fetch(`http://127.0.0.1:8000/perfiles/${sesion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruta_meta_id: rutaId })
    });

    return await getPerfil();
  }

  async function establecerOfertaObjetivo(empleoId) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const res = await fetch(`http://127.0.0.1:8000/perfiles/${sesion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oferta_objetivo_id: String(empleoId) })
    });

    if (!res.ok) throw new Error('No se pudo guardar la meta.'); // <--- Agregado para detectar errores

    return await getPerfil();
  }

  async function alternarGuardada(empleoId) {
    const sesion = sesionActual();
    const res = await fetch('http://127.0.0.1:8000/interacciones/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: parseInt(sesion.id), vacante_id: parseInt(empleoId) })
    });
    if (!res.ok) throw new Error('No se pudo guardar la oferta');
    return await getPerfil();
  }

  async function postular(empleoId) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const res = await fetch('http://127.0.0.1:8000/interacciones/postular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        usuario_id: parseInt(sesion.id), 
        vacante_id: parseInt(empleoId) 
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo postular');
    }
    
    return await getPerfil();
  }

  async function cambiarEstadoCurso(cursoId, estado) {
    const sesion = sesionActual();
    
    await fetch('http://127.0.0.1:8000/cursos/usuarios/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        usuario_id: parseInt(sesion.id), 
        curso_id: parseInt(cursoId), 
        estado: estado 
      })
    });

    const cambios = [];
    if (estado === 'completado') {
      const cursos = await getCursos();
      const curso = cursos.find(c => c.id === cursoId);
      
      if (curso) {
        const perfil = await getPerfil();
        for (let h of curso.habilidades) {
          const habActual = perfil.habilidades.find(x => x.nombre === h.nombre);
          if (habActual) {
            const nuevoNivel = Math.min(10, habActual.nivel + h.boost);
            await actualizarHabilidad(habActual.nombre, nuevoNivel);
            cambios.push({ nombre: habActual.nombre, antes: habActual.nivel, despues: nuevoNivel });
          } else {
             await agregarHabilidad({ nombre: h.nombre, nivel: h.boost }); // <--- Enviamos el boost directo
             cambios.push({ nombre: h.nombre, antes: 0, despues: h.boost });
          }
        }
      }
    }

    return { perfil: await getPerfil(), cambios: cambios };
  }

  function duenoDeNotificaciones() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    const db = leerDB();
    const dueno = sesion.rol === 'reclutador' ? db.empresas[sesion.id] : db.perfiles[sesion.id];
    if (!dueno) throw new Error('No encontramos tus datos.');
    dueno.notificaciones = dueno.notificaciones || [];
    return { db: db, dueno: dueno };
  }

  async function marcarNotificacionLeida(id) {
    const res = await fetch(`http://127.0.0.1:8000/interacciones/notificaciones/${id}/leer`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('No se pudo marcar la notificación como leída');
    return await res.json();
  }

  async function marcarTodasLeidas() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');
    
    const res = await fetch(`http://127.0.0.1:8000/interacciones/notificaciones/leer-todas/${sesion.id}`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('No se pudieron marcar las notificaciones');
    return await res.json();
  }

  async function responderContacto(empleoId, mensaje) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const res = await fetch('http://127.0.0.1:8000/interacciones/responder-contacto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(sesion.id),
        vacante_id: parseInt(empleoId),
        respuesta: mensaje
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo enviar la respuesta.');
    }
    
    return await getPerfil();
  }

  const LATENCIA_IA_MS = 700;

  function esperarIA() {
    return new Promise(function (resolver) { setTimeout(resolver, LATENCIA_IA_MS); });
  }

  async function analizarVacante(texto) {
    const t = String(texto || '').trim();
    if (t === '') throw new Error('Escribe la descripción de la vacante para analizarla.');
    if (t.length > 5000) throw new Error('El texto es muy largo (máximo 5000 caracteres).');

    const res = await fetch('http://127.0.0.1:8000/vacantes/analizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: t })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo analizar la vacante con la IA.');
    }

    return await res.json();
  }

  async function analizarPerfil(texto) {
    await esperarIA();
    const t = String(texto || '').trim();
    if (t === '') throw new Error('Cuéntanos qué sabes hacer para poder analizarlo.');
    if (t.length > 5000) throw new Error('El texto es muy largo (máximo 5000 caracteres).');
    return clonar(global.Analisis.analizarPerfil(t));
  }

  function contextoReclutador() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    if (sesion.rol !== 'reclutador') throw new Error('Esta acción es solo para reclutadores.');
    const db = leerDB();
    const empresa = db.empresas[sesion.id];
    if (!empresa) throw new Error('No encontramos los datos de tu empresa.');
    return { sesion: sesion, db: db, empresa: empresa };
  }

  function contarPostulantes(db, empleoId, estado) {
    return Object.keys(db.perfiles).filter(function (id) {
      return db.perfiles[id].postulaciones.some(function (p) { return p.empleoId === empleoId && (!estado || p.estado === estado); });
    }).length;
  }

  function limpiarRequisitos(lista, estricto) {
    const vistas = {};
    const limpias = [];
    (Array.isArray(lista) ? lista : []).forEach(function (h) {
      const escrito = String((h && h.nombre) || '').trim();
      const nivel = Number(h && h.nivel);

      if (escrito.length < 2 || escrito.length > 40) {
        if (estricto) throw new Error('Cada habilidad debe tener entre 2 y 40 caracteres.');
        return;
      }
      if (!Number.isInteger(nivel) || nivel < 1 || nivel > 10) {
        if (estricto) throw new Error('El nivel de «' + escrito + '» debe ser un número entero entre 1 y 10.');
        return;
      }
      const nombre = global.Diccionario ? global.Diccionario.canonico(escrito) : escrito;
      const clave = norm(nombre);
      if (vistas[clave]) return;
      vistas[clave] = true;
      limpias.push({ nombre: nombre, nivel: nivel, obligatoria: !h || h.obligatoria !== false, categoria: h && h.categoria });
    });
    return limpias;
  }

  async function getMisVacantes() {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const resEmp = await fetch(`http://127.0.0.1:8000/usuarios/${sesion.id}/empresa`);
    const empresaData = resEmp.ok ? await resEmp.json() : { nombre: "Mi Empresa" };

    const res = await fetch('http://127.0.0.1:8000/vacantes/');
    const vacantes = res.ok ? await res.json() : [];

    const resCat = await fetch('http://127.0.0.1:8000/habilidades/');
    const catalogo = resCat.ok ? await resCat.json() : [];

    const misVacantes = await Promise.all(vacantes.filter(v => v.empleador_id === parseInt(sesion.id)).map(async v => {
      
      const resHab = await fetch(`http://127.0.0.1:8000/vacantes/${v.id}/habilidades`);
      const habs = resHab.ok ? await resHab.json() : [];

      const resCount = await fetch(`http://127.0.0.1:8000/interacciones/postulantes/vacante/${v.id}`);
      const conteo = resCount.ok ? await resCount.json() : { total: 0, nuevos: 0 };

      return {
        id: String(v.id),
        titulo: v.titulo,
        empresa: empresaData.nombre, 
        ciudad: v.ubicacion || 'No especificada',
        modalidad: v.modalidad || 'Presencial',
        nivel: 'Junior',
        sector: 'General',
        experienciaMin: 0,
        publicado: new Date(v.fecha_publicacion).getTime(),
        descripcion: v.descripcion,
        estado: v.estado ? v.estado.toLowerCase() : 'activa',
        habilidades: habs.map(h => {
          const info = catalogo.find(cat => cat.id === h.habilidad_id);
          return { nombre: info ? info.nombre : "Habilidad", nivel: h.nivel_requerido || 5, obligatoria: true };
        }),
        postulantes: conteo.total,
        nuevos: conteo.nuevos
      };
    }));

    return misVacantes;
  }

  async function publicarVacante(datos) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const habilidadesMapeadas = datos.habilidades.map(h => {
      return { nombre: h.nombre, nivel: h.nivel };
    });

    const res = await fetch(`http://127.0.0.1:8000/vacantes/con-habilidades?empleador_id=${sesion.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        requisitos: datos.descripcion,
        ubicacion: datos.ciudad,
        modalidad: datos.modalidad,
        salario_min: datos.salarioMin ? parseFloat(datos.salarioMin) : null,
        salario_max: datos.salarioMax ? parseFloat(datos.salarioMax) : null,
        habilidades: habilidadesMapeadas
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo publicar la vacante.');
    }

    const vacanteCreada = await res.json();
    
    return {
      id: String(vacanteCreada.id),
      titulo: vacanteCreada.titulo,
      empresa: "Mi Empresa",
      ciudad: vacanteCreada.ubicacion,
      modalidad: vacanteCreada.modalidad,
      nivel: datos.nivel,
      sector: datos.sector,
      experienciaMin: datos.experienciaMin,
      publicado: new Date(vacanteCreada.fecha_publicacion).getTime(),
      descripcion: vacanteCreada.descripcion,
      estado: 'activa',
      habilidades: datos.habilidades
    };
  }

  function vacanteDelReclutador(ctx, vacanteId) {
    const v = ctx.db.empleos.find(function (e) { return e.id === vacanteId && e.reclutadorId === ctx.sesion.id; });
    if (!v) throw new Error('No encontramos esa vacante.');
    return v;
  }

  async function getCandidatos(vacanteId) {
    const res = await fetch(`http://127.0.0.1:8000/interacciones/candidatos/vacante/${vacanteId}`);
    
    if (!res.ok) throw new Error('No se pudieron cargar los candidatos');
    
    const candidatosBackend = await res.json();
    
    return candidatosBackend.map(c => {
      return {
        id: String(c.id),
        nombre: c.nombre,
        cargoActual: c.cargoActual,
        ubicacion: c.ubicacion,
        educacion: c.educacion,
        experienciaAnios: c.experienciaAnios,
        sobreMi: c.sobreMi,
        habilidades: c.habilidades.map(h => {
          return { nombre: h.nombre, categoria: 'domain', nivel: h.nivel || 5 };
        }),
        postulacion: c.postulacion
      };
    });
  }

  const ESTADOS_POSTULACION = ['Enviada', 'Preseleccionado', 'Contactado', 'Descartado'];

  async function cambiarEstadoPostulacion(datos) {
    const res = await fetch(`http://127.0.0.1:8000/interacciones/cambiar-estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(datos.aspiranteId),
        vacante_id: parseInt(datos.vacanteId),
        estado: datos.estado,
        mensaje: datos.mensaje
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo actualizar el estado');
    }
    return await res.json();
  }

  async function cambiarEstadoVacante(vacanteId, estado) {
    await esperar();
    const ctx = contextoReclutador();
    const v = vacanteDelReclutador(ctx, vacanteId);
    if (estado !== 'activa' && estado !== 'cerrada') throw new Error('Estado de vacante no válido.');
    v.estado = estado;
    guardarDB(ctx.db);
    return clonar(v);
  }

  async function estimarAlcance(datos) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const habilidadesMapeadas = datos.habilidades.map(h => {
      return { nombre: h.nombre, nivel: h.nivel }; // <--- Enviamos el número directo
    });

    const res = await fetch('http://127.0.0.1:8000/vacantes/alcance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habilidades: habilidadesMapeadas,
        experienciaMin: parseInt(datos.experienciaMin) || 0
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo calcular el alcance');
    }
    
    return await res.json();
  }

  async function reiniciarDatos() {
    await esperar();
    guardarDB(global.crearDatosDemo());
  }


    // --- CHAT ---
  async function enviarMensajeChat(destinatarioId, vacanteId, texto) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const res = await fetch('http://127.0.0.1:8000/chat/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remitente_id: parseInt(sesion.id),
        destinatario_id: parseInt(destinatarioId),
        vacante_id: parseInt(vacanteId),
        texto: texto
      })
    });

    if (!res.ok) throw new Error('No se pudo enviar el mensaje.');
    return await res.json();
  }

  async function obtenerHistorialChat(otroId, vacanteId) {
    const sesion = sesionActual();
    if (!sesion) throw new Error('Tu sesión expiró.');

    const res = await fetch(`http://127.0.0.1:8000/chat/historial/${sesion.id}/${otroId}/${vacanteId}`);
    if (!res.ok) throw new Error('No se pudo cargar el historial del chat.');
    return await res.json();
  }


  global.Api = {
    paginaPorRol: paginaPorRol,
    sesionActual: sesionActual,
    exigirRol: exigirRol,
    login: login,
    logout: logout,
    emailDisponible: emailDisponible,
    registrar: registrar,
    getCatalogos: getCatalogos,
    getEmpresa: getEmpresa,
    getCatalogoHabilidades: getCatalogoHabilidades,
    getTransferencias: getTransferencias,
    getEmpleos: getEmpleos,
    getCursos: getCursos,
    getRutas: getRutas,
    getPerfil: getPerfil,
    actualizarDatosBasicos: actualizarDatosBasicos,
    agregarHabilidad: agregarHabilidad,
    actualizarHabilidad: actualizarHabilidad,
    eliminarHabilidad: eliminarHabilidad,
    establecerRutaMeta: establecerRutaMeta,
    establecerOfertaObjetivo: establecerOfertaObjetivo,
    alternarGuardada: alternarGuardada,
    postular: postular,
    cambiarEstadoCurso: cambiarEstadoCurso,
    marcarNotificacionLeida: marcarNotificacionLeida,
    marcarTodasLeidas: marcarTodasLeidas,
    getMisVacantes: getMisVacantes,
    getCandidatos: getCandidatos,
    responderContacto: responderContacto,
    CLAVE_DB: CLAVE_DB,
    cambiarEstadoPostulacion: cambiarEstadoPostulacion,
    cambiarEstadoVacante: cambiarEstadoVacante,
    publicarVacante: publicarVacante,
    estimarAlcance: estimarAlcance,
    analizarVacante: analizarVacante,
    analizarPerfil: analizarPerfil,
    enviarMensajeChat: enviarMensajeChat,
    obtenerHistorialChat: obtenerHistorialChat,
    reiniciarDatos: reiniciarDatos
  };

})(window);