import type { BlogArticle } from "../types";

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "soberania-datos-ventaja-competitiva",
    title: "La soberanía de los datos como ventaja competitiva",
    excerpt:
      "En una era donde el modelo SaaS convierte tus proyectos en datos de entrenamiento, tener el control de tu información no es paranoia: es estrategia.",
    category: "pensamiento",
    categoryLabel: "Pensamiento",
    publishedAt: "2026-07-05",
    readingTime: "5 min",
    featured: true,
    seo: {
      title: "La soberanía de los datos como ventaja competitiva — Hito",
      description:
        "Por qué mantener el control de tus datos de proyecto es una decisión estratégica, no técnica. Reflexión sobre local-first y privacidad.",
      ogImageAlt: "Soberanía de datos y gestión de proyectos local-first.",
    },
    content: {
      eyebrow: "Pensamiento",
      intro: (
        <>
          Durante años aceptamos que gestionar proyectos significa subir todo a la
          nube de algún proveedor. Aceptamos los límites del plan gratuito, las
          exportaciones parciales y los términos de servicio que cambian cada
          semestre. Pero lo que menos hablamos es de lo que cedemos a cambio: el
          control de nuestros propios datos. La buena noticia es que hay otra
          forma.
        </>
      ),
      sections: [
        {
          heading: 'El costo oculto del "gratis"',
          body: (
            <>
              <p>
                Las herramientas de productividad no son caritativas. Cuando un
                servicio no te cobra directamente, tu atención, tus patrones de
                uso y, cada vez más, tus contenidos son el producto. No se trata
                de conspiraciones: se trata de modelos de negocio. Y cuando esos
                datos incluyen estrategias de producto, conversaciones con
                clientes o procesos internos, el costo real puede ser muy alto.
              </p>
              <p>
                La soberanía de los datos no significa rechazar toda la nube.
                Significa decidir conscientemente qué información vive dónde, bajo
                qué condiciones y quién puede acceder a ella.
              </p>
            </>
          ),
        },
        {
          heading: "Local-first como decisión de gobierno",
          body: (
            <>
              <p>
                Trabajar con datos locales no es un retroceso tecnológico. Es una
                decisión de arquitectura que devuelve el control al usuario. Tus
                proyectos viven en archivos que podés abrir, versionar, respaldar
                y migrar. No dependés del uptime de un tercero ni de una política
                de exportación que puede cambiar mañana.
              </p>
              <p>
                Para equipos pequeños y medianos, esto también es una ventaja
                práctica: la carpeta de trabajo puede compartirse por los medios
                que ya usan, desde Git hasta una red local, sin agregar nuevas
                cuentas ni permisos externos.
              </p>
            </>
          ),
        },
        {
          heading: "La confianza como diferenciador",
          body: (
            <>
              <p>
                En sectores como el legal, el contable, la consultoría o cualquier
                área que maneje información sensible, "usamos una herramienta en
                la nube" deja de ser una respuesta suficiente. Poder decir "nuestros
                datos nunca salen de nuestra infraestructura" se convierte en un
                diferenciador comercial real.
              </p>
              <p>
                Hito nace de esa premisa: una herramienta de gestión que funciona
                offline, guarda todo en archivos legibles y te permite trabajar
                sin renunciar al control.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "documentar-procesos-equipo",
    title: "Cómo documentar procesos que tu equipo realmente use",
    excerpt:
      "Los SOPs no fallan por falta de detalle: fallan porque nadie los encuentra, entiende o actualiza. Acá una forma más honesta de documentar.",
    category: "procesos",
    categoryLabel: "Procesos",
    publishedAt: "2026-07-05",
    readingTime: "6 min",
    featured: false,
    seo: {
      title: "Cómo documentar procesos que tu equipo realmente use — Hito",
      description:
        "Cómo escribir SOPs y checklists útiles, conectados al trabajo real y fáciles de mantener. Guía práctica para equipos.",
      ogImageAlt: "Documentación de procesos con SOPs y checklists.",
    },
    content: {
      eyebrow: "Procesos",
      intro: (
        <>
          Todos los equipos quieren "mejorar los procesos". Pocos logran que esos
          procesos se lean. La documentación muere en carpetas olvidadas, en
          wikis que nadie actualiza o en checklists que se completan por inercia.
          El problema no suele ser el formato: es la distancia entre el proceso
          documentado y el trabajo real.
        </>
      ),
      sections: [
        {
          heading: "Empezá por el dolor, no por el procedimiento",
          body: (
            <>
              <p>
                La mejor documentación responde a una pregunta concreta: "¿cómo
                hacemos X cuando pasa Y?". Si no hay una situación recurrente que
                cause fricción, cualquier SOP será teatro. Antes de escribir,
                identificá los tres errores que más se repiten o las tres tareas
                que más le cuestan a alguien nuevo.
              </p>
              <p>
                Un SOP no es un manual universitario: es una respuesta a un
                problema específico. Cuanto más cerca esté de ese problema, más
                probabilidades tiene de usarse.
              </p>
            </>
          ),
        },
        {
          heading: "Conectá el proceso al proyecto",
          body: (
            <>
              <p>
                La documentación vive mejor cuando está al lado del trabajo. En
                lugar de un wiki separado, los SOPs deberían estar en el contexto
                del proyecto, del área o de la tarea a la que aplican. Así, cuando
                alguien llega a una etapa, la guía está a un clic, no a tres
                búsquedas.
              </p>
              <p>
                En Hito, cada área de un proyecto puede tener sus propios
                procesos y checklists. No es documentación genérica: es la
                documentación de este proyecto, en este momento.
              </p>
            </>
          ),
        },
        {
          heading: "Hacelo revisable o no lo hagas",
          body: (
            <>
              <p>
                Un proceso que no se actualiza es peor que ningún proceso: da
                instrucciones incorrectas con autoridad. Por eso conviene usar
                formatos que el equipo pueda editar sin ceremonia. Markdown, JSON
                legible o checklists versionables hacen que actualizar sea tan
                fácil como consultar.
              </p>
              <p>
                La documentación no es un monumento: es un instrumento vivo. Si
                tu equipo no la puede mejorar en minutos, terminará siendo
                ignorada.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "asistente-ia-sin-entrenar-modelos",
    title: "¿Tu asistente de IA está entrenándose con tus proyectos?",
    excerpt:
      "La productividad con IA no debería costar la confidencialidad. Cómo usar inteligencia artificial sobre tus datos sin entregar tus datos.",
    category: "inteligencia-artificial",
    categoryLabel: "Inteligencia artificial",
    publishedAt: "2026-07-05",
    readingTime: "5 min",
    featured: true,
    seo: {
      title: "Asistente de IA sin entrenar modelos con tus datos — Hito",
      description:
        "Cómo usar inteligencia artificial en la gestión de proyectos manteniendo tus datos locales y bajo tu control.",
      ogImageAlt: "IA privada para gestión de proyectos.",
    },
    content: {
      eyebrow: "Inteligencia artificial",
      intro: (
        <>
          La promesa de los asistentes de IA es tentadora: preguntarle a una
          máquina el estado de tus proyectos, pedirle que resuma tareas
          bloqueadas o que sugiera el próximo paso. Pero detrás de esa comodidad
          hay una pregunta incómoda: ¿dónde quedan tus datos cuando se los
          contás?
        </>
      ),
      sections: [
        {
          heading: "No toda la nube es igual",
          body: (
            <>
              <p>
                Algunas plataformas usan tus conversaciones para mejorar sus
                modelos. Otras guardan tus prompts durante años. Y muchas veces
                las políticas de privacidad son lo suficientemente amplias como
                para que no sepas realmente qué pasa con la información de tus
                clientes, tu estrategia o tus procesos internos.
              </p>
              <p>
                No se trata de no usar IA. Se trata de usarla de forma que vos
                decidas qué compartís, cuándo y bajo qué términos.
              </p>
            </>
          ),
        },
        {
          heading: "La clave es tuya",
          body: (
            <>
              <p>
                Una forma de mantener el control es usar tu propia API key con un
                modelo que respete tus configuraciones. Así, la conversación va
                directamente entre tu navegador y el proveedor del modelo, sin
                pasar por servidores de la herramienta de gestión. La app no ve
                tus preguntas ni sus respuestas.
              </p>
              <p>
                Además, si la clave se guarda solo en tu navegador y nunca en la
                carpeta de trabajo, ni siquiera queda expuesta si alguien copia
                tus archivos.
              </p>
            </>
          ),
        },
        {
          heading: "IA con contexto, sin sacrificar privacidad",
          body: (
            <>
              <p>
                El verdadero valor de un asistente en una herramienta de gestión
                no está en responder preguntas genéricas, sino en entender el
                contexto de tus proyectos. Para eso, el asistente necesita leer
                tus datos. La pregunta es: ¿los lee en tu máquina y los envía
                selectivamente, o los sube todos a la nube para procesarlos?
              </p>
              <p>
                Hito elige el primer camino. El asistente tiene acceso a tu
                espacio de trabajo local y usa herramientas específicas para
                responder, sin mover tu base de datos completa a ningún servidor.
                Vos decidís si activarlo, con qué modelo y cuándo desactivarlo.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "menos-herramientas-mas-claridad",
    title: "Menos herramientas, más claridad: una jerarquía para organizar el trabajo",
    excerpt:
      "No necesitás más apps: necesitás una estructura que responda qué estás haciendo, por qué y quién lo hace.",
    category: "productividad",
    categoryLabel: "Productividad",
    publishedAt: "2026-07-05",
    readingTime: "5 min",
    featured: false,
    seo: {
      title: "Jerarquía para organizar productos, proyectos y tareas — Hito",
      description:
        "Cómo estructurar tu trabajo con una jerarquía clara: producto, proyecto, área, proceso y tarea. Menos herramientas, más claridad.",
      ogImageAlt: "Jerarquía clara para organizar proyectos.",
    },
    content: {
      eyebrow: "Productividad",
      intro: (
        <>
          La mayoría de los equipos no tienen un problema de falta de
          herramientas: tienen un problema de falta de estructura. Tienen
          tareas en una app, documentos en otra, objetivos en una tercera y
          conversaciones en una cuarta. El resultado es fragmentación, no
          productividad. La solución no siempre es agregar más software: a
          veces es definir mejor cómo se relacionan las piezas.
        </>
      ),
      sections: [
        {
          heading: "Una jerarquía que piensa en capas",
          body: (
            <>
              <p>
                Pensá tu trabajo en cinco niveles: <strong>Producto</strong>{" "}
                (el paraguas estratégico), <strong>Proyecto</strong> (un esfuerzo
                concreto con inicio y fin), <strong>Área</strong> (una dimensión
                del proyecto, como diseño o legal), <strong>Proceso</strong> (cómo
                se hace algo en esa área) e <strong>Ítem de trabajo</strong> (la
                tarea ejecutable).
              </p>
              <p>
                Esta jerarquía no es burocracia: es una forma de saber siempre
                dónde va cada cosa. Cuando aparece una tarea, su lugar indica su
                contexto, su prioridad y su responsable.
              </p>
            </>
          ),
        },
        {
          heading: "Cada nivel tiene su propia pregunta",
          body: (
            <>
              <p>
                El producto responde "¿hacia dónde vamos?". El proyecto
                responde "¿qué entregamos ahora?". El área responde "¿quién y
                cómo lo hace?". El proceso responde "¿cómo se hace bien?". Y la
                tarea responde "¿qué hago hoy?".
              </p>
              <p>
                Si mezclás esos niveles, terminás con reuniones de producto que
                discuten tareas, o con tareas sueltas que no se sabe a qué
                proyecto pertenecen. La claridad empieza por separar bien esas
                conversaciones.
              </p>
            </>
          ),
        },
        {
          heading: "De la estructura a la acción",
          body: (
            <>
              <p>
                Una buena jerarquía no solo organiza: acelera. Cuando sabés dónde
                vive cada decisión, no perdés tiempo buscando. Cuando un proyecto
                está enfermo, podés ver en qué nivel falla: ¿falta estrategia,
                recursos, documentación o ejecución?
              </p>
              <p>
                Hito está construido sobre esa jerarquía: Producto → Proyecto →
                Área → Proceso / Checklist → Tarea. No es un accidente del
                diseño: es la convicción de que organizar bien es trabajar menos.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "automatizaciones-sin-nube",
    title: "Automatizaciones que no dependen de la nube",
    excerpt:
      "Las reglas de trabajo pueden ejecutarse sobre tus datos locales. Sin suscripciones, sin integraciones de terceros, sin sorpresas.",
    category: "automatizacion",
    categoryLabel: "Automatización",
    publishedAt: "2026-07-05",
    readingTime: "5 min",
    featured: false,
    seo: {
      title: "Automatizaciones locales para gestión de proyectos — Hito",
      description:
        "Cómo crear reglas trigger-condición-acción que funcionen offline y sobre tus propios datos, sin depender de la nube.",
      ogImageAlt: "Automatizaciones locales para proyectos.",
    },
    content: {
      eyebrow: "Automatización",
      intro: (
        <>
          Las automatizaciones más populares funcionan en la nube: cuando pasa
          algo en una app, se dispara una acción en otra. Son poderosas, pero
          también frágiles. Dependen de que ambas apps estén online, de que la
          integración siga soportada y de que tus datos viajen por servidores que
          no controlás. Para muchos equipos, eso es más riesgo del que parece.
        </>
      ),
      sections: [
        {
          heading: "Reglas locales, beneficios reales",
          body: (
            <>
              <p>
                Una automatización local se ejecuta sobre tus archivos, en tu
                navegador, sin enviar nada afuera. Cuando una tarea cambia de
                estado, se puede mover a otra columna, asignar una plantilla,
                generar una notificación o actualizar una fecha. Todo dentro de
                tu carpeta.
              </p>
              <p>
                La ventaja no es solo la privacidad: es la simplicidad. No hace
                falta conectar APIs, pagar por integraciones premium ni depender
                de que un servicio de terceros no cambie de precio.
              </p>
            </>
          ),
        },
        {
          heading: "El modelo trigger → condición → acción",
          body: (
            <>
              <p>
                La mayoría de las automatizaciones se pueden expresar con tres
                partes: un <strong>trigger</strong> (qué las dispara), una{" "}
                <strong>condición</strong> (cuándo aplican) y una{" "}
                <strong>acción</strong> (qué hacen). Por ejemplo: cuando una tarea
                pasa a "En progreso" (trigger), si no tiene fecha límite
                (condición), asignarle una plantilla de revisión (acción).
              </p>
              <p>
                Este modelo es suficientemente simple para que cualquiera lo
                entienda y suficientemente potente para automatizar gran parte de
                la rutina de un equipo.
              </p>
            </>
          ),
        },
        {
          heading: "Funciona aunque se corte internet",
          body: (
            <>
              <p>
                En un mundo híbrido de trabajo, no siempre hay conexión
                confiable. Las automatizaciones locales no se detienen porque el
                Wi-Fi falló: se ejecutan cuando usás la app, y se aplican a tus
                archivos locales.
              </p>
              <p>
                Eso hace que sean ideales para profesionales que viajan,
                consultores en sitio del cliente o equipos que simplemente no
                quieren depender de la conectividad para que sus procesos
                funcionen.
              </p>
            </>
          ),
        },
      ],
    },
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}

export function getFeaturedArticles(): BlogArticle[] {
  return BLOG_ARTICLES.filter((a) => a.featured);
}

export function getRecentArticles(limit?: number): BlogArticle[] {
  const sorted = [...BLOG_ARTICLES].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return limit ? sorted.slice(0, limit) : sorted;
}
