
from decimal import Decimal

from app.database.connection import SessionLocal
from app.core.security import hashear_password

from app.modules.usuarios.models import Usuario
from app.modules.usuarios.empresa import Empresa
from app.modules.perfiles.models import Perfil
from app.modules.habilidades.models import Habilidad, UsuarioHabilidad
from app.modules.vacantes.models import Vacante, VacanteHabilidad


db = SessionLocal()

PASSWORD = "SkillMatch2026"


# ============================================================
# 1. ASPIRANTES
# ============================================================

aspirantes = [
    {
        "nombre": "Laura",
        "apellido": "Martínez",
        "email": "laura.martinez@gmail.com",
        "ubicacion": "Bogotá",
        "experiencia": 2,
        "resumen": "Desarrolladora de software interesada en aplicaciones web.",
        "formacion": "Tecnóloga en Análisis y Desarrollo de Software",
        "habilidades": {
            "Python": 7,
            "JavaScript": 6,
            "React": 6,
            "SQL": 5,
            "Modelado de datos": 4,
            "Comunicación": 7,
            "Trabajo en equipo": 8,
            "Resolución de problemas": 7
        }
    },
    {
        "nombre": "Andrés",
        "apellido": "Gómez",
        "email": "andres.gomez@gmail.com",
        "ubicacion": "Medellín",
        "experiencia": 3,
        "resumen": "Analista de datos con conocimientos en herramientas de visualización.",
        "formacion": "Ingeniería Industrial",
        "habilidades": {
            "Análisis de datos": 8,
            "SQL": 7,
            "Power BI": 8,
            "Excel": 9,
            "Modelado de datos": 6,
            "Python": 6,
            "Comunicación": 7,
            "Responsabilidad": 8
        }
    },
    {
        "nombre": "Camila",
        "apellido": "Rodríguez",
        "email": "camila.rodriguez@gmail.com",
        "ubicacion": "Cali",
        "experiencia": 1,
        "resumen": "Asistente administrativa con experiencia en organización documental.",
        "formacion": "Técnica en Asistencia Administrativa",
        "habilidades": {
            "Procesos administrativos": 8,
            "Excel": 7,
            "Finanzas": 5,
            "Atención al cliente": 8,
            "Comunicación": 8,
            "Responsabilidad": 9,
            "Puntualidad": 9,
            "Trabajo en equipo": 8
        }
    },
    {
        "nombre": "Julián",
        "apellido": "Pérez",
        "email": "julian.perez@gmail.com",
        "ubicacion": "Barranquilla",
        "experiencia": 4,
        "resumen": "Auxiliar logístico con conocimientos en almacenamiento e inventarios.",
        "formacion": "Técnico en Logística",
        "habilidades": {
            "Manejo de inventarios": 8,
            "Almacenamiento y despacho": 9,
            "Manejo de montacargas": 7,
            "Seguridad y salud en el trabajo": 7,
            "Excel": 5,
            "Trabajo en equipo": 8,
            "Responsabilidad": 9,
            "Resistencia física": 8
        }
    },
    {
        "nombre": "Valentina",
        "apellido": "López",
        "email": "valentina.lopez@gmail.com",
        "ubicacion": "Cartagena",
        "experiencia": 2,
        "resumen": "Asesora comercial orientada a la atención y fidelización de clientes.",
        "formacion": "Tecnóloga en Gestión Comercial",
        "habilidades": {
            "Ventas": 8,
            "Atención al cliente": 9,
            "Comunicación": 8,
            "Caja y manejo de dinero": 7,
            "Marketing digital": 5,
            "Resolución de problemas": 7,
            "Trabajo en equipo": 8,
            "Responsabilidad": 8
        }
    },
    {
        "nombre": "Mateo",
        "apellido": "Ramírez",
        "email": "mateo.ramirez@gmail.com",
        "ubicacion": "Valledupar",
        "experiencia": 3,
        "resumen": "Cocinero con conocimientos en preparación y manipulación de alimentos.",
        "formacion": "Técnico en Cocina",
        "habilidades": {
            "Cocina": 8,
            "Manipulación de alimentos": 9,
            "Seguridad y salud en el trabajo": 6,
            "Trabajo bajo presión": 8,
            "Trabajo en equipo": 8,
            "Responsabilidad": 9,
            "Puntualidad": 9,
            "Resistencia física": 7
        }
    },
    {
        "nombre": "Sofía",
        "apellido": "Hernández",
        "email": "sofia.hernandez@gmail.com",
        "ubicacion": "Bucaramanga",
        "experiencia": 5,
        "resumen": "Auxiliar de servicios generales con conocimientos en limpieza y mantenimiento.",
        "formacion": "Bachiller Académico",
        "habilidades": {
            "Limpieza y aseo": 9,
            "Manejo de residuos": 7,
            "Manejo de productos químicos": 7,
            "Mantenimiento básico": 5,
            "Seguridad y salud en el trabajo": 8,
            "Trabajo en equipo": 8,
            "Puntualidad": 9,
            "Responsabilidad": 9
        }
    },
    {
        "nombre": "Daniel",
        "apellido": "Rojas",
        "email": "daniel.rojas@gmail.com",
        "ubicacion": "Bogotá",
        "experiencia": 1,
        "resumen": "Desarrollador junior interesado en programación y bases de datos.",
        "formacion": "Tecnólogo en Desarrollo de Software",
        "habilidades": {
            "Python": 6,
            "JavaScript": 7,
            "React": 5,
            "SQL": 6,
            "Docker": 4,
            "Resolución de problemas": 7,
            "Comunicación": 6,
            "Trabajo en equipo": 8
        }
    },
    {
        "nombre": "Mariana",
        "apellido": "Torres",
        "email": "mariana.torres@gmail.com",
        "ubicacion": "Santa Marta",
        "experiencia": 2,
        "resumen": "Profesional con experiencia en gestión comercial y servicio al cliente.",
        "formacion": "Tecnóloga en Gestión Empresarial",
        "habilidades": {
            "Ventas": 9,
            "Atención al cliente": 8,
            "Marketing digital": 7,
            "Excel": 7,
            "Comunicación": 9,
            "Liderazgo": 7,
            "Responsabilidad": 8,
            "Trabajo en equipo": 8
        }
    },
    {
        "nombre": "Felipe",
        "apellido": "Moreno",
        "email": "felipe.moreno@gmail.com",
        "ubicacion": "Pereira",
        "experiencia": 0,
        "resumen": "Aspirante con formación técnica e interés en logística y operaciones.",
        "formacion": "Técnico en Operaciones Logísticas",
        "habilidades": {
            "Manejo de inventarios": 6,
            "Almacenamiento y despacho": 5,
            "Excel": 6,
            "Responsabilidad": 8,
            "Puntualidad": 9,
            "Trabajo en equipo": 7,
            "Comunicación": 7,
            "Resolución de problemas": 6
        }
    }
]


# ============================================================
# 2. EMPLEADORES Y SUS EMPRESAS
# ============================================================

empleadores = [
    {
        "nombre": "Carlos",
        "apellido": "Ramírez",
        "email": "carlos.ramirez.empresa@gmail.com",
        "empresa": "InnovaTech Solutions",
        "sector": "Tecnología",
        "ciudad": "Bogotá",
        "vacante": {
            "titulo": "Desarrollador Python Junior",
            "descripcion": "Buscamos desarrollador para apoyar el desarrollo y mantenimiento de aplicaciones web.",
            "requisitos": "Conocimientos de Python, SQL y trabajo en equipo.",
            "ubicacion": "Bogotá",
            "modalidad": "Híbrido",
            "salario_min": 2500000,
            "salario_max": 3500000,
            "habilidades": {"Python": 6, "SQL": 5, "Resolución de problemas": 6}
        }
    },
    {
        "nombre": "Mariana",
        "apellido": "Castro",
        "email": "mariana.castro.empresa@gmail.com",
        "empresa": "Logística del Caribe",
        "sector": "Logística",
        "ciudad": "Barranquilla",
        "vacante": {
            "titulo": "Auxiliar de Inventarios",
            "descripcion": "Se requiere auxiliar para controlar entradas, salidas y almacenamiento de mercancía.",
            "requisitos": "Experiencia en inventarios y almacenamiento.",
            "ubicacion": "Barranquilla",
            "modalidad": "Presencial",
            "salario_min": 1600000,
            "salario_max": 2000000,
            "habilidades": {"Manejo de inventarios": 6, "Almacenamiento y despacho": 6, "Excel": 4}
        }
    },
    {
        "nombre": "Felipe",
        "apellido": "Moreno",
        "email": "felipe.moreno.empresa@gmail.com",
        "empresa": "Comercializadora Punto Clave",
        "sector": "Comercio",
        "ciudad": "Medellín",
        "vacante": {
            "titulo": "Asesor Comercial",
            "descripcion": "Buscamos asesor comercial para atención de clientes y cumplimiento de metas de ventas.",
            "requisitos": "Habilidades comerciales y buena comunicación.",
            "ubicacion": "Medellín",
            "modalidad": "Presencial",
            "salario_min": 1700000,
            "salario_max": 2500000,
            "habilidades": {"Ventas": 7, "Atención al cliente": 7, "Comunicación": 7}
        }
    },
    {
        "nombre": "Paola",
        "apellido": "Díaz",
        "email": "paola.diaz.empresa@gmail.com",
        "empresa": "Servicios Integrales del Norte",
        "sector": "Servicios",
        "ciudad": "Valledupar",
        "vacante": {
            "titulo": "Auxiliar de Servicios Generales",
            "descripcion": "Se requiere personal para actividades de limpieza, aseo y mantenimiento.",
            "requisitos": "Responsabilidad y conocimientos de limpieza.",
            "ubicacion": "Valledupar",
            "modalidad": "Presencial",
            "salario_min": 1500000,
            "salario_max": 1800000,
            "habilidades": {"Limpieza y aseo": 7, "Responsabilidad": 7, "Seguridad y salud en el trabajo": 5}
        }
    },
    {
        "nombre": "Andrés",
        "apellido": "Vargas",
        "email": "andres.vargas.empresa@gmail.com",
        "empresa": "Data Analytics Colombia",
        "sector": "Tecnología",
        "ciudad": "Cali",
        "vacante": {
            "titulo": "Analista de Datos",
            "descripcion": "Buscamos analista para procesar información y generar reportes para la toma de decisiones.",
            "requisitos": "Manejo de Excel, SQL y Power BI.",
            "ubicacion": "Cali",
            "modalidad": "Híbrido",
            "salario_min": 2800000,
            "salario_max": 4000000,
            "habilidades": {"Análisis de datos": 7, "Power BI": 6, "SQL": 6}
        }
    },
    {
        "nombre": "Laura",
        "apellido": "Gutiérrez",
        "email": "laura.gutierrez.empresa@gmail.com",
        "empresa": "Restaurantes Sabor Caribe",
        "sector": "Alimentos",
        "ciudad": "Cartagena",
        "vacante": {
            "titulo": "Auxiliar de Cocina",
            "descripcion": "Se requiere auxiliar para preparación de alimentos y apoyo en cocina.",
            "requisitos": "Conocimientos de cocina y manipulación de alimentos.",
            "ubicacion": "Cartagena",
            "modalidad": "Presencial",
            "salario_min": 1500000,
            "salario_max": 1900000,
            "habilidades": {"Cocina": 6, "Manipulación de alimentos": 7, "Trabajo en equipo": 5}
        }
    },
    {
        "nombre": "Jorge",
        "apellido": "Mendoza",
        "email": "jorge.mendoza.empresa@gmail.com",
        "empresa": "Soluciones Administrativas",
        "sector": "Administración",
        "ciudad": "Bucaramanga",
        "vacante": {
            "titulo": "Asistente Administrativo",
            "descripcion": "Se requiere personal para apoyar procesos administrativos y gestión documental.",
            "requisitos": "Manejo de Excel y organización administrativa.",
            "ubicacion": "Bucaramanga",
            "modalidad": "Presencial",
            "salario_min": 1700000,
            "salario_max": 2200000,
            "habilidades": {"Procesos administrativos": 6, "Excel": 6, "Comunicación": 6}
        }
    },
    {
        "nombre": "Diana",
        "apellido": "Suárez",
        "email": "diana.suarez.empresa@gmail.com",
        "empresa": "Marketing Digital Creativo",
        "sector": "Marketing",
        "ciudad": "Santa Marta",
        "vacante": {
            "titulo": "Auxiliar de Marketing Digital",
            "descripcion": "Buscamos apoyo para gestionar contenidos y actividades de marketing digital.",
            "requisitos": "Conocimientos de marketing digital y comunicación.",
            "ubicacion": "Santa Marta",
            "modalidad": "Remoto",
            "salario_min": 1800000,
            "salario_max": 2500000,
            "habilidades": {"Marketing digital": 6, "Comunicación": 7, "Excel": 4}
        }
    },
    {
        "nombre": "Santiago",
        "apellido": "Herrera",
        "email": "santiago.herrera.empresa@gmail.com",
        "empresa": "Mantenimiento Industrial del Café",
        "sector": "Mantenimiento",
        "ciudad": "Pereira",
        "vacante": {
            "titulo": "Auxiliar de Mantenimiento",
            "descripcion": "Se requiere personal para apoyar labores de mantenimiento básico de instalaciones.",
            "requisitos": "Conocimientos de mantenimiento y seguridad laboral.",
            "ubicacion": "Pereira",
            "modalidad": "Presencial",
            "salario_min": 1600000,
            "salario_max": 2100000,
            "habilidades": {"Mantenimiento básico": 6, "Seguridad y salud en el trabajo": 6, "Responsabilidad": 6}
        }
    },
    {
        "nombre": "Natalia",
        "apellido": "Pineda",
        "email": "natalia.pineda.empresa@gmail.com",
        "empresa": "Finanzas y Gestión Empresarial",
        "sector": "Finanzas",
        "ciudad": "Bogotá",
        "vacante": {
            "titulo": "Auxiliar Financiero",
            "descripcion": "Se requiere auxiliar para apoyar registros, organización y control de información financiera.",
            "requisitos": "Conocimientos básicos de finanzas y Excel.",
            "ubicacion": "Bogotá",
            "modalidad": "Híbrido",
            "salario_min": 1900000,
            "salario_max": 2600000,
            "habilidades": {"Finanzas": 6, "Excel": 7, "Procesos administrativos": 5}
        }
    }
]


# ============================================================
# 3. CREACIÓN DE REGISTROS
# ============================================================

def obtener_o_crear_usuario(datos, tipo):
    usuario = db.query(Usuario).filter(
        Usuario.email == datos["email"]
    ).first()

    if usuario:
        if usuario.tipo_usuario != tipo:
            raise ValueError(
                f"El correo {datos['email']} ya existe con otro tipo de usuario."
            )
        return usuario

    usuario = Usuario(
        nombre=datos["nombre"],
        apellido=datos["apellido"],
        email=datos["email"],
        password=hashear_password(PASSWORD),
        tipo_usuario=tipo
    )

    db.add(usuario)
    db.flush()

    return usuario


def obtener_habilidad(nombre, catalogo):
    habilidad = catalogo.get(nombre)

    if not habilidad:
        raise ValueError(
            f"La habilidad '{nombre}' no existe en el catálogo."
        )

    return habilidad


def crear_aspirantes(catalogo):
    for datos in aspirantes:
        usuario = obtener_o_crear_usuario(datos, "ASPIRANTE")

        perfil = db.query(Perfil).filter(
            Perfil.usuario_id == usuario.id
        ).first()

        if not perfil:
            perfil = Perfil(
                usuario_id=usuario.id,
                resumen_profesional=datos["resumen"],
                formacion_academica=datos["formacion"],
                # Solo dígitos. La columna actual es Text.
                experiencia_laboral=str(datos["experiencia"]),
                ubicacion=datos["ubicacion"]
            )
            db.add(perfil)

        for nombre_habilidad, nivel in datos["habilidades"].items():
            habilidad = obtener_habilidad(nombre_habilidad, catalogo)

            relacion = db.query(UsuarioHabilidad).filter(
                UsuarioHabilidad.usuario_id == usuario.id,
                UsuarioHabilidad.habilidad_id == habilidad.id
            ).first()

            if not relacion:
                db.add(
                    UsuarioHabilidad(
                        usuario_id=usuario.id,
                        habilidad_id=habilidad.id,
                        nivel=nivel
                    )
                )

    print("Aspirantes procesados.")


def crear_empleadores(catalogo):
    for datos in empleadores:
        usuario = obtener_o_crear_usuario(datos, "EMPLEADOR")

        empresa = db.query(Empresa).filter(
            Empresa.usuario_id == usuario.id
        ).first()

        if not empresa:
            empresa = Empresa(
                usuario_id=usuario.id,
                nombre=datos["empresa"],
                sector=datos["sector"],
                ciudad=datos["ciudad"]
            )
            db.add(empresa)

        datos_vacante = datos["vacante"]

        vacante = db.query(Vacante).filter(
            Vacante.empleador_id == usuario.id,
            Vacante.titulo == datos_vacante["titulo"]
        ).first()

        if not vacante:
            vacante = Vacante(
                titulo=datos_vacante["titulo"],
                descripcion=datos_vacante["descripcion"],
                requisitos=datos_vacante["requisitos"],
                ubicacion=datos_vacante["ubicacion"],
                modalidad=datos_vacante["modalidad"],
                salario_min=Decimal(str(datos_vacante["salario_min"])),
                salario_max=Decimal(str(datos_vacante["salario_max"])),
                estado="ACTIVA",
                empleador_id=usuario.id
            )

            db.add(vacante)
            db.flush()

        for nombre_habilidad, nivel in datos_vacante["habilidades"].items():
            habilidad = obtener_habilidad(nombre_habilidad, catalogo)

            relacion = db.query(VacanteHabilidad).filter(
                VacanteHabilidad.vacante_id == vacante.id,
                VacanteHabilidad.habilidad_id == habilidad.id
            ).first()

            if not relacion:
                db.add(
                    VacanteHabilidad(
                        vacante_id=vacante.id,
                        habilidad_id=habilidad.id,
                        nivel_requerido=nivel
                    )
                )

    print("Empleadores, empresas y vacantes procesados.")


# ============================================================
# 4. EJECUCIÓN
# ============================================================

try:
    print("Iniciando creación de datos de prueba...")

    habilidades = db.query(Habilidad).all()
    catalogo = {h.nombre: h for h in habilidades}

    # Validar todas las habilidades antes de insertar.
    habilidades_necesarias = set()

    for aspirante in aspirantes:
        habilidades_necesarias.update(
            aspirante["habilidades"].keys()
        )

    for empleador in empleadores:
        habilidades_necesarias.update(
            empleador["vacante"]["habilidades"].keys()
        )

    faltantes = habilidades_necesarias - set(catalogo.keys())

    if faltantes:
        raise ValueError(
            "Faltan habilidades en el catálogo: "
            + ", ".join(sorted(faltantes))
        )

    crear_aspirantes(catalogo)
    crear_empleadores(catalogo)

    db.commit()


    print("\n" + "=" * 65)
    print("              USUARIOS DE PRUEBA - SKILLMATCH")
    print("=" * 65)

    print("\nCONTRASEÑA GENERAL:", PASSWORD)

    # --------------------------------------------------------
    # ASPIRANTES
    # --------------------------------------------------------

    print("\n" + "=" * 65)
    print("                    ASPIRANTES")
    print("=" * 65)

    for datos in aspirantes:
        usuario = db.query(Usuario).filter(
            Usuario.email == datos["email"]
        ).first()

        perfil = db.query(Perfil).filter(
            Perfil.usuario_id == usuario.id
        ).first()

        habilidades_usuario = (
            db.query(UsuarioHabilidad, Habilidad)
            .join(
                Habilidad,
                UsuarioHabilidad.habilidad_id == Habilidad.id
            )
            .filter(UsuarioHabilidad.usuario_id == usuario.id)
            .all()
        )

        print(f"\nID: {usuario.id}")
        print(f"Nombre: {usuario.nombre} {usuario.apellido}")
        print(f"Correo: {usuario.email}")
        print(f"Contraseña: {PASSWORD}")

        if perfil:
            print("\nPERFIL PROFESIONAL")
            print(f"Resumen: {perfil.resumen_profesional}")
            print(f"Formación: {perfil.formacion_academica}")
            print(f"Experiencia: {perfil.experiencia_laboral}")
            print(f"Ubicación: {perfil.ubicacion}")
        

        print("\nHABILIDADES")
        for relacion, habilidad in habilidades_usuario:
            print(f"- {habilidad.nombre}: nivel {relacion.nivel}")

        print("-" * 65)

    # --------------------------------------------------------
    # EMPLEADORES, EMPRESAS Y VACANTES
    # --------------------------------------------------------

    print("\n" + "=" * 65)
    print("                    EMPLEADORES")
    print("=" * 65)

    for datos in empleadores:
        usuario = db.query(Usuario).filter(
            Usuario.email == datos["email"]
        ).first()

        empresa = db.query(Empresa).filter(
            Empresa.usuario_id == usuario.id
        ).first()

        vacantes_usuario = db.query(Vacante).filter(
            Vacante.empleador_id == usuario.id
        ).all()

        print(f"\nID: {usuario.id}")
        print(f"Nombre: {usuario.nombre} {usuario.apellido}")
        print(f"Correo: {usuario.email}")
        print(f"Contraseña: {PASSWORD}")

        if empresa:
            print("\nEMPRESA")
            print(f"Nombre: {empresa.nombre}")
            print(f"Sector: {empresa.sector}")
            print(f"Ciudad: {empresa.ciudad}")

        print(f"\nVACANTES PUBLICADAS: {len(vacantes_usuario)}")

        for vacante in vacantes_usuario:
            print("\n" + "-" * 45)
            print(f"ID: {vacante.id}")
            print(f"Título: {vacante.titulo}")
            print(f"Descripción: {vacante.descripcion}")
            print(f"Requisitos: {vacante.requisitos}")
            print(f"Ubicación: {vacante.ubicacion}")
            print(f"Modalidad: {vacante.modalidad}")
            print(f"Salario mínimo: ${vacante.salario_min}")
            print(f"Salario máximo: ${vacante.salario_max}")
            print(f"Estado: {vacante.estado}")

            habilidades_vacante = (
                db.query(VacanteHabilidad, Habilidad)
                .join(
                    Habilidad,
                    VacanteHabilidad.habilidad_id == Habilidad.id
                )
                .filter(VacanteHabilidad.vacante_id == vacante.id)
                .all()
            )

            print("Habilidades requeridas:")
            for relacion, habilidad in habilidades_vacante:
                print(
                    f"- {habilidad.nombre}: "
                    f"nivel {relacion.nivel_requerido}"
                )

    print("\n" + "=" * 65)
    print("              RESUMEN FINAL")
    print("=" * 65)

    print(
        "Aspirantes:",
        db.query(Usuario).filter(
            Usuario.tipo_usuario == "ASPIRANTE"
        ).count()
    )

    print(
        "Empleadores:",
        db.query(Usuario).filter(
            Usuario.tipo_usuario == "EMPLEADOR"
        ).count()
    )

    print("Perfiles:", db.query(Perfil).count())
    print("Empresas:", db.query(Empresa).count())

    print(
        "Vacantes activas:",
        db.query(Vacante).filter(
            Vacante.estado == "ACTIVA"
        ).count()
    )

    print("=" * 65)


except Exception as e:
    db.rollback()
    print("\nError al crear los datos:")
    print(e)
    raise

finally:
    db.close()
