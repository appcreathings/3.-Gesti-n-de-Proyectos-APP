import type { BlogArticle } from "../types";

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "gestion-proyectos-sin-nube",
    title: "Gestión de proyectos sin nube: por qué la soberanía de datos es una ventaja",
    excerpt:
      "Descubre por qué cada vez más equipos eligen un gestor de proyectos sin nube. Control total, privacidad real y datos que siempre puedes migrar.",
    category: "privacidad",
    categoryLabel: "Privacidad",
    publishedAt: "2026-07-05",
    readingTime: "7 min",
    featured: true,
    seo: {
      title: "Gestión de proyectos sin nube: soberanía de datos como ventaja — Hito",
      description:
        "¿Por qué usar un gestor de proyectos sin nube? Ventajas de local-first: privacidad, control total, sin suscripciones y datos siempre migrables.",
      ogImageAlt: "Gestión de proyectos local-first sin nube.",
    },
    content: {
      eyebrow: "Privacidad",
      intro: (
        <>
          Durante años aceptamos que gestionar proyectos significa subir todo a la
          nube de algún proveedor. Aceptamos los límites del plan gratuito, las
          exportaciones parciales y los términos de servicio que cambian cada
          semestre. Pero lo que menos hablamos es de lo que cedemos a cambio: el
          control de nuestros propios datos. La buena noticia es que existe una
          alternativa concreta: un{" "}
          <strong>gestor de proyectos sin nube</strong>, también llamado
          local-first.
        </>
      ),
      sections: [
        {
          heading: "¿Qué es un gestor de proyectos sin nube?",
          body: (
            <>
              <p>
                Un gestor de proyectos sin nube es una herramienta donde tus
                datos nunca se envían a servidores de terceros. En lugar de una
                base de datos remota, tus proyectos, tareas, procesos y checklists
                viven en archivos locales —por ejemplo, archivos{" "}
                <code>.json</code> dentro de una carpeta que tú eliges en tu
                equipo.
              </p>
              <p>
                Eso no significa que no puedas compartir el trabajo. Puedes usar
                Git, Dropbox, una red local o cualquier medio que ya utilices.
                La diferencia es que tú decides dónde y cómo se sincronizan los
                datos, no un tercero.
              </p>
            </>
          ),
        },
        {
          heading: 'El costo oculto del SaaS "gratis"',
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
                qué condiciones y quién puede acceder a ella. Un gestor de
                proyectos local te devuelve esa decisión.
              </p>
            </>
          ),
        },
        {
          heading: "5 ventajas de un gestor de proyectos local-first",
          body: (
            <>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Privacidad real:</strong> tus datos nunca salen de tu
                  dispositivo a menos que tú lo decidas.
                </li>
                <li>
                  <strong>Control total:</strong> puedes abrir, editar, versionar y
                  respaldar tus archivos con cualquier herramienta.
                </li>
                <li>
                  <strong>Sin suscripciones ocultas:</strong> no hay límites de
                  usuarios, proyectos o funciones premium.
                </li>
                <li>
                  <strong>Funciona offline:</strong> una PWA local-first sigue
                  operando sin internet.
                </li>
                <li>
                  <strong>Migrabilidad garantizada:</strong> si mañana cambias de
                  herramienta, tus datos ya están en un formato abierto.
                </li>
              </ol>
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
                proyectos viven en archivos que puedes abrir, versionar, respaldar
                y migrar. No dependes del uptime de un tercero ni de una política
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
          heading: "La confianza como diferenciador comercial",
          body: (
            <>
              <p>
                En sectores como el legal, el contable, la consultoría o cualquier
                área que maneje información sensible, "usamos una herramienta en
                la nube" deja de ser una respuesta suficiente. Poder decir
                "nuestros datos nunca salen de nuestra infraestructura" se
                convierte en un diferenciador comercial real.
              </p>
              <p>
                Hito nace de esa premisa: una herramienta de gestión que funciona
                offline, guarda todo en archivos legibles y te permite trabajar
                sin renunciar al control. Si buscas una alternativa a Notion o una
                alternativa a Trello sin depender de la nube, el modelo local-first
                es la respuesta más honesta.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Un gestor de proyectos sin nube funciona para equipos?
                  </dt>
                  <dd className="text-muted-foreground">
                    Sí. Como los datos son archivos, puedes compartir la carpeta por
                    Git, Dropbox, Drive o red local. Cada persona abre la misma
                    carpeta desde su app.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Qué pasa si pierdo mi dispositivo?
                  </dt>
                  <dd className="text-muted-foreground">
                    Deberías incluir la carpeta en tu backup habitual. Al ser
                    archivos JSON abiertos, se respaldan como cualquier carpeta de
                    trabajo.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Es más lento que la nube?
                  </dt>
                  <dd className="text-muted-foreground">
                    No. La lectura y escritura son locales, así que incluso sin
                    internet la app responde al instante.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "como-documentar-procesos-equipos",
    title: "Cómo documentar procesos en equipos pequeños: guía de SOPs y checklists",
    excerpt:
      "Aprendé a escribir SOPs y checklists que tu equipo realmente use. Sin wikis abandonados ni manuales que nadie lee.",
    category: "procesos",
    categoryLabel: "Procesos",
    publishedAt: "2026-07-05",
    readingTime: "7 min",
    featured: false,
    seo: {
      title: "Cómo documentar procesos en equipos: guía de SOPs y checklists — Hito",
      description:
        "Guía práctica para documentar procesos en equipos pequeños. Cómo crear SOPs útiles, checklists reutilizables y mantener la documentación viva.",
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
          documentado y el trabajo real. Esta guía te muestra cómo documentar
          procesos que realmente usen tus equipos.
        </>
      ),
      sections: [
        {
          heading: "Empieza por el dolor, no por el procedimiento",
          body: (
            <>
              <p>
                La mejor documentación responde a una pregunta concreta: "¿cómo
                hacemos X cuando pasa Y?". Si no hay una situación recurrente que
                cause fricción, cualquier SOP será teatro. Antes de escribir,
                identifica los tres errores que más se repiten o las tres tareas
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
          heading: "SOP vs checklist: ¿cuándo usar cada uno?",
          body: (
            <>
              <p>
                Aunque se confunden, no son lo mismo. Un <strong>SOP</strong>{" "}
                explica <em>cómo</em> se hace algo: el paso a paso, los criterios
                de decisión, los responsables. Un <strong>checklist</strong> sirve
                para <em>verificar</em> que nada se olvidó antes de entregar.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>SOP:</strong> "Cómo publicar una nueva versión del
                  producto".
                </li>
                <li>
                  <strong>Checklist:</strong> "Antes de publicar, revisar tests,
                  changelog y backup".
                </li>
              </ul>
              <p>
                En equipos pequeños, ambos se usan juntos: el SOP entrena, el
                checklist asegura calidad.
              </p>
            </>
          ),
        },
        {
          heading: "Conecta el proceso al proyecto",
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
        {
          heading: "Plantillas de checklist: documentar una vez, usar siempre",
          body: (
            <>
              <p>
                Las tareas repetitivas son el mejor lugar para empezar. Si todos
                los meses haces un lanzamiento, una reunión de retro o una
                auditoría de seguridad, convierte esos pasos en una plantilla de
                checklist. Así no tienes que recordar qué preguntar ni qué revisar:
                la plantilla lo hace por ti.
              </p>
              <p>
                En Hito, las plantillas de checklist se guardan en la biblioteca y
                se aplican a cualquier área de un proyecto con un clic. Es la
                forma más rápida de estandarizar calidad sin burocracia.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Cuánto debe medir un SOP?
                  </dt>
                  <dd className="text-muted-foreground">
                    Lo suficiente para que alguien nuevo lo entienda. De uno a
                    tres minutos de lectura es ideal. Si es más largo, divídelo en
                    subtareas.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Quién debe escribir los SOPs?
                  </dt>
                  <dd className="text-muted-foreground">
                    La persona que mejor conoce el proceso. Luego otro miembro
                    del equipo debería poder ejecutarlo solo con el SOP.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Con qué frecuencia actualizarlos?
                  </dt>
                  <dd className="text-muted-foreground">
                    Cada vez que el proceso cambie. Si un SOP lleva más de seis
                    meses sin revisión, es probable que esté desactualizado.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "asistente-ia-proyectos-sin-datos",
    title: "Asistente de IA para proyectos: cómo usarlo sin entrenar modelos con tus datos",
    excerpt:
      "La IA puede acelerar la gestión de proyectos, pero no debería costar tu confidencialidad. Cómo usar un asistente de IA sin entregar tus datos.",
    category: "inteligencia-artificial",
    categoryLabel: "Inteligencia artificial",
    publishedAt: "2026-07-05",
    readingTime: "7 min",
    featured: true,
    seo: {
      title: "Asistente de IA para proyectos sin sacrificar privacidad — Hito",
      description:
        "Cómo usar un asistente de IA para proyectos manteniendo tus datos locales. Guía para usar IA privada sin entrenar modelos con tu información.",
      ogImageAlt: "Asistente de IA privado para gestión de proyectos.",
    },
    content: {
      eyebrow: "Inteligencia artificial",
      intro: (
        <>
          La promesa de los asistentes de IA es tentadora: preguntarle a una
          máquina el estado de tus proyectos, pedirle que resuma tareas
          bloqueadas o que sugiera el próximo paso. Pero detrás de esa comodidad
          hay una pregunta incómoda: ¿dónde quedan tus datos cuando se los
          cuentas? Si quieres usar un{" "}
          <strong>asistente de IA para proyectos</strong> sin convertirte en el
          producto, necesitas entender cómo se procesa la información.
        </>
      ),
      sections: [
        {
          heading: "No toda la nube de IA es igual",
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
                No se trata de no usar IA. Se trata de usarla de forma que tú
                decidas qué compartes, cuándo y bajo qué términos.
              </p>
            </>
          ),
        },
        {
          heading: "¿Cómo funciona un asistente de IA privado?",
          body: (
            <>
              <p>
                Un asistente de IA privado para proyectos sigue tres principios:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Tus datos no se mueven:</strong> el asistente lee tu
                  espacio de trabajo local, no una copia en la nube.
                </li>
                <li>
                  <strong>Tú controlas la clave:</strong> usas tu propia API key
                  del proveedor del modelo, configurada solo en tu navegador.
                </li>
                <li>
                  <strong>Las llamadas son directas:</strong> tu navegador habla
                  con la API del modelo; la app de gestión no intercepta ni
                  almacena conversaciones.
                </li>
              </ol>
              <p>
                Así, el asistente puede responder "¿qué tareas vencen esta
                semana?" o "¿qué SOP le falta al área legal?" sin que toda tu
                base de datos viaje a un servidor externo.
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
                Tú decides si activarlo, con qué modelo y cuándo desactivarlo.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Mis datos entrenan el modelo de IA?
                  </dt>
                  <dd className="text-muted-foreground">
                    Depende del proveedor y de tu configuración. Usar tu propia
                    API key con opciones de privacidad desactivadas reduce el
                    riesgo, pero siempre revisa los términos del modelo.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Puedo usar el asistente sin internet?
                  </dt>
                  <dd className="text-muted-foreground">
                    No. El modelo vive en la nube del proveedor. Pero tus datos se
                    quedan locales; solo viajan los fragmentos necesarios para
                    responder tu pregunta.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Es seguro guardar la API key en el navegador?
                  </dt>
                  <dd className="text-muted-foreground">
                    Más seguro que guardarla en archivos compartidos. La clave
                    queda en IndexedDB local de tu navegador y no se exporta con
                    los proyectos.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "organizar-proyectos-tareas-jerarquia",
    title: "Cómo organizar proyectos y tareas: una jerarquía simple para equipos",
    excerpt:
      "No necesitas más apps: necesitas una estructura clara. Descubre una jerarquía práctica para organizar proyectos, áreas, procesos y tareas.",
    category: "productividad",
    categoryLabel: "Productividad",
    publishedAt: "2026-07-05",
    readingTime: "7 min",
    featured: false,
    seo: {
      title: "Cómo organizar proyectos y tareas: jerarquía práctica — Hito",
      description:
        "Aprendé a organizar proyectos y tareas con una jerarquía clara. Producto, proyecto, área, proceso y tarea: cómo estructurar el trabajo de tu equipo.",
      ogImageAlt: "Jerarquía para organizar proyectos y tareas.",
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
          veces es definir mejor cómo se relacionan las piezas. Acá va una
          jerarquía simple para <strong>organizar proyectos y tareas</strong>{" "}
          sin perder claridad.
        </>
      ),
      sections: [
        {
          heading: "Una jerarquía que piensa en capas",
          body: (
            <>
              <p>
                Piensa tu trabajo en cinco niveles: <strong>Producto</strong>{" "}
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
                Si mezclas esos niveles, terminas con reuniones de producto que
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
                Una buena jerarquía no solo organiza: acelera. Cuando sabes dónde
                vive cada decisión, no pierdes tiempo buscando. Cuando un proyecto
                está enfermo, puedes ver en qué nivel falla: ¿falta estrategia,
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
        {
          heading: "Checklists como puente entre proceso y tarea",
          body: (
            <>
              <p>
                La jerarquía no es solo teórica. Un checklist convierte un
                proceso abstracto en acciones concretas. Por ejemplo, el proceso
                "Publicar release" se traduce en un checklist con ítems como
                "Correr tests", "Actualizar changelog" y "Desplegar a producción".
                Cada ítem puede convertirse en una tarea del Kanban si es
                necesario.
              </p>
              <p>
                Así, la documentación y la ejecución no viven en mundos
                separados. El mismo proceso que guía a un nuevo integrante sirve
                para controlar la calidad antes de entregar.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Cuántos niveles necesita un equipo pequeño?
                  </dt>
                  <dd className="text-muted-foreground">
                    Los cinco básicos suelen ser suficientes. Lo importante no es
                    la cantidad, sino que cada cosa tenga un lugar claro.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Qué pasa si un proyecto no pertenece a un producto?
                  </dt>
                  <dd className="text-muted-foreground">
                    Puedes tener proyectos sueltos, pero conviene agruparlos bajo
                    un producto ficticio o interno para mantener la jerarquía.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Cómo evitar que la jerarquía se vuelva burocracia?
                  </dt>
                  <dd className="text-muted-foreground">
                    Revisala cada mes. Si un nivel no aporta claridad,
                    simplificalo. La jerarquía debe servir al equipo, no al
                    revés.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "automatizar-tareas-sin-nube",
    title: "Cómo automatizar tareas sin nube: reglas locales para tu equipo",
    excerpt:
      "Las automatizaciones no tienen por qué depender de servicios externos. Aprendé a crear reglas locales trigger→condición→acción que funcionan offline.",
    category: "automatizacion",
    categoryLabel: "Automatización",
    publishedAt: "2026-07-05",
    readingTime: "7 min",
    featured: false,
    seo: {
      title: "Cómo automatizar tareas sin nube: reglas locales — Hito",
      description:
        "Guía para automatizar tareas sin depender de la nube. Cómo crear reglas trigger-condición-acción locales, offline y bajo tu control.",
      ogImageAlt: "Automatización de tareas sin nube.",
    },
    content: {
      eyebrow: "Automatización",
      intro: (
        <>
          Las automatizaciones más populares funcionan en la nube: cuando pasa
          algo en una app, se dispara una acción en otra. Son poderosas, pero
          también frágiles. Dependen de que ambas apps estén online, de que la
          integración siga soportada y de que tus datos viajen por servidores que
          no controlas. Para muchos equipos, eso es más riesgo del que parece.
          Existe otra forma: <strong>automatizar tareas sin nube</strong>, con
          reglas que se ejecutan sobre tus propios archivos.
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
          heading: "Ejemplos prácticos de automatización local",
          body: (
            <>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Completar checklist:</strong> cuando un área termina su
                  checklist, marcar el proyecto como "listo para revisión".
                </li>
                <li>
                  <strong>Crear proyecto desde tipo:</strong> al crear un
                  proyecto desde un tipo, generar automáticamente las áreas,
                  procesos y checklists por defecto.
                </li>
                <li>
                  <strong>Recordatorios por fecha:</strong> si una tarea está por
                  vencer, crear una notificación de alerta al abrir la app.
                </li>
                <li>
                  <strong>Plantillas automáticas:</strong> al añadir un área
                  "Legal" a un proyecto, aplicar el checklist de revisión
                  contractural.
                </li>
              </ul>
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
                Wi-Fi falló: se ejecutan cuando usas la app, y se aplican a tus
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
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Las reglas locales consumen recursos de mi máquina?
                  </dt>
                  <dd className="text-muted-foreground">
                    Mínimos. Las reglas se evalúan sobre JSON locales y solo
                    cuando disparas un evento relevante.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Pueden dos personas ejecutar las mismas reglas sobre la
                    misma carpeta?
                  </dt>
                  <dd className="text-muted-foreground">
                    Sí. Cada persona ejecuta las reglas en su instancia local
                    sobre los mismos archivos compartidos.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Necesito saber programar?
                  </dt>
                  <dd className="text-muted-foreground">
                    No. El modelo trigger-condición-acción está pensado para ser
                    configurado sin código.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "que-es-un-hito-gestion-proyectos",
    title: "Qué es un hito en gestión de proyectos: definición y ejemplos prácticos",
    excerpt:
      "Un hito marca un punto de control clave en cualquier proyecto. Aprendé a definirlos, diferenciarlos de las tareas y usarlos para avanzar con claridad.",
    category: "productividad",
    categoryLabel: "Productividad",
    publishedAt: "2026-07-07",
    readingTime: "6 min",
    featured: false,
    seo: {
      title: "Qué es un hito en gestión de proyectos: guía práctica — Hito",
      description:
        "Un hito en gestión de proyectos marca un punto de control clave. Aprendé a definirlos, diferenciarlos de las tareas y usarlos para avanzar con claridad.",
      ogImageAlt: "Definición de hito en gestión de proyectos.",
    },
    content: {
      eyebrow: "Productividad",
      intro: (
        <>
          Si alguna vez planificaste un proyecto, seguro escuchaste la palabra{" "}
          <strong>hito</strong>. Pero ¿qué es exactamente? No es una tarea, no
          es una fecha en el calendario y no es un entregable cualquiera. Un
          hito es algo más específico: un <em>punto de control</em> que te dice
          si vas bien encaminado. La palabra viene del latín{" "}
          <em>hitus</em>, pero su origen más concreto está en los mojones de
          piedra que marcaban los caminos: señales que te decían dónde estabas y
          cuánto faltaba para llegar. En gestión de proyectos, un hito cumple
          exactamente esa función.
        </>
      ),
      sections: [
        {
          heading: "Definición simple de hito",
          body: (
            <>
              <p>
                Un hito es un <strong>evento significativo</strong> dentro de un
                proyecto que marca el cumplimiento de una etapa, una decisión o
                un resultado verificable. No tiene duración por sí mismo: es un
                punto en el tiempo, no un rango.
              </p>
              <p>
                Piénsalo así: si tu proyecto es un viaje, las tareas son los
                pasos que das y los hitos son los carteles que te indican que
                llegaste a cada pueblo del camino. No caminas "el cartel": el
                cartel te confirma que llegaste.
              </p>
            </>
          ),
        },
        {
          heading: "Hito vs tarea: la diferencia clave",
          body: (
            <>
              <p>
                La confusión más común es tratar un hito como si fuera una
                tarea. No lo son. Una <strong>tarea</strong> es trabajo
                ejecutable: tiene duración, responsable y pasos concretos. Un{" "}
                <strong>hito</strong> es un logro verificable: marca que algo
                importante se completó.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Tarea:</strong> "Redactar el documento de
                  especificaciones".
                </li>
                <li>
                  <strong>Hito:</strong> "Especificaciones aprobadas por el
                  cliente".
                </li>
              </ul>
              <p>
                La tarea es el trabajo; el hito es la confirmación de que ese
                trabajo produjo el resultado esperado. Si un equipo solo trackea
                tareas, sabe qué está haciendo pero no si está avanzando hacia
                donde necesita.
              </p>
            </>
          ),
        },
        {
          heading: "Ejemplos de hitos en proyectos reales",
          body: (
            <>
              <p>
                Los hitos varían según el tipo de proyecto, pero siempre comparten
                una característica: son verificables. Acá van algunos ejemplos
                concretos:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Desarrollo de software:</strong> "MVP desplegado en
                  staging", "Tests de integración aprobados", "Release v2.0 en
                  producción".
                </li>
                <li>
                  <strong>Marketing:</strong> "Campaña lanzada", "1.000 leads
                  capturados", "Reporte de resultados entregado".
                </li>
                <li>
                  <strong>Consultoría:</strong> "Diagnóstico inicial completado",
                  "Propuesta aprobada", "Implementación finalizada".
                </li>
                <li>
                  <strong>Construcción:</strong> "Cimientos vertidos",
                  "Estructura completada", "Inspección municipal aprobada".
                </li>
              </ul>
              <p>
                Nota que ninguno de estos hitos dice <em>cómo</em> se logró. Solo
                dicen que algo importante se completó y se puede verificar.
              </p>
            </>
          ),
        },
        {
          heading: "Cómo definir buenos hitos",
          body: (
            <>
              <p>
                No cualquier punto del proyecto merece ser un hito. Un buen hito
                cumple cuatro criterios:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Verificable:</strong> se puede confirmar objetivamente
                  si se cumplió o no. No hay ambigüedad.
                </li>
                <li>
                  <strong>Relevante:</strong> marca un avance real hacia el
                  objetivo del proyecto. No es un detalle menor disfrazado de
                  logro.
                </li>
                <li>
                  <strong>Con fecha:</strong> tiene un momento esperado de
                  cumplimiento. Un hito sin fecha pierde su función de control.
                </li>
                <li>
                  <strong>Alcanzable:</strong> es realista dentro del contexto
                  del proyecto. Un hito imposible solo genera frustración.
                </li>
              </ol>
              <p>
                Si un "hito" no cumple estos criterios, probablemente es una
                tarea disfrazada o un deseo. La disciplina de definir bien los
                hitos es lo que los hace útiles.
              </p>
            </>
          ),
        },
        {
          heading: "Cómo trackear hitos sin complicarte",
          body: (
            <>
              <p>
                Trackear hitos no requiere herramientas complejas. Lo que
                necesitas es visibilidad: saber en un vistazo qué hitos se
                cumplieron, cuáles están en riesgo y cuáles aún no empezaron.
              </p>
              <p>
                Una forma simple es usar una vista de proyecto donde los hitos
                aparezcan como marcas en una línea de tiempo, con un estado
                claro: pendiente, en progreso o completado. No necesitas un
                diagrama de Gantt de 200 filas; necesitas claridad sobre los
                puntos que importan.
              </p>
              <p>
                En Hito, cada proyecto tiene sus áreas y procesos, y los hitos
                emergen naturalmente cuando un proceso se completa o un
                checklist se marca como terminado. No hay que configurar nada
                extra: la estructura del proyecto ya te dice dónde están los
                puntos de control.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Cuántos hitos debe tener un proyecto?
                  </dt>
                  <dd className="text-muted-foreground">
                    Depende de la duración y complejidad. Como regla general, un
                    hito cada 2 a 4 semanas de trabajo mantiene el momentum sin
                    sobrecargar el seguimiento.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Un hito puede cambiar de fecha?
                  </dt>
                  <dd className="text-muted-foreground">
                    Sí, y debería. Los hitos son puntos de referencia, no
                    promesas inmutables. Lo importante es que el cambio sea
                    consciente y documentado, no que se muevan por inercia.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Los hitos solo sirven para proyectos grandes?
                  </dt>
                  <dd className="text-muted-foreground">
                    No. Un proyecto de dos semanas también puede tener 2 o 3
                    hitos. La escala cambia, pero la función es la misma: saber
                    si estás avanzando hacia donde quieres.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "hito-project-gestion-por-hitos",
    title: "Hito Project: cómo gestionar proyectos avanzando por hitos",
    excerpt:
      "Gestionar por hitos es avanzar con puntos de control claros. Conocé la filosofía del Hito Project: proyectos locales, hitos verificables y cero dependencia de la nube.",
    category: "productividad",
    categoryLabel: "Productividad",
    publishedAt: "2026-07-07",
    readingTime: "7 min",
    featured: true,
    seo: {
      title: "Hito Project: gestión de proyectos por hitos, sin nube — Hito",
      description:
        "Gestionar por hitos es avanzar con puntos de control claros. Conocé la filosofía del Hito Project: proyectos locales, hitos verificables y cero dependencia de la nube.",
      ogImageAlt: "Filosofía Hito Project: gestión por hitos.",
    },
    content: {
      eyebrow: "Productividad",
      intro: (
        <>
          El nombre no es casualidad. <strong>Hito</strong> viene de la idea de
          que los proyectos no se miden por la cantidad de tareas abiertas, sino
          por los puntos de control que se van superando. Un hito es un mojón
          en el camino: te dice dónde estabas, dónde estás y cuánto falta. La
          filosofía del <strong>Hito Project</strong> lleva esa idea al
          extremo: gestionar todo el proyecto como una sucesión de hitos
          verificables, con documentación viva y control total sobre tus datos.
          Sin nube, sin suscripciones, sin depender de que un servidor tercero
          esté online para que tu equipo funcione.
        </>
      ),
      sections: [
        {
          heading: "Qué es el Hito Project",
          body: (
            <>
              <p>
                El Hito Project es una forma de entender la gestión de proyectos
                donde el <strong>hito</strong> es la unidad central de progreso.
                No es una metodología cerrada con certificaciones y manuales de
                400 páginas. Es un principio simple: si no puedes verificar que
                avanzaste, no avanzaste.
              </p>
              <p>
                Esta filosofía se materializa en una herramienta concreta: la
                app Hito, un gestor de proyectos local-first donde cada
                proyecto se organiza en áreas, procesos y checklists. Los hitos
                no se configuran aparte: emergen cuando un proceso se completa,
                cuando un checklist se marca como terminado, cuando un área
                entrega su resultado.
              </p>
            </>
          ),
        },
        {
          heading: "Por qué gestionar por hitos funciona",
          body: (
            <>
              <p>
                La gestión tradicional de proyectos suele caer en dos extremos:
                o microgestión de tareas (que agota al equipo y al líder) o
                planificación abstracta de alto nivel (que nadie entiende cuando
                abre el Excel). Gestionar por hitos ofrece un punto medio:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Claridad:</strong> todo el equipo sabe qué se necesita
                  para "llegar al siguiente mojón". No hay ambigüedad sobre qué
                  significa avanzar.
                </li>
                <li>
                  <strong>Momentum:</strong> cada hito completado es una
                  victoria visible. Eso genera inercia positiva, no la sensación
                  de correr en una rueda de hámster.
                </li>
                <li>
                  <strong>Puntos de control sin microgestión:</strong> no
                  necesitas preguntar "¿cómo vas?" cada dos horas. El hito te
                  dice si se llegó o no.
                </li>
              </ol>
              <p>
                Para equipos pequeños y medianos, esto es especialmente valioso:
                no tienes un PM dedicado ni herramientas enterprise. Necesitas
                algo simple que funcione y que no te esclavice.
              </p>
            </>
          ),
        },
        {
          heading: "Los 4 principios del Hito Project",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    1. Hitos verificables
                  </dt>
                  <dd className="text-muted-foreground">
                    Cada punto de control debe poder confirmarse
                    objetivamente. No alcanza con "creo que ya está". O se puede
                    verificar, o no es un hito.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    2. Progreso visible
                  </dt>
                  <dd className="text-muted-foreground">
                    El estado del proyecto debe ser legible en un vistazo. Si
                    necesitas tres reuniones para saber dónde estás, la
                    herramienta no te está ayudando.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    3. Documentación viva
                  </dt>
                  <dd className="text-muted-foreground">
                    Los procesos y checklists no son archivos muertos en una
                    wiki: están al lado del trabajo, se actualizan con el
                    proyecto y se usan de verdad.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    4. Control local
                  </dt>
                  <dd className="text-muted-foreground">
                    Tus datos viven en archivos que tú controlas. No en
                    servidores de terceros, no en planes premium, no en
                    exportaciones parciales. Si mañana quieres migrar, tus datos
                    ya están en un formato abierto.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
        {
          heading: "Cómo aplicar esta filosofía con Hito",
          body: (
            <>
              <p>
                La app Hito está construida sobre una jerarquía que hace que
                los hitos emerjan de forma natural:{" "}
                <strong>
                  Producto → Proyecto → Área → Proceso / Checklist → Tarea
                </strong>
                . Cada nivel responde a una pregunta distinta y cada uno
                aporta su propio punto de control.
              </p>
              <p>
                Cuando un área completa su checklist, eso es un hito. Cuando un
                proceso se ejecuta y se marca como terminado, eso es otro hito.
                No necesitas configurar un módulo de "milestones" aparte: la
                estructura del proyecto ya te los da.
              </p>
              <p>
                Además, como todo es local-first, puedes versionar tus proyectos
                con Git, compartir la carpeta del equipo por los medios que ya
                usan y trabajar sin internet. La filosofía del Hito Project no
                es solo un concepto: es la arquitectura de la herramienta.
              </p>
            </>
          ),
        },
        {
          heading: "Hito Project vs gestión tradicional",
          body: (
            <>
              <p>
                La gestión tradicional de proyectos suele venir atada a
                herramientas pesadas: Jira, Asana, Monday, ClickUp. Son
                poderosas, pero también complejas, caras y dependientes de la
                nube. El Hito Project propone otra cosa:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Sin microgestión:</strong> no necesitas registrar cada
                  minuto de trabajo. Los hitos marcan el progreso, no las horas
                  facturadas.
                </li>
                <li>
                  <strong>Sin dependencias de nube:</strong> tus datos son
                  archivos JSON en tu equipo. No dependes del uptime de un
                  tercero ni de que renueven una integración.
                </li>
                <li>
                  <strong>Sin suscripciones:</strong> no hay plan premium, no
                  hay límite de usuarios, no hay features bloqueadas. Es MIT, es
                  todo, siempre.
                </li>
                <li>
                  <strong>Sin fricción de onboarding:</strong> no hay que crear
                  cuenta, verificar email ni configurar un workspace en la nube.
                  Abres la app y empiezas a trabajar.
                </li>
              </ul>
              <p>
                Esto no significa que el Hito Project sea para todos. Si tu
                equipo tiene 50 personas y necesita SSO, audit logs
                distribuidos y compliance SOC2, hay herramientas mejores para
                eso. Pero si eres un equipo de 1 a 15 personas que valora la
                claridad, la privacidad y el control, esta filosofía está
                pensada para ti.
              </p>
            </>
          ),
        },
        {
          heading: "Preguntas frecuentes",
          body: (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Hito Project es una metodología o una herramienta?
                  </dt>
                  <dd className="text-muted-foreground">
                    Es ambos. La filosofía de gestionar por hitos es el
                    principio; la app Hito es la implementación concreta. Puedes
                    aplicar el principio con cualquier herramienta, pero Hito
                    está diseñada desde cero para que sea natural.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Puedo usar Hito sin internet?
                  </dt>
                  <dd className="text-muted-foreground">
                    Sí. Es una PWA local-first: funciona completamente offline.
                    Los datos se guardan en archivos locales y el asistente de
                    IA es opcional (requiere tu propia API key).
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">
                    ¿Cómo comparto proyectos con mi equipo?
                  </dt>
                  <dd className="text-muted-foreground">
                    Como compartes cualquier carpeta: Git, Dropbox, Drive, red
                    local. Cada persona abre la misma carpeta desde su app. No
                    hay servidores de por medio.
                  </dd>
                </div>
              </dl>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "hito-vs-trello",
    title: "Hito vs Trello: cuál elegir en 2026",
    excerpt:
      "Comparativa honesta entre Hito y Trello: privacidad, IA, precio y casos de uso. Descubre cuál te conviene según tu situación y cómo migrar.",
    category: "comparativas",
    categoryLabel: "Comparativas",
    publishedAt: "2026-07-20",
    readingTime: "9 min",
    featured: false,
    seo: {
      title: "Hito vs Trello: cuál elegir en 2026 — Comparativa honesta",
      description:
        "Comparativa honesta entre Hito y Trello: privacidad, IA, precio y casos de uso. Descubre cuál te conviene según tu situación y cómo migrar.",
      ogImageAlt: "Comparativa Hito vs Trello en 2026.",
    },
    content: {
      eyebrow: "Comparativas",
      intro: (
        <>
          <strong>En una línea:</strong> Hito es mejor que Trello si valoras
          privacidad en el almacenamiento (todo local-first, sin backend), un
          modelo 100% gratis sin límites y un asistente IA que tú controlas con
          tu propia API key. Trello sigue siendo mejor si necesitas colaboración
          en tiempo real con un equipo grande o un ecosistema maduro de
          integraciones.
        </>
      ),
      sections: [
        {
          heading: "La respuesta rápida",
          body: (
            <>
              <p>
                Si has llegado aquí buscando "alternativa a Trello", no estás
                solo. En 2026, dos cosas empujaron a muchos equipos a evaluar
                migrar: los{" "}
                <a href="https://trello.com/es/pricing" target="_blank" rel="noopener noreferrer">
                  límites cada vez más ajustados del plan gratis de Trello
                </a>{" "}
                y una pregunta que antes casi nadie se hacía — <em>
                  ¿quiero que mis proyectos vivan en los servidores de otra
                  empresa?
                </em>
              </p>
              <p>
                Esta es una comparativa honesta. Ambas herramientas sirven, pero
                para perfiles distintos. Vamos al grano.
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Si tu prioridad es…</th>
                    <th className="py-2 font-semibold">Elige</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Privacidad total y soberanía sobre tus datos</td>
                    <td className="py-2 font-semibold">Hito</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Colaboración en tiempo real con un equipo grande</td>
                    <td className="py-2">Trello</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Un modelo gratis real, sin límites ni upsells</td>
                    <td className="py-2 font-semibold">Hito</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Integraciones nativas con Slack, Google, GitHub…</td>
                    <td className="py-2">Trello</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">IA con tus proyectos (tú controlas la API key)</td>
                    <td className="py-2 font-semibold">Hito</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Trabajar offline sin depender de la nube</td>
                    <td className="py-2 font-semibold">Hito</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Open source y código auditable</td>
                    <td className="py-2 font-semibold">Hito</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Onboarding inmediato para usuarios no técnicos</td>
                    <td className="py-2">Trello</td>
                  </tr>
                </tbody>
              </table>
            </>
          ),
        },
        {
          heading: "Tabla comparativa completa",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Característica</th>
                  <th className="py-2 pr-4 font-semibold">Hito</th>
                  <th className="py-2 font-semibold">Trello</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Modelo de datos</td>
                  <td className="py-2 pr-4">Local-first (en tu equipo)</td>
                  <td className="py-2">Cloud-first (en servidores de Atlassian)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Privacidad</td>
                  <td className="py-2 pr-4">Storage 100% local; el asistente IA envía datos a Gemini (tú traes la API key)</td>
                  <td className="py-2">Datos alojados en servidores de terceros</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Cuenta requerida</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2">Sí</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Precio</td>
                  <td className="py-2 pr-4">Gratis para siempre (open source MIT)</td>
                  <td className="py-2">Freemium con límites; de pago para equipos</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Límites del plan gratis</td>
                  <td className="py-2 pr-4">Ninguno</td>
                  <td className="py-2">Tableros, automatizaciones y archivos limitados</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Colaboración en tiempo real</td>
                  <td className="py-2 pr-4">Vía sincronización de carpeta (Dropbox/Drive/Git)</td>
                  <td className="py-2">Nativa, instantánea</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">IA integrada</td>
                  <td className="py-2 pr-4">Asistente con RAG local + MCP (Gemini)</td>
                  <td className="py-2">Butler (automatización) + IA en planes superiores</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Funciona offline</td>
                  <td className="py-2 pr-4">Sí, nativo</td>
                  <td className="py-2">Limitado</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Código abierto</td>
                  <td className="py-2 pr-4">Sí (MIT)</td>
                  <td className="py-2">No</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Autonomía de los datos</td>
                  <td className="py-2 pr-4">Total (soberanía)</td>
                  <td className="py-2">Depende de Atlassian</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Integraciones de terceros</td>
                  <td className="py-2 pr-4">En crecimiento</td>
                  <td className="py-2">Ecosistema maduro (Power-Ups)</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Dónde gana Hito",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                1. Privacidad y soberanía de datos
              </h3>
              <p>
                Esta es la diferencia más importante y el motivo por el que Hito
                existe. Hito es{" "}
                <a href="https://localfirstweb.dev/" target="_blank" rel="noopener noreferrer">
                  local-first
                </a>
                : tus proyectos, tareas y procesos viven en <strong>tu equipo</strong>,
                no en un servidor ajeno. Sin cuenta, sin nube, sin que un tercero
                pueda acceder, monetizar o perder tus datos.
              </p>
              <p>
                Para perfiles sensibles a la privacidad —estudios jurídicos,
                consultoras, áreas de RRHH, equipos de salud o cualquier
                organización con obligaciones de{" "}
                <a href="https://gdpr.eu/what-is-gdpr/" target="_blank" rel="noopener noreferrer">
                  GDPR o LGPD
                </a>
                — esto no es un detalle, es un requisito.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                2. Gratis de verdad, sin trampa
              </h3>
              <p>
                Hito es open source bajo licencia MIT y <strong>gratis para siempre, sin límites</strong>.
                No hay plan "Pro" esperando en la esquina. No hay upsells. No hay
                "te dejamos usar 10 tableros y luego pagas".
              </p>
              <p>
                Trello tiene un plan gratuito, pero con límites crecientes:
                número de tableros, tamaño de archivos, automatizaciones de
                Butler, etc. Para un equipo que crece, la transición a plan de
                pago es casi inevitable.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                3. IA con tus datos, sin filtrarlos
              </h3>
              <p>
                El asistente de IA de Hito funciona con <strong>RAG local y function calling sobre Gemini</strong>:
                lee tus proyectos y tareas para ayudarte —resumir, priorizar,
                crear tareas— directamente en tu workspace. Tú traes tu propia
                API key de Google AI Studio, así que tú controlas qué modelo usas
                y dónde se procesa.
              </p>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                <strong>Sobre privacidad y la IA:</strong> tus proyectos viven en
                local (sin backend), pero cuando interactúas con el asistente,
                el contenido relevante de tu workspace (lo que el modelo necesita
                para responder) viaja a la API de Gemini. Hito no tiene servidor
                propio; la comunicación es directa entre tu navegador y Google.
                Si trabajás con datos extremadamente sensibles, podés simplemente
                no activar el asistente y seguir disfrutando del 100% del resto
                de la app.
              </blockquote>
              <p>
                Trello ofrece IA, pero en planes superiores y dentro de su modelo
                cloud: tus datos viajan por los servidores de Atlassian y sus
                proveedores de IA.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                4. Funciona sin conexión
              </h3>
              <p>
                Hito es una PWA que funciona <strong>offline de forma nativa</strong>.
                Puedes trabajar en un avión, en una oficina con mala conexión o en
                un entorno seguro sin internet, y todo se sincroniza cuando
                quieras.
              </p>
              <p>
                Trello depende de la nube por diseño; sin conexión, esencialmente
                no funciona.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                5. Open source y auditable
              </h3>
              <p>
                El{" "}
                <a href="https://github.com/appcreathings/Gestion-de-Proyectos-APP" target="_blank" rel="noopener noreferrer">
                  código de Hito es público bajo MIT
                </a>
                . Cualquiera puede auditarlo, verificar que no hay telemetría
                oculta, y extenderlo. Trello es software cerrado de Atlassian.
              </p>
            </>
          ),
        },
        {
          heading: "Dónde gana Trello (honestidad antes que marketing)",
          body: (
            <>
              <p>
                No vamos a fingir que Hito es mejor en todo. Trello sigue siendo
                la opción correcta para varios casos:
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                1. Colaboración en tiempo real con equipos grandes
              </h3>
              <p>
                La sincronización nativa de Trello es <strong>instantánea y sin fricción</strong>{" "}
                para equipos distribuidos. Varios editores simultáneos, cambios
                que aparecen al instante, sin configurar nada.
              </p>
              <p>
                En Hito, la colaboración entre varias personas requiere
                sincronizar un workspace compartido vía Dropbox, Google Drive o
                Git. Funciona perfecto, pero no es "abrir y que aparezca
                mágicamente".
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                2. Ecosistema de integraciones
              </h3>
              <p>
                Los <strong>Power-Ups</strong> de Trello son un catálogo maduro:
                Slack, Google Calendar, GitHub, Jira, Zapier, cientos de
                herramientas. Si tu flujo depende de integraciones nativas con un
                stack específico, hoy Trello tiene más opciones.
              </p>
              <p>
                Hito está creciendo en integraciones, pero su enfoque prioriza
                privacidad y control por sobre un catálogo amplio.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                3. Adopción y curva de aprendizaje
              </h3>
              <p>
                Trello es <strong>ubicuo</strong>. Casi cualquier persona ya lo
                usó alguna vez, así que onboarding = cero. En un equipo nuevo o
                con perfiles no técnicos, esto reduce fricción.
              </p>
              <p>
                Hito tiene una interfaz accesible, pero al introducir conceptos
                como local-first y una jerarquía más estructurada (producto →
                proyecto → áreas, procesos y tareas), exige un par de minutos más
                de aprendizaje.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                4. Madurez del producto
              </h3>
              <p>
                Trello lleva más de una década en el mercado. Es estable,
                documentado, y tiene una comunidad enorme. Hito es más joven —
                lo que significa innovación más rápida, pero también menos
                profundidad en algunas características periféricas.
              </p>
            </>
          ),
        },
        {
          heading: "¿Cuál elegir según tu caso?",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                🎯 Elige Hito si…
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Manejas información sensible (legal, financiera, salud, RRHH) y
                  la privacidad es innegociable.
                </li>
                <li>
                  Eres freelancer, consultor o profesional independiente y no
                  quieres pagar suscripción por algo básico.
                </li>
                <li>
                  Tu equipo es pequeño y la privacidad + el control pesan más que
                  la colaboración real-time.
                </li>
                <li>
                  Quieres un asistente IA que trabaje sobre tu workspace y tú
                  controles la API key (tú decides qué modelo y proveedor usar).
                </li>
                <li>Valoras el open source y la soberanía sobre tus propios datos.</li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                🎯 Elige Trello si…
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Tienes un equipo grande distribuido que edita los mismos
                  tableros simultáneamente todo el día.
                </li>
                <li>
                  Tu flujo depende de integraciones nativas con Slack, GitHub,
                  Zapier o un stack específico.
                </li>
                <li>Onboarding cero es prioritario (todos ya conocen Trello).</li>
                <li>La privacidad no es un requisito duro para tu caso de uso.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Cómo migrar de Trello a Hito",
          body: (
            <>
              <p>
                Si te has decidido por Hito, la migración es más simple de lo que
                parece. La idea general: exportas tus tableros desde Trello y los
                reconstruyes en Hito organizándolos bajo su estructura (productos
                → proyectos → áreas, procesos y tareas).
              </p>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                📖 Próximamente publicaremos una guía de migración paso a paso
                con screenshots. Mientras tanto, puedes explorar el flujo
                descargando Hito.
              </blockquote>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Hito y Trello no compiten en el mismo eje. Trello ganó el mercado
                de la <strong>colaboración en la nube</strong>, y para equipos
                grandes con flujos que dependen de integraciones, sigue siendo
                una elección razonable.
              </p>
              <p>
                Pero si tu prioridad es <strong>privacidad, control, un modelo gratis sin letra pequeña y una IA que respete tus datos</strong>,
                Hito es la alternativa que estabas buscando. Y al ser open source,
                lo puedes auditar, extender y hacer tuyo.
              </p>
              <p>
                <strong>La mejor forma de decidir es probarlo.</strong> Hito se
                instala en segundos, no requiere cuenta y tus proyectos se guardan
                en tu equipo (el asistente IA es opcional y tú controlas la API
                key).
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Sin cuenta, sin nube, sin suscripción.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "alternativas-a-notion",
    title: "Las 7 mejores alternativas a Notion en 2026",
    excerpt:
      "7 alternativas a Notion según privacidad, precio y funciones: Hito, Obsidian, Trello, ClickUp, Anytype, Capacities y AppFlowy. Comparativa honesta.",
    category: "comparativas",
    categoryLabel: "Comparativas",
    publishedAt: "2026-07-27",
    readingTime: "10 min",
    featured: false,
    seo: {
      title: "Las 7 mejores alternativas a Notion en 2026 — Comparativa honesta",
      description:
        "7 alternativas a Notion según privacidad, precio y funciones: Hito, Obsidian, Trello, ClickUp, Anytype, Capacities y AppFlowy. Comparativa honesta.",
      ogImageAlt: "Alternativas a Notion en 2026.",
    },
    content: {
      eyebrow: "Comparativas",
      intro: (
        <>
          <strong>En una línea:</strong> las mejores alternativas a Notion en
          2026 son <strong>Hito</strong> (privacidad total y gratis),{" "}
          <strong>Obsidian</strong> (notas locales), <strong>Trello</strong>{" "}
          (Kanban simple), <strong>ClickUp</strong> (gestión completa),{" "}
          <strong>Anytype</strong> (local-first con bases de datos),{" "}
          <strong>Capacities</strong> (notas basadas en objetos) y{" "}
          <strong>AppFlowy</strong> (open source). La elección depende de tu
          prioridad: privacidad, simplicidad o funciones.
        </>
      ),
      sections: [
        {
          heading: "Por qué la gente se va de Notion",
          body: (
            <>
              <p>
                Notion revolucionó la productividad personal y de equipo cuando
                llegó: un único espacio para notas, bases de datos, wikis y
                tareas, todo enlazado y flexible. Pero en 2026, muchos usuarios
                buscan salir de Notion. Las razones más comunes son cinco:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Privacidad:</strong> tus notas y procesos viven en
                  servidores de terceros.
                </li>
                <li>
                  <strong>Precio:</strong> el modelo freemium tiene límite de
                  bloques; para equipos, el plan pago sube rápido.
                </li>
                <li>
                  <strong>Lentitud:</strong> workspaces grandes se vuelven
                  pesados por la dependencia de la nube.
                </li>
                <li>
                  <strong>Complejidad:</strong> Notion es tan flexible que a
                  veces cuesta arrancar.
                </li>
                <li>
                  <strong>Dependencia:</strong> si Notion cambia de modelo, se
                  cae o sube precios, tu conocimiento queda atrapado.
                </li>
              </ol>
              <p>
                Si te identificas con alguna de estas, este post es para ti.
                Estas son las 7 mejores alternativas evaluadas con un criterio
                honesto: privacidad, precio, funciones y caso de uso ideal.
              </p>
            </>
          ),
        },
        {
          heading: "La respuesta rápida",
          body: (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Herramienta</th>
                    <th className="py-2 pr-4 font-semibold">Mejor para…</th>
                    <th className="py-2 pr-4 font-semibold">Privacidad</th>
                    <th className="py-2 pr-4 font-semibold">Open source</th>
                    <th className="py-2 font-semibold">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Obsidian</td>
                    <td className="py-2 pr-4">Tomar notas en local</td>
                    <td className="py-2 pr-4">Local-first</td>
                    <td className="py-2 pr-4">No (formato abierto)</td>
                    <td className="py-2">Gratis (sync de pago)</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Trello</td>
                    <td className="py-2 pr-4">Kanban simple y colaborativo</td>
                    <td className="py-2 pr-4">Cloud</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">Freemium</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Hito ⭐</td>
                    <td className="py-2 pr-4">Privacidad + proyectos + IA</td>
                    <td className="py-2 pr-4">Local-first</td>
                    <td className="py-2 pr-4">Sí (MIT)</td>
                    <td className="py-2">Gratis para siempre</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">ClickUp</td>
                    <td className="py-2 pr-4">Gestión completa de equipos</td>
                    <td className="py-2 pr-4">Cloud</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">Freemium</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Anytype</td>
                    <td className="py-2 pr-4">Local-first con BD</td>
                    <td className="py-2 pr-4">Local-first (E2E)</td>
                    <td className="py-2 pr-4">Parcial (source-available)</td>
                    <td className="py-2">Freemium</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Capacities</td>
                    <td className="py-2 pr-4">Notas basadas en objetos</td>
                    <td className="py-2 pr-4">Cloud-synced</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">Freemium</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">AppFlowy</td>
                    <td className="py-2 pr-4">Open source self-hosted</td>
                    <td className="py-2 pr-4">Híbrido</td>
                    <td className="py-2 pr-4">Sí (AGPLv3)</td>
                    <td className="py-2">Freemium</td>
                  </tr>
                </tbody>
              </table>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                Precios verificados a julio de 2026. Las herramientas SaaS cambian
                precios con frecuencia; confirma antes de decidir.
              </blockquote>
            </>
          ),
        },
        {
          heading: "1. Obsidian — la opción minimalista para notas",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> una aplicación de toma de notas basada
                en archivos Markdown locales, con enlaces bidireccionales, vista
                de grafo y un ecosistema enorme de plugins comunitarios.
              </p>
              <p>
                <strong>Para quién es:</strong> personas que principalmente
                quieren escribir y conectar ideas, y que valoran la perdurabilidad
                de sus notas por encima de una interfaz moderna.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> las notas son archivos <code>.md</code>{" "}
                  tuyos para siempre; no hay lock-in; plugin ecosystem gigante;
                  rápido incluso con miles de notas.
                </li>
                <li>
                  <strong>Contras:</strong> la app principal es software
                  propietario (no open source); no está diseñada para gestión de
                  proyectos ni bases de datos complejas; colaboración en equipo
                  limitada.
                </li>
                <li>
                  <strong>Precio:</strong> gratis para uso personal y comercial.
                  Sync entre dispositivos: USD 4/mes. Publish: USD 8/mes.{" "}
                  <a href="https://obsidian.md" target="_blank" rel="noopener noreferrer">
                    obsidian.md
                  </a>
                </li>
              </ul>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                <strong>Matiz importante:</strong> Obsidian se confunde a menudo
                con open source, pero no lo es. Lo abierto es el formato
                (Markdown); la app es propietaria. Aun así, tus datos son 100%
                portables.
              </blockquote>
            </>
          ),
        },
        {
          heading: "2. Trello — Kanban puro y colaborativo",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> el tablero Kanban más conocido del
                mercado. Listas, tarjetas y un flujo simple de "por hacer → en
                progreso → hecho".
              </p>
              <p>
                <strong>Para quién es:</strong> equipos pequeños a medianos que
                necesitan visibilidad de tareas sin la complejidad de un "todo en
                uno".
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> adopción masiva (casi todos lo han
                  usado); colaboración en tiempo real madura; Power-Ups para
                  integraciones.
                </li>
                <li>
                  <strong>Contras:</strong> cloud por diseño (sin privacidad real
                  en el storage); límites crecientes del plan gratis; el asistente
                  IA no es controlable con API key propia; estructura plana, no
                  jerárquica.
                </li>
                <li>
                  <strong>Precio:</strong> freemium con límites; Standard USD
                  5/usuario/mes; Premium USD 10/usuario/mes.{" "}
                  <a href="https://trello.com" target="_blank" rel="noopener noreferrer">
                    trello.com
                  </a>
                </li>
              </ul>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                Si quieres profundizar en Trello vs Hito, tenemos un{" "}
                <a href="https://hito.autos/blogs/hito-vs-trello" target="_blank" rel="noopener noreferrer">
                  post dedicado a esa comparativa
                </a>
                .
              </blockquote>
            </>
          ),
        },
        {
          heading: "3. Hito ⭐ — privacidad total, gratis y con IA",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> un gestor de proyectos, procesos,
                checklists y tareas <strong>100% local-first</strong>, open
                source (MIT) y gratuito. El storage es local: tus proyectos viven
                en tu equipo, sin backend.
              </p>
              <p>
                <strong>Para quién es:</strong> personas y equipos sensibles a la
                privacidad del almacenamiento (abogados, consultores, RRHH,
                salud, desarrolladores), freelancers que no quieren pagar
                suscripción, y cualquiera que quiera un asistente IA controlable
                con su propia API key.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> privacidad en el storage (sin backend ni
                  cuenta); gratis para siempre sin límites; asistente IA con RAG
                  local y function calling sobre Gemini (tú traes tu propia API
                  key); PWA offline nativa; código auditable; jerarquía
                  estructurada (producto → proyecto → áreas, procesos y tareas)
                  que organiza proyectos reales.
                </li>
                <li>
                  <strong>Contras:</strong> colaboración entre varias personas
                  requiere sincronizar vía Dropbox/Drive/Git (no es real-time
                  instantáneo como Trello); menos integraciones nativas que
                  Notion; producto más joven.
                </li>
                <li>
                  <strong>Precio:</strong> <strong>gratis para siempre</strong>,
                  open source MIT. Sin plan de pago.{" "}
                  <a href="https://hito.autos" target="_blank" rel="noopener noreferrer">
                    hito.autos
                  </a>
                </li>
              </ul>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                Hito es la única opción de esta lista que combina <strong>
                  privacidad real + open source + IA con datos locales + gratis
                  sin trampa
                </strong>
                . Si ese combo te resuena, vale la pena probarla.
              </blockquote>
            </>
          ),
        },
        {
          heading: "4. ClickUp — el todo en uno potente",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> una plataforma SaaS de gestión de
                proyectos con tareas, docs, wikis, Kanban, Gantt, calendario, chat
                y objetivos. Es la alternativa más directa a Notion en cantidad de
                funciones.
              </p>
              <p>
                <strong>Para quién es:</strong> equipos que quieren todo en una
                sola herramienta y no les importa la dependencia de la nube.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> funcionalidades muy completas; vistas
                  múltiples (lista, Kanban, Gantt, calendario); integraciones
                  amplias; reportes y objetivos.
                </li>
                <li>
                  <strong>Contras:</strong> cloud-first (sin privacidad real en el
                  storage); interfaz densa y curva de aprendizaje pronunciada; el
                  plan gratis tiene límites serios; puede sentirse lento con
                  workspaces grandes.
                </li>
                <li>
                  <strong>Precio:</strong> Free Forever (limitado); Unlimited USD
                  7/usuario/mes; Business USD 12/usuario/mes; Enterprise desde USD
                  28/usuario/mes.{" "}
                  <a href="https://clickup.com" target="_blank" rel="noopener noreferrer">
                    clickup.com
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "5. Anytype — local-first con bases de datos",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> un espacio de trabajo "todo en uno"
                local-first para notas, tareas, bases de datos y objetos, con
                encriptación de extremo a extremo y sincronización P2P.
              </p>
              <p>
                <strong>Para quién es:</strong> usuarios que quieren la
                flexibilidad de Notion (objetos, tipos, relaciones) pero con datos
                locales y cifrados.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> local-first real con cifrado E2E; modelo
                  de objetos flexible; filosofía de soberanía digital clara.
                </li>
                <li>
                  <strong>Contras:</strong> las apps cliente usan una licencia{" "}
                  <em>source-available</em> (visible pero <strong>no es open source</strong>{" "}
                  en sentido estricto OSI, restringe uso comercial); ecosistema
                  más pequeño que Notion; curva de aprendizaje del modelo de
                  objetos.
                </li>
                <li>
                  <strong>Precio:</strong> Free (100 MB de sync remoto); Plus desde
                  USD 4/mes; tiers superiores varían.{" "}
                  <a href="https://anytype.io" target="_blank" rel="noopener noreferrer">
                    anytype.io
                  </a>
                </li>
              </ul>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                <strong>Matiz importante:</strong> Anytype se autopromociona como
                "open source", pero su licencia de cliente es{" "}
                <em>source-available</em> (restringe uso comercial), no
                OSI-approved. Solo sus librerías de sincronización núcleo son MIT.
                Si el open source real es un requisito para ti, conviene saberlo.
              </blockquote>
            </>
          ),
        },
        {
          heading: "6. Capacities — notas basadas en objetos",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> una app de conocimiento personal donde
                cada nota es un "objeto tipado" (libro, persona, reunión, idea)
                con propiedades y relaciones. Posicionada como alternativa a
                Notion y Obsidian.
              </p>
              <p>
                <strong>Para quién es:</strong> personas que organizan su
                conocimiento personal y quieren un sistema más estructurado que
                Markdown puro, pero menos rígido que una base de datos.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> modelo de objetos elegante; daily notes y
                  backlinks; IA integrada; buena para gestión de conocimiento
                  personal.
                </li>
                <li>
                  <strong>Contras:</strong> cloud-synced (no local-first puro,
                  aunque está migrando a offline-first); no es open source;
                  colaboración de equipo limitada respecto a Notion.
                </li>
                <li>
                  <strong>Precio:</strong> Free (~5 GB); Pro ~USD 9,99/mes (anual)
                  o ~USD 11,99/mes (mensual); Believer desde USD 12,49/mes.{" "}
                  <a href="https://capacities.io" target="_blank" rel="noopener noreferrer">
                    capacities.io
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "7. AppFlowy — open source self-hosted",
          body: (
            <>
              <p>
                <strong>Qué es:</strong> un espacio de trabajo colaborativo con
                IA para proyectos, wikis, notas y bases de datos. Construido en
                Flutter y Rust, se posiciona como la alternativa open source y
                auto-alojable a Notion.
              </p>
              <p>
                <strong>Para quién es:</strong> usuarios técnicos o equipos que
                quieren control total: self-hosting, datos propios y
                auditabilidad.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Pros:</strong> <strong>licencia AGPLv3</strong> (open
                  source OSI-approved) en su núcleo; soporta self-hosting, modo
                  offline real y AppFlowy Cloud; IA local seleccionable (p. ej.
                  Llama 3).
                </li>
                <li>
                  <strong>Contras:</strong> requiere cierta técnica para
                  self-hosting completo; el uso comercial auto-alojado necesita
                  licencia comercial aparte; menos pulido que Notion en UX.
                </li>
                <li>
                  <strong>Precio:</strong> AppFlowy Cloud Free (5 GB); Pro ~USD
                  10–12,50/usuario/mes. Self-hosted Free hasta Team USD
                  10/asiento/mes.{" "}
                  <a href="https://appflowy.com" target="_blank" rel="noopener noreferrer">
                    appflowy.com
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Cómo elegir según tu caso",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Tu situación</th>
                  <th className="py-2 font-semibold">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Quiero privacidad total + gratis + IA con mis datos</td>
                  <td className="py-2 font-semibold">Hito</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Solo quiero tomar notas en local, sin más</td>
                  <td className="py-2 font-semibold">Obsidian</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Mi equipo necesita Kanban colaborativo simple</td>
                  <td className="py-2 font-semibold">Trello</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Equipo grande que quiere todo en uno y no le importa la nube</td>
                  <td className="py-2 font-semibold">ClickUp</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Quiero la flexibilidad de Notion pero con datos locales cifrados</td>
                  <td className="py-2 font-semibold">Anytype</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Organizo conocimiento personal con objetos tipados</td>
                  <td className="py-2 font-semibold">Capacities</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Quiero self-hosting open source puro</td>
                  <td className="py-2 font-semibold">AppFlowy</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                No hay una "mejor" alternativa a Notion en abstracto: la elección
                depende de qué te frustra de Notion y qué priorizas.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Si lo que te empuja a salir es la <strong>privacidad, el precio o la dependencia de la nube</strong>,
                  las opciones serias son pocas: <strong>Hito, Obsidian, Anytype y AppFlowy</strong>.
                </li>
                <li>
                  De esas cuatro, solo <strong>Hito</strong> combina privacidad
                  local-first, open source real (MIT), IA con datos propios y un
                  modelo gratis sin trampa ni upsells. Para proyectos, procesos y
                  tareas con datos sensibles, es la opción más directa.
                </li>
              </ul>
              <p>
                La mejor forma de decidir es probar. Hito se instala en segundos,
                sin cuenta, y tus proyectos se guardan localmente (el asistente IA
                es opcional y tú controlas la API key).
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Privacidad total, IA con datos propios. Sin
                cuenta, sin nube, sin suscripción.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "migrar-trello-a-hito",
    title: "Cómo migrar de Trello a Hito (guía honesta, paso a paso)",
    excerpt:
      "Guía honesta para migrar de Trello a Hito: tabla de mapeo verificada, paso a paso y qué hacer con los datos sin equivalente directo. Sin promesas falsas.",
    category: "implementacion",
    categoryLabel: "Implementación",
    publishedAt: "2026-08-03",
    readingTime: "9 min",
    featured: false,
    seo: {
      title: "Cómo migrar de Trello a Hito (guía honesta, paso a paso) — Hito",
      description:
        "Guía honesta para migrar de Trello a Hito: tabla de mapeo verificada, paso a paso y qué hacer con los datos sin equivalente directo. Sin promesas falsas.",
      ogImageAlt: "Migración de Trello a Hito paso a paso.",
    },
    content: {
      eyebrow: "Implementación",
      intro: (
        <>
          <strong>En una línea:</strong> Hito no tiene import automático desde
          Trello (todavía). La migración es manual: exportas tu board de Trello
          como JSON de referencia y lo reconstruyes en Hito aprovechando su
          modelo de datos más estructurado. Aquí está el mapeo campo a campo y el
          paso a paso.
        </>
      ),
      sections: [
        {
          heading: "Antes de empezar: no hay botón mágico (aún)",
          body: (
            <>
              <p>
                Si has llegado hasta aquí, probablemente ya te has decidido por
                Hito (quizás desde nuestra comparativa{" "}
                <a href="https://hito.autos/blogs/hito-vs-trello" target="_blank" rel="noopener noreferrer">
                  Hito vs Trello
                </a>{" "}
                o desde el post de{" "}
                <a href="https://hito.autos/blogs/alternativas-a-notion" target="_blank" rel="noopener noreferrer">
                  alternativas a Notion
                </a>
                ). Ahora viene la parte práctica: ¿cómo llevo mis boards de Trello
                sin perder datos?
              </p>
              <p>
                Vamos a ser honestos desde el primer segundo para que no pierdas
                tiempo buscando algo que no existe.
              </p>
              <p>
                Hito <strong>no tiene función nativa de import desde Trello</strong>.
                Lo decimos claro porque preferimos que lo sepas antes de empezar,
                y no después de media hora buscando en menús.
              </p>
              <p>
                ¿Por qué no existe? Principalmente porque el modelo de datos de
                Hito es más estructurado que el de Trello. Trello esencialmente
                tiene boards → listas → tarjetas, con libertad total. Hito tiene
                productos → proyectos → áreas → procesos (SOPs), checklists y
                tareas con estados y prioridades fijas. Un mapeo automático
                tendría que adivinar mucho: ¿esta lista de Trello es un estado o
                un área? ¿estos miembros son personas o roles? Esas decisiones
                las tomas mejor tú, que conoces tu board.
              </p>
              <p>
                La buena noticia: la migración manual es una{" "}
                <strong>oportunidad para limpiar y reorganizar</strong> boards que
                probablemente acumularon basura con los años. Y la tabla de mapeo
                de abajo hace el trabajo predecible.
              </p>
            </>
          ),
        },
        {
          heading: "Paso 0: exporta tu board de Trello",
          body: (
            <>
              <p>
                Antes de tocar Hito, genera una referencia exportable de tu board
                de Trello. Este paso es de Trello, no de Hito:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>Abre el board en Trello.</li>
                <li>
                  Menú (⋯) → <strong>Print, export, and share</strong>.
                </li>
                <li>
                  Elige <strong>Export as JSON</strong> (no el CSV de pagos; el
                  JSON trae todo: cards, labels, checklists, members, comments).
                </li>
              </ol>
              <p>
                Guarda el archivo <code>.json</code>. Lo vas a usar como guía
                visual mientras reconstruyes el board en Hito.
              </p>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                ℹ️ Solo el propietario del board o un admin puede exportar el JSON
                completo. Si no ves la opción, pedile permisos al owner.
              </blockquote>
            </>
          ),
        },
        {
          heading: "La tabla de mapeo: cada elemento de Trello → su equivalente en Hito",
          body: (
            <>
              <p>
                Este es el corazón de la migración. Lo verificamos contra el
                modelo de datos actual de Hito:
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">En Trello</th>
                    <th className="py-2 pr-4 font-semibold">En Hito</th>
                    <th className="py-2 font-semibold">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Board</td>
                    <td className="py-2 pr-4">Proyecto</td>
                    <td className="py-2">Un board = un proyecto. Si tienes varios boards relacionados, agrúpalos bajo un mismo Producto.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">List</td>
                    <td className="py-2 pr-4">Task.status</td>
                    <td className="py-2">Trello permite listas libres; Hito tiene <strong>4 estados fijos</strong>: <code>todo</code>, <code>doing</code>, <code>blocked</code>, <code>done</code>. Mapea tus listas al estado más cercano.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Card</td>
                    <td className="py-2 pr-4">Task</td>
                    <td className="py-2">Migra título y descripción.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Due date</td>
                    <td className="py-2 pr-4">Task.dueDate</td>
                    <td className="py-2">En Hito es fecha (<code>YYYY-MM-DD</code>), sin hora.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Label</td>
                    <td className="py-2 pr-4">Task.tags</td>
                    <td className="py-2">En Hito son strings libres (sin color propio).</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Checklist (dentro de card)</td>
                    <td className="py-2 pr-4">ChecklistItem en un Checklist bajo un Área, <strong>o</strong> Subtask dentro de la Task</td>
                    <td className="py-2">Dos opciones según cómo quieras modelarlo.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Member</td>
                    <td className="py-2 pr-4">Person + Task.assigneeId</td>
                    <td className="py-2">En Hito creas personas y las asignas por id.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Comment</td>
                    <td className="py-2 pr-4">Task.comments</td>
                    <td className="py-2">Compatibles.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Attachment</td>
                    <td className="py-2 pr-4">Sin equivalente directo</td>
                    <td className="py-2">No soportado en el schema actual. Alternativa: deja el link en la descripción de la tarea.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Custom fields</td>
                    <td className="py-2 pr-4">Sin equivalente directo</td>
                    <td className="py-2">Alternativa: usa <code>tags</code> o registra el dato en la descripción.</td>
                  </tr>
                </tbody>
              </table>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                <strong>Resumen de qué se pierde o hay que adaptar:</strong>{" "}
                attachments y custom fields. Todo lo demás tiene mapeo directo.
              </blockquote>
            </>
          ),
        },
        {
          heading: "Paso a paso de la migración",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 1 — Abre Hito y elige dónde guardar tus datos
              </h3>
              <p>
                Instala Hito desde{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  hito.autos
                </a>
                . En el primer arranque, te va a pedir una carpeta local donde
                guardar el workspace. Esa carpeta va a contener archivos{" "}
                <code>.json</code> legibles — uno por cada entidad (proyectos,
                tareas, checklists, etc.).
              </p>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                💡 Elige una carpeta de Dropbox, Google Drive o un repo Git si
                quieres sincronizar o versionar después. Tus datos siguen siendo
                locales; la sincronización la controlas tú.
              </blockquote>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 2 — Crea un Producto (opcional) y un Proyecto
              </h3>
              <p>
                Si tu board de Trello pertenece a una línea de trabajo más amplia
                (un cliente, un producto, un área de negocio), crea primero un{" "}
                <strong>Producto</strong> que agrupe varios proyectos. Si migras
                un único board, puedes saltarte el producto y crear directamente
                el <strong>Proyecto</strong> con el nombre de tu board.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 3 — Define tus Áreas dentro del Proyecto
              </h3>
              <p>
                Las áreas son agrupaciones dentro de un proyecto (ej. "Diseño",
                "Backend", "Reuniones", "Inbox"). Mapean naturalmente con las
                listas "temáticas" de Trello — esas que no son estados sino
                categorías.
              </p>
              <p>
                Si tu board de Trello usaba listas solo como estados (Por hacer /
                En progreso / Hecho), puedes dejar un área única o crear áreas por
                tipo de trabajo.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 4 — Migra las tarjetas como Tareas
              </h3>
              <p>
                Para cada tarjeta de tu board de Trello (puedes verlas en el JSON
                exportado), crea una <strong>Tarea</strong> en Hito con:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <code>title</code>: el nombre de la tarjeta.
                </li>
                <li>
                  <code>description</code>: el contenido de la tarjeta.
                </li>
                <li>
                  <code>status</code>: el estado correspondiente a la lista
                  original (<code>todo</code>, <code>doing</code>,{" "}
                  <code>blocked</code>, <code>done</code>).
                </li>
                <li>
                  <code>dueDate</code>: si la tarjeta tenía fecha límite, en
                  formato <code>YYYY-MM-DD</code>.
                </li>
                <li>
                  <code>tags</code>: las labels de Trello, como strings.
                </li>
                <li>
                  <code>assigneeId</code>: si había miembros, crea primero las{" "}
                  <strong>Personas</strong> en Hito y asígnalas por id.
                </li>
              </ul>
              <p>
                Es trabajo manual, sí. Pero si tu board tiene menos de 100
                tarjetas, son 30–60 minutos de reconstrucción enfocada.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 5 — Migra los checklists
              </h3>
              <p>
                Trello permite checklists dentro de tarjetas. En Hito tienes dos
                lugares donde ponerlos:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Subtasks dentro de la propia tarea</strong> — si el
                  checklist es parte del trabajo de esa tarea específica.
                </li>
                <li>
                  <strong>Checklist bajo un Área</strong> — si el checklist es un
                  proceso recurrente (ej. "Checklist de deploy", "Revisión QA").
                </li>
              </ul>
              <p>
                Elige según el caso. Para checklists de tipo "pasos de esta
                tarjeta", subtasks es lo más natural.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Paso 6 — Haz un respaldo con exportAll
              </h3>
              <p>
                Una vez que terminaste la migración, usa la función de{" "}
                <strong>export JSON nativa de Hito</strong> (disponible en la app)
                para generar un backup completo de tu workspace. Este JSON sí es
                producido por Hito, así que vas a poder importarlo de vuelta cuando
                quieras restaurar o mover el workspace a otra máquina.
              </p>
              <p>
                Hacer este respaldo después de migrar te da una red de seguridad:
                si algo se rompe o quieres volver a este punto, tienes un snapshot
                limpio.
              </p>
            </>
          ),
        },
        {
          heading: "Trucos para no perder datos",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                ¿Qué hago con los attachments?
              </h3>
              <p>
                El schema actual de Hito no soporta attachments. Tres opciones:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Linkealos en la descripción</strong> de la tarea (URL al
                  documento en Drive, Notion, Figma, etc.).
                </li>
                <li>
                  <strong>Centralizalos en una carpeta compartida</strong> y
                  referenciala en una tarea pinned.
                </li>
                <li>
                  <strong>Espera</strong> — los attachments están en consideración
                  para futuras versiones del modelo.
                </li>
              </ol>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                ¿Qué hago con los custom fields?
              </h3>
              <p>
                Los custom fields de Trello (Business Class) tampoco tienen
                equivalente directo. Opciones:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>Migra los valores importantes a <code>tags</code>.</li>
                <li>
                  Si eran datos estructurados (fecha, número), regístralos en la
                  descripción.
                </li>
                <li>
                  Si eran campos críticos de proceso, considera modelarlos como un{" "}
                  <strong>Proceso/SOP</strong> con pasos formales.
                </li>
              </ol>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                ¿Y los miembros de varios equipos?
              </h3>
              <p>
                En Hito, las personas se modelan con la entidad <strong>Person</strong>{" "}
                y se asignan a tareas con <code>assigneeId</code>. Si tu board
                tenía 5 miembros, crea esas 5 personas en Hito y asígnalas a las
                tareas correspondientes. Para equipos grandes, esto se convierte en
                la parte más tediosa — pero se hace una sola vez.
              </p>
            </>
          ),
        },
        {
          heading: "Una vez migrado: respalda, sincroniza, versiona",
          body: (
            <>
              <p>
                Hito guarda todo como archivos <code>.json</code> legibles en la
                carpeta que elegiste. Esto te da tres superpoderes que Trello no
                tenía:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Backup manual</strong> con el export JSON nativo.
                </li>
                <li>
                  <strong>Sincronización</strong> vía Dropbox, Google Drive o
                  cualquier servicio que sincronice carpetas.
                </li>
                <li>
                  <strong>Versionado</strong> con Git: como cada entidad es un
                  archivo <code>.json</code> de texto, puedes inicializar un repo
                  en esa carpeta y tener historial completo de cambios en tus
                  proyectos. Una guía dedicada a esto viene próximamente.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Migrar de Trello a Hito no es instantáneo, pero es predecible. Sin
                import automático, el trabajo manual te obliga a tomar decisiones
                que un mapeo automático habría tomado mal: qué es un área, qué es
                un estado, qué checklists son procesos recurrentes. El resultado
                suele ser un workspace más limpio y mejor organizado que el board
                original.
              </p>
              <p>
                La tabla de mapeo y los seis pasos de arriba son todo lo que
                necesitas. Y una vez migrado, el modelo local-first te devuelve
                control del almacenamiento: backups cuando quieras, sincronización
                donde quieras, y proyectos que viven en tu equipo (sin backend; el
                asistente IA es opcional y tú controlas la API key).
              </p>
              <p>¿Listo para empezar?</p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Sin cuenta, sin nube, sin suscripción.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "que-es-mcp",
    title: "Qué es MCP (Model Context Protocol): guía simple y honesta",
    excerpt:
      "MCP explicado sin hype: qué es, para qué sirve y en qué se diferencia de function calling y RAG. Con un ejemplo real.",
    category: "inteligencia-artificial",
    categoryLabel: "Inteligencia artificial",
    publishedAt: "2026-08-10",
    readingTime: "9 min",
    featured: false,
    seo: {
      title: "Qué es MCP (Model Context Protocol): la guía simple y honesta — Hito",
      description:
        "MCP explicado sin hype: qué es, para qué sirve y en qué se diferencia de function calling y RAG. Con un ejemplo real.",
      ogImageAlt: "Qué es MCP (Model Context Protocol).",
    },
    content: {
      eyebrow: "Inteligencia artificial",
      intro: (
        <>
          <strong>En una línea:</strong> MCP (Model Context Protocol) es un
          estándar abierto creado por Anthropic en 2024 para que los LLMs se
          conecten a fuentes externas (archivos, bases de datos, APIs, apps) con
          un formato común. Se lo describe como el "USB-C de la IA": cualquier
          cliente (Claude, Cursor, IDEs) puede hablar con cualquier servidor MCP
          usando el mismo protocolo. No reemplaza a function calling ni a RAG; los
          complementa.
        </>
      ),
      sections: [
        {
          heading: "¿De dónde viene MCP?",
          body: (
            <>
              <p>
                MCP fue anunciado por{" "}
                <a href="https://www.anthropic.com/news/model-context-protocol" target="_blank" rel="noopener noreferrer">
                  Anthropic en noviembre de 2024
                </a>{" "}
                como un estándar abierto para conectar modelos de lenguaje con
                fuentes de datos externas. La especificación es pública y está en{" "}
                <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
                  modelcontextprotocol.io
                </a>
                .
              </p>
              <p>
                Desde su lanzamiento fue adoptado por un ecosistema creciente:
                Claude Desktop, Cursor, Zed, Sourcegraph, Replit, Cline y muchos
                otros clientes y servidores comunitarios. Hoy existen cientos de
                servidores MCP públicos (para GitHub, Slack, Postgres, Google
                Drive, Jira, etc.).
              </p>
            </>
          ),
        },
        {
          heading: 'El "USB-C de la IA": ¿qué problema resuelve?',
          body: (
            <>
              <p>
                Antes de MCP, cada integración entre un LLM y una herramienta era
                un desarrollo custom. Si querías que Claude leyera tu GitHub, había
                que escribir código específico. Si querías que Cursor leyera tu
                Postgres, otro código distinto. Cada cliente × cada herramienta =
                una integración diferente.
              </p>
              <p>MCP estandariza eso con dos piezas:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Servidor MCP:</strong> programa que expone capacidades
                  (tools, recursos, prompts) en un formato común.
                </li>
                <li>
                  <strong>Cliente MCP:</strong> cualquier aplicación con un LLM
                  (Claude, Cursor, tu propio agente) que sabe cómo hablar con
                  servidores MCP.
                </li>
              </ul>
              <p>
                Es exactamente la metáfora del USB-C: cualquier dispositivo con
                puerto USB-C se conecta con cualquier cable USB-C. Cualquier
                cliente MCP se conecta con cualquier servidor MCP.
              </p>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                💡 La diferencia clave con las integraciones custom: el cliente no
                necesita saber nada específico del servidor. Descubre sus
                capacidades al vuelo. Un cliente puede conectarse a un servidor MCP
                que se creó después que él, sin actualizar nada.
              </blockquote>
            </>
          ),
        },
        {
          heading: "MCP vs Function Calling vs RAG",
          body: (
            <>
              <p>
                Esta es la tabla que más gente busca. Los tres conceptos se
                confunden todo el tiempo porque los tres conectan LLMs con datos
                externos, pero resuelven problemas distintos.
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold"></th>
                    <th className="py-2 pr-4 font-semibold">Function Calling</th>
                    <th className="py-2 pr-4 font-semibold">RAG</th>
                    <th className="py-2 font-semibold">MCP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Qué es</td>
                    <td className="py-2 pr-4">Capacidad del LLM de invocar funciones predefinidas en respuesta a un prompt</td>
                    <td className="py-2 pr-4">Técnica para recuperar documentos relevantes e inyectarlos en el contexto del prompt</td>
                    <td className="py-2">Protocolo estándar para que LLMs se conecten a fuentes externas</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Qué resuelve</td>
                    <td className="py-2 pr-4">¿Cómo hace el LLM para <em>hacer</em> cosas (crear tarea, leer DB, enviar email)?</td>
                    <td className="py-2 pr-4">¿Cómo hace el LLM para <em>saber</em> cosas que no estaban en su entrenamiento?</td>
                    <td className="py-2">¿Cómo se estandariza la conexión LLM ↔ fuente de datos?</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Nivel</td>
                    <td className="py-2 pr-4">Capacidad del modelo</td>
                    <td className="py-2 pr-4">Patrón de arquitectura</td>
                    <td className="py-2">Protocolo de interoperabilidad</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Ejemplo</td>
                    <td className="py-2 pr-4">"Llama a <code>create_task(title='x')</code> cuando el usuario pida crear una tarea"</td>
                    <td className="py-2 pr-4">"Antes de responder, busca los 5 documentos más parecidos a la pregunta e inclúyelos en el prompt"</td>
                    <td className="py-2">"Cualquier agente puede leer mi GitHub si expongo un servidor MCP"</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">¿Reemplaza a los otros?</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">No</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Los tres son <strong>complementarios</strong>, no excluyentes. Un
                buen agente moderno combina los tres.
              </p>
            </>
          ),
        },
        {
          heading: "Anatomía de MCP: servers, clients y transports",
          body: (
            <>
              <p>
                Para entender MCP en concreto, hace falta conocer tres piezas:
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Servidor MCP
              </h3>
              <p>
                Programa que expone capacidades en formato estándar. Típicamente
                expone:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Tools:</strong> funciones que el LLM puede invocar (ej.{" "}
                  <code>create_issue</code>, <code>search_emails</code>,{" "}
                  <code>get_repo_status</code>).
                </li>
                <li>
                  <strong>Resources:</strong> datos que el LLM puede leer (ej.
                  contenido de un archivo, registro de una DB).
                </li>
                <li>
                  <strong>Prompts:</strong> plantillas de prompt predefinidas.
                </li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Cliente MCP
              </h3>
              <p>
                Aplicación con un LLM que sabe hablar el protocolo. Descubre las
                capacidades del servidor al conectarse y las ofrece al modelo.
                Ejemplos: Claude Desktop, Cursor, Cline, o tu propio agente custom.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Transport
              </h3>
              <p>Cómo se comunican cliente y servidor por la red. Los dos principales:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>stdio:</strong> el servidor es un proceso que el cliente
                  lanza y con el que habla por entrada/salida estándar. Útil para
                  servidores locales (ej. uno que lee archivos de tu máquina).
                </li>
                <li>
                  <strong>HTTP + SSE / Streamable HTTP:</strong> el servidor es un
                  servicio remoto al que el cliente se conecta por HTTP. Útil para
                  servidores compartidos o en la nube.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Un ejemplo concreto: cómo usa MCP Hito",
          body: (
            <>
              <p>
                Para que no quede en teoría, veamos cómo se implementa en{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  Hito
                </a>
                , un gestor de proyectos local-first con asistente IA. Hito combina{" "}
                <strong>las tres tecnologías</strong> que vimos arriba, cada una en
                su papel.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                1. Function calling nativo (lo que usa el asistente dentro de la app)
              </h3>
              <p>
                El asistente IA de Hito, dentro de la aplicación,{" "}
                <strong>no usa MCP para funcionar</strong>. Usa function calling
                nativo de Gemini sobre unas 40 herramientas (tools) custom,
                definidas con schemas Zod y convertidas a{" "}
                <code>FunctionDeclaration</code> de Gemini. Algunas de esas tools
                son:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <code>create_task</code>, <code>update_task</code>,{" "}
                  <code>list_tasks</code> — manejo de tareas.
                </li>
                <li>
                  <code>get_project</code>, <code>list_projects</code>,{" "}
                  <code>summarize_project_health</code> — lectura de proyectos.
                </li>
                <li>
                  <code>add_area</code>, <code>update_area</code> — gestión de
                  áreas.
                </li>
                <li>
                  <code>create_checklist_template</code>,{" "}
                  <code>apply_type_to_project</code> — operaciones compuestas.
                </li>
                <li>
                  <code>semantic_search</code> — búsqueda semántica (esta tool
                  dispara el RAG que veremos abajo).
                </li>
              </ul>
              <p>
                El propio código llama a esta capa "estilo MCP" (MCP-style) porque
                replica las ideas de MCP (tools con schemas, separación
                read/write), pero no usa el SDK oficial de MCP. Es una
                implementación directa sobre Gemini.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                2. RAG local (para contexto semántico)
              </h3>
              <p>
                Cuando activas el asistente y tu workspace está indexado, antes de
                cada turno se ejecuta una búsqueda semántica sobre tus proyectos,
                tareas, checklists y personas. Los 5 resultados más relevantes se
                inyectan en el prompt para darle contexto al modelo.
              </p>
              <p>Implementación verificada en el repo:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Embeddings:</strong> generados con{" "}
                  <code>gemini-embedding-001</code> (de Google).
                </li>
                <li>
                  <strong>Vector store:</strong> no hay base de datos vectorial
                  externa. Los embeddings se guardan en <strong>IndexedDB del navegador</strong>.
                </li>
                <li>
                  <strong>Similitud:</strong> cosine similarity calculada en
                  JavaScript puro, en el cliente. Búsqueda lineal, sin ANN.
                </li>
                <li>
                  <strong>Indexación:</strong> manual, la dispara el usuario desde
                  Ajustes.
                </li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                3. Servidor MCP oficial (para interoperabilidad externa)
              </h3>
              <p>
                Además de la capa interna, Hito expone un <strong>servidor MCP real</strong>{" "}
                usando el SDK oficial <code>@modelcontextprotocol/sdk</code> con
                transporte stdio. Es decir: cualquier cliente MCP externo (Claude
                Desktop, Cursor, etc.) puede conectarse a Hito y leer su workspace
                como si fuera otra fuente de datos.
              </p>
              <p>
                El servidor MCP standalone hoy es <strong>read-only con fixtures de ejemplo</strong>.
                No es el camino que usa el chat de la app; está pensado para que
                terceros integren Hito en sus propios agentes en el futuro.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Por qué esta separación importa
              </h3>
              <p>La distinción no es académica. Tiene consecuencias prácticas:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Dentro de la app</strong>, function calling directo es
                  más simple y rápido que levantar un servidor MCP. No hay overhead
                  de protocolo.
                </li>
                <li>
                  <strong>Hacia afuera</strong>, MCP permite que otros agentes
                  (Claude, Cursor, lo que sea) lean tus proyectos de Hito sin que
                  Hito tenga que integrarse con cada uno.
                </li>
                <li>
                  <strong>RAG</strong> agrega entendimiento semántico que ni
                  function calling ni MCP dan por sí solos.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Una nota honesta sobre privacidad",
          body: (
            <>
              <p>
                Hito es local-first: tus proyectos viven en archivos{" "}
                <code>.json</code> en tu equipo, sin backend. Pero cuando
                interactúas con el asistente IA, el contenido relevante de tu
                workspace viaja a la API de Gemini (Google) — incluyendo el system
                prompt con el índice de tus proyectos, los resultados del RAG
                semántico y las respuestas de las tools de lectura que el modelo
                invoque.
              </p>
              <p>
                Tú traes tu propia API key de Google AI Studio, así que controlas
                qué modelo usas. Pero si trabajas con datos extremadamente
                sensibles, puedes simplemente no activar el asistente: el resto de
                Hito funciona 100% local, sin que un solo byte salga de tu equipo.
              </p>
              <p>
                Esta precisión importa más que cualquier claim exagerado de
                marketing. Si tu caso de uso no tolera que los datos viajen a
                Google, no actives el asistente. Si lo tolera, el asistente es muy
                útil.
              </p>
            </>
          ),
        },
        {
          heading: "¿Te debería importar MCP?",
          body: (
            <>
              <p>Depende de tu perfil:</p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Perfil</th>
                    <th className="py-2 font-semibold">¿MCP te importa?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Desarrollador que construye agentes / integra LLMs</td>
                    <td className="py-2">Sí, mucho. MCP es el estándar emergente para no escribir integraciones custom para cada herramienta.</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Usuario final de productos con IA</td>
                    <td className="py-2">Indirectamente. MCP hace que las herramientas que usas sean más interoperables, pero no vas a tocar el protocolo directamente.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Equipo que evalúa herramientas con IA</td>
                    <td className="py-2">Poco. Lo que te importa es qué puede hacer el asistente y qué pasa con tus datos, no el protocolo subyacente.</td>
                  </tr>
                </tbody>
              </table>
              <p>
                La pregunta correcta para la mayoría no es "¿uso MCP?" sino "¿las
                herramientas que uso se integran bien con mi stack?". MCP es una
                respuesta técnica a esa pregunta, no la pregunta misma.
              </p>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                MCP es un protocolo de interoperabilidad que resuelve un problema
                real (cómo se conectan los LLMs con fuentes externas sin
                integraciones custom de a una). No es magia, no reemplaza a
                function calling ni a RAG, y no te va a cambiar la vida como
                usuario final. Pero para quien construye agentes, es probable que
                se convierta en el estándar por defecto en los próximos años.
              </p>
              <p>
                Si quieres ver cómo se combinan las tres tecnologías — function
                calling, RAG local y un servidor MCP — en un gestor de proyectos
                real y open source,{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  prueba Hito
                </a>
                . Sin cuenta, sin nube (para el storage), y con un asistente IA que
                tú controlas con tu propia API key.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "local-first-guia-definitiva-2026",
    title: "Local-first: la guía definitiva (2026)",
    excerpt:
      "Descubre qué es el software local-first, cómo se diferencia de la nube y qué herramientas puedes usar hoy. Guía honesta con ejemplos reales.",
    category: "privacidad",
    categoryLabel: "Privacidad",
    publishedAt: "2026-08-17",
    readingTime: "10 min",
    featured: false,
    seo: {
      title: "Local-first: qué es y cómo funciona en 2026 — Hito",
      description:
        "Descubre qué es el software local-first, cómo se diferencia de la nube y qué herramientas puedes usar hoy. Guía honesta con ejemplos reales.",
      ogImageAlt: "Guía definitiva de software local-first en 2026.",
    },
    content: {
      eyebrow: "Privacidad",
      intro: (
        <>
          <strong>En una línea:</strong> el software <em>local-first</em> guarda
          tus datos en tu dispositivo, no en un servidor. Funciona sin internet,
          no necesita cuenta y tú eres dueño de lo que creas. Pero no es magia:
          tiene trade-offs reales que conviene entender antes de migrar.
        </>
      ),
      sections: [
        {
          heading: "¿Qué es local-first?",
          body: (
            <>
              <p>
                El término nació en 2019, cuando el laboratorio de investigación{" "}
                <strong>Ink &amp; Switch</strong> publicó un ensayo fundacional
                titulado <em>"Local-first software: You own your data, in spite of the cloud"</em>.
                Los autores — incluyendo a Martin Kleppmann, investigador de la
                Universidad de Cambridge — propusieron un conjunto de principios
                para software colaborativo donde{" "}
                <strong>el dispositivo del usuario es la fuente de verdad</strong>,
                no un servidor remoto.
              </p>
              <p>Los 7 principios del ensayo original (resumidos):</p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">#</th>
                    <th className="py-2 pr-4 font-semibold">Principio</th>
                    <th className="py-2 font-semibold">Qué significa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">1</td>
                    <td className="py-2 pr-4 font-medium">Tus datos están en tu dispositivo</td>
                    <td className="py-2">El archivo real vive localmente, no es una caché de la nube</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">2</td>
                    <td className="py-2 pr-4 font-medium">Funciona offline, sin advertencias</td>
                    <td className="py-2">No necesitas conexión para leer, escribir o editar</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">3</td>
                    <td className="py-2 pr-4 font-medium">Permanencia local</td>
                    <td className="py-2">Si la empresa cierra, tus datos siguen en tu disco</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">4</td>
                    <td className="py-2 pr-4 font-medium">Sin vendor lock-in</td>
                    <td className="py-2">Los datos están en formatos abiertos o legibles, no atrapados en un servidor propietario</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">5</td>
                    <td className="py-2 pr-4 font-medium">Colaboración cuando la hay</td>
                    <td className="py-2">Si quieres sincronización, es opcional — no obligatoria ni centralizada</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">6</td>
                    <td className="py-2 pr-4 font-medium">Rendimiento instantáneo</td>
                    <td className="py-2">Leer y escribir en disco local es más rápido que hacer roundtrips a un servidor</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">7</td>
                    <td className="py-2 pr-4 font-medium">Facilidad de uso</td>
                    <td className="py-2">La experiencia no debería ser peor que la de una app de nube</td>
                  </tr>
                </tbody>
              </table>
              <blockquote className="border-l-2 border-border/60 pl-4 italic">
                <strong>Fuente:</strong> Ink &amp; Switch,{" "}
                <em>"Local-first software: You own your data, in spite of the cloud"</em>{" "}
                (2019). Disponible en{" "}
                <a href="https://www.inkandswitch.com/essay/local-first/" target="_blank" rel="noopener noreferrer">
                  inkandswitch.com/essay/local-first
                </a>
                .
              </blockquote>
              <p>
                La idea no es nueva — los documentos de escritorio siempre fueron
                locales. Lo que cambió es que ahora existe la tecnología para tener{" "}
                <strong>software colaborativo que también es local</strong>. Eso
                incluye CRDTs (tipos de datos replicados sin conflictos), sync
                engines y APIs modernas de acceso al filesystem del navegador.
              </p>
            </>
          ),
        },
        {
          heading: "Local-first vs cloud-first vs offline-first",
          body: (
            <>
              <p>
                Estos tres términos suenan parecidos pero describen arquitecturas
                distintas. Esta es la diferencia:
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Aspecto</th>
                    <th className="py-2 pr-4 font-semibold">Cloud-first</th>
                    <th className="py-2 pr-4 font-semibold">Offline-first</th>
                    <th className="py-2 font-semibold">Local-first</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Fuente de verdad</td>
                    <td className="py-2 pr-4">El servidor</td>
                    <td className="py-2 pr-4">El servidor (caché local temporal)</td>
                    <td className="py-2">Tu dispositivo</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Sin internet</td>
                    <td className="py-2 pr-4">No funciona</td>
                    <td className="py-2 pr-4">Funciona parcialmente (caché)</td>
                    <td className="py-2">Funciona completo</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Si la empresa cierra</td>
                    <td className="py-2 pr-4">Pierdes todo</td>
                    <td className="py-2 pr-4">Pierdes todo (sin servidor)</td>
                    <td className="py-2">Tus datos siguen</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Colaboración</td>
                    <td className="py-2 pr-4">Nativa (tiempo real)</td>
                    <td className="py-2 pr-4">Se sincroniza al reconectar</td>
                    <td className="py-2">Opcional, sin servidor central</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Cuenta requerida</td>
                    <td className="py-2 pr-4">Sí</td>
                    <td className="py-2 pr-4">Sí</td>
                    <td className="py-2">No</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Ejemplo típico</td>
                    <td className="py-2 pr-4">Google Docs, Trello, Notion</td>
                    <td className="py-2 pr-4">Progresivas web apps con service worker</td>
                    <td className="py-2">Obsidian, Joplin, Hito</td>
                  </tr>
                </tbody>
              </table>
              <p>
                La diferencia clave: <strong>offline-first sigue teniendo un servidor como dueño de los datos</strong>.
                El modo offline es una caché temporal. En cambio, local-first
                invierte la relación: el servidor (si existe) es un espejo, no el
                original.
              </p>
            </>
          ),
        },
        {
          heading: "El estado del movimiento en 2026",
          body: (
            <>
              <p>
                Siete años después del ensayo de Ink &amp; Switch, el local-first
                pasó de ser una idea académica a un ecosistema con herramientas
                reales, conferencias dedicadas y librerías maduras.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Señales de adopción
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>FOSDEM 2026</strong> incluye un devroom completo
                  dedicado a local-first, CRDTs y sync engines — un espacio que
                  compite con temas como Rust y WebAssembly.
                </li>
                <li>
                  <strong>Smashing Magazine</strong> publicó en mayo 2026 un
                  artículo sobre la arquitectura local-first en desarrollo web,
                  con una perspectiva honesta: funciona, pero tiene{" "}
                  <a href="https://www.smashingmagazine.com/2026/05/architecture-local-first-web-development/" target="_blank" rel="noopener noreferrer">
                    trade-offs reales
                  </a>{" "}
                  que la mayoría de tutoriales ignoran.
                </li>
                <li>
                  Librerías como <strong>Automerge</strong> y <strong>Yjs</strong>{" "}
                  son estables y se usan en producción en herramientas como Notion
                  (internamente), Logseq y Zed.
                </li>
                <li>
                  Múltiples sync engines compiten por ser el{" "}
                  <em>"Firebase de local-first"</em> — algunos open source
                  (PowerSync, Electric), otros propietarios.
                </li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Lo que todavía duele
              </h3>
              <p>La comunidad es honesta sobre los problemas:</p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Colaboración en tiempo real es difícil.</strong> Los
                  CRDTs resuelven conflictos de edición, pero la experiencia de
                  ver a otro cursor moverse en tiempo real es más compleja que con
                  un servidor central.
                </li>
                <li>
                  <strong>Mobile tiene limitaciones.</strong> La File System
                  Access API de Chrome no funciona en iOS Safari. Las apps nativas
                  lo resuelven mejor que las PWAs.
                </li>
                <li>
                  <strong>Backup sigue siendo tu responsabilidad.</strong> Si tu
                  disco se rompe y no tenías un backup, los datos se pierden. La
                  nube resolvía esto "gratis".
                </li>
              </ol>
            </>
          ),
        },
        {
          heading: "Herramientas local-first que existen hoy",
          body: (
            <>
              <p>
                No es un concepto teórico. Hay herramientas de producción que
                funcionan así:
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Herramienta</th>
                    <th className="py-2 pr-4 font-semibold">Tipo</th>
                    <th className="py-2 pr-4 font-semibold">Local-first real?</th>
                    <th className="py-2 font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Hito</td>
                    <td className="py-2 pr-4">Gestión de proyectos</td>
                    <td className="py-2 pr-4">✅ Sí</td>
                    <td className="py-2">JSON local, sin backend, PWA offline</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Obsidian</td>
                    <td className="py-2 pr-4">Notas / knowledge base</td>
                    <td className="py-2 pr-4">✅ Sí</td>
                    <td className="py-2">Archivos Markdown en disco, plugins opcionales</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Anytype</td>
                    <td className="py-2 pr-4">Todo (notion-like)</td>
                    <td className="py-2 pr-4">⚠️ Parcial</td>
                    <td className="py-2">Local-first pero <em>source-available</em>, no open source</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Logseq</td>
                    <td className="py-2 pr-4">Notas outliner</td>
                    <td className="py-2 pr-4">✅ Sí</td>
                    <td className="py-2">Archivos org-mode local, sync opcional</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Joplin</td>
                    <td className="py-2 pr-4">Notas</td>
                    <td className="py-2 pr-4">✅ Sí</td>
                    <td className="py-2">Open source, sync opcional via DropBox/WebDAV</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">AppFlowy</td>
                    <td className="py-2 pr-4">Notion-like</td>
                    <td className="py-2 pr-4">✅ Sí</td>
                    <td className="py-2">Open source (AGPLv3), Flutter nativo</td>
                  </tr>
                </tbody>
              </table>
              <p>
                La mayoría comparte un patrón: guardan tus datos en archivos
                legibles en tu disco, ofrecen sync opcional (sin obligar) y no
                requieren cuenta para usarlos.
              </p>
              <p>
                Si quieres ver comparativas más detalladas de algunas de estas
                herramientas, tenemos posts sobre{" "}
                <a href="https://hito.autos/blogs/alternativas-a-notion" target="_blank" rel="noopener noreferrer">
                  alternativas a Notion
                </a>{" "}
                y{" "}
                <a href="https://hito.autos/blogs/hito-vs-trello" target="_blank" rel="noopener noreferrer">
                  Hito vs Trello
                </a>
                .
              </p>
            </>
          ),
        },
        {
          heading: "Trade-offs honestos: lo que local-first NO resuelve",
          body: (
            <>
              <p>
                Antes de emocionarte (y nosotros somos un proyecto local-first,
                así que nos emociona), hay que ser honesto sobre lo que{" "}
                <strong>no</strong> funciona bien:
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Lo que se pierde
              </h3>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Colaboración en tiempo real fluida.</strong> Si tu
                  equipo necesita editar el mismo documento simultáneamente y ver
                  cambios al instante, un servidor central (Google Docs, Notion) lo
                  hace mejor hoy. Las herramientas local-first están mejorando,
                  pero todavía no es su punto fuerte.
                </li>
                <li>
                  <strong>Setup inicial.</strong> En una app de nube, entras,
                  creas cuenta y listo. En local-first, necesitas elegir dónde
                  guardar tus archivos, configurar sync si quieres colaboración, y
                  planificar backups. Es más fricción inicial.
                </li>
                <li>
                  <strong>Múltiples dispositivos sin sync.</strong> Si trabajas en
                  la PC de la oficina y la laptop de casa sin ningún mecanismo de
                  sincronización, vas a tener versiones desactualizadas. La
                  solución típica es usar Dropbox, Google Drive o Git — pero eso
                  agrega complejidad.
                </li>
                <li>
                  <strong>IA asistida requiere enviar datos.</strong> Esto vale la
                  pena destacarlo porque es un punto de confusión. Si usas un
                  asistente de IA integrado (como el de Hito), tus datos se envían
                  al modelo de IA (en nuestro caso, Gemini, con tu propia API key).
                  El storage sigue siendo local, pero la IA necesita ver tus datos
                  para ayudarte. Es un trade-off consciente: puedes simplemente no
                  activar el asistente si tus datos son extremadamente sensibles.
                  Si quieres entender cómo funciona esto a nivel técnico, tienes
                  nuestro post sobre{" "}
                  <a href="https://hito.autos/blogs/que-es-mcp" target="_blank" rel="noopener noreferrer">
                    Qué es MCP
                  </a>
                  .
                </li>
              </ol>
            </>
          ),
        },
        {
          heading: "Cómo funciona Hito como caso real",
          body: (
            <>
              <p>
                Para que no sea todo teoría, acá va cómo se ve local-first en la
                práctica con Hito:
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Arquitectura de almacenamiento
              </h3>
              <p>
                Hito usa dos adaptadores de almacenamiento, dependiendo de tu
                navegador:
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold">Adaptador</th>
                    <th className="py-2 pr-4 font-semibold">Navegador</th>
                    <th className="py-2 font-semibold">Cómo funciona</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">FileSystemAdapter</td>
                    <td className="py-2 pr-4">Chrome, Edge, Brave</td>
                    <td className="py-2">Usa la File System Access API para leer y escribir archivos JSON directamente en la carpeta que elegiste. Persiste el acceso entre sesiones usando IndexedDB.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">DownloadAdapter</td>
                    <td className="py-2 pr-4">Firefox, Safari, móvil</td>
                    <td className="py-2">Como fallback, descarga archivos JSON individuales y pide que subas archivos cuando quieres cargar. Más manual pero funcional.</td>
                  </tr>
                </tbody>
              </table>
              <p>
                En ambos casos, cada entidad (proyecto, tarea, persona, etc.) es un
                archivo <code>.json</code> separado y legible. No hay una base de
                datos propietaria ni un servidor al que consultar.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Offline
              </h3>
              <p>
                Hito es una <strong>Progressive Web App (PWA)</strong> con service
                worker. Eso significa que la aplicación se instala en tu navegador
                y funciona sin conexión. Tus datos están en disco, no en la nube,
                así que no necesitas internet para crear tareas, mover tarjetas en
                el kanban o editar procesos.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Sync (opcional)
              </h3>
              <p>
                No hay servidor de sync. Si quieres compartir tu workspace con el
                equipo, pones la carpeta en Dropbox, Google Drive o Git, y cada
                persona abre esa misma carpeta con Hito. Es sync a nivel de
                archivos, no a nivel de registros — simple, transparente y sin
                intermediarios.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                IA (opcional)
              </h3>
              <p>
                El asistente usa Gemini con tu propia API key. Si lo activas,
                envía datos de tu workspace a Google para generar respuestas. Si
                no lo activas, Hito nunca se comunica con ningún servidor externo.
              </p>
            </>
          ),
        },
        {
          heading: "¿Te conviene local-first?",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Sí, si:
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Manejas datos sensibles:</strong> información legal,
                  médica, financiera o de clientes que no debería estar en un
                  servidor de terceros.
                </li>
                <li>
                  <strong>Quieres control total sobre tus datos:</strong> no te
                  gusta que una empresa pueda cerrar tu cuenta, cambiar los precios
                  o perder tus datos por un breach.
                </li>
                <li>
                  <strong>Trabajas solo o en equipos pequeños-medianos:</strong> la
                  fricción de sync no es tan grande.
                </li>
                <li>
                  <strong>Valoras el offline:</strong> viajas mucho, trabajas en
                  lugares con mala conexión o simplemente no quieres depender del
                  WiFi.
                </li>
                <li>
                  <strong>Te interesa el open source:</strong> poder auditar el
                  código que maneja tus datos.
                </li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Probablemente no, si:
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Colaboración en tiempo real es crítica:</strong> tu
                  equipo edita documentos simultáneamente y necesita ver cambios al
                  instante (Google Docs sigue siendo mejor para eso).
                </li>
                <li>
                  <strong>No quieres pensar en backups:</strong> si no tienes un
                  hábito de respaldar tus archivos, la nube te da un safety net que
                  local-first no tiene por defecto.
                </li>
                <li>
                  <strong>Tu equipo es grande y distribuido:</strong> sin una
                  estrategia de sync clara, vas a tener problemas de versiones.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                El software local-first no es una vuelta al pasado ni una utopía
                anti-nube. Es un punto intermedio:{" "}
                <strong>tus datos viven en tu dispositivo, pero puedes elegir si y cómo sincronizarlos</strong>.
                En 2026 ya hay herramientas maduras que lo implementan bien, y el
                ecosistema sigue creciendo (FOSDEM, librerías estables, nuevas
                apps).
              </p>
              <p>
                El trade-off es real: ganas privacidad, control y offline, pero
                pierdes algo de la fluidez colaborativa de las apps de nube. Para
                muchos equipos — especialmente los que manejan datos sensibles —
                el intercambio vale la pena.
              </p>
              <p>
                Si quieres probar cómo se siente,{" "}
                <a href="https://hito.autos" target="_blank" rel="noopener noreferrer">
                  Hito es gratis, open source y no necesita cuenta
                </a>
                . Eliges una carpeta, creas tu primer proyecto y listo. Tus datos
                quedan ahí, en tu disco, sin intermediarios.
              </p>
              <p>
                <strong>Sobre Hito:</strong> Gestión de proyectos, procesos y
                checklists 100% local-first. Open source (MIT), sin nube, sin
                cuenta, sin suscripción.{" "}
                <a href="https://hito.autos" target="_blank" rel="noopener noreferrer">
                  <strong>Pruébalo gratis →</strong>
                </a>
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "versionar-proyectos-con-git",
    title: "Cómo versionar proyectos con Git",
    excerpt:
      "Aprende a poner tu gestor de proyectos bajo control de versiones con Git: historial real, diffs legibles y cero dependencia de un servidor ajeno.",
    category: "privacidad",
    categoryLabel: "Privacidad",
    publishedAt: "2026-08-24",
    readingTime: "8 min",
    featured: false,
    seo: {
      title: "Cómo versionar proyectos con Git: guía paso a paso — Hito",
      description:
        "Aprende a poner tu gestor de proyectos bajo control de versiones con Git: historial real, diffs legibles y cero dependencia de un servidor ajeno.",
      ogImageAlt: "Versionar proyectos con Git.",
    },
    content: {
      eyebrow: "Privacidad",
      intro: (
        <>
          <strong>En una línea:</strong> puedes versionar tus proyectos con Git
          si la herramienta que usas guarda los datos como archivos, no como
          filas ocultas en la base de datos de un servidor ajeno. En Hito, cada
          proyecto, tarea y proceso es un archivo <code>.json</code> plano en tu
          carpeta, así que poner tu workspace bajo Git es literalmente{" "}
          <code>git init</code> y un primer commit. Esta guía te muestra los
          pasos exactos.
        </>
      ),
      sections: [
        {
          heading: "El problema: el historial no es tuyo",
          body: (
            <>
              <p>
                Trello, Notion y ClickUp tienen un "historial de actividad", pero
                es un historial que <strong>ellos</strong> controlan. Vive en su
                servidor, en su formato, con la retención que decidan. Si mañana
                cambian los términos, limitan el historial a los últimos 30 días
                en el plan gratis, o simplemente cierran el servicio, tu historial
                de cambios desaparece con ellos.
              </p>
              <p>
                Para equipos técnicos esto es un problema conocido — porque ya
                resolvieron exactamente el mismo problema con el código hace años.
                La respuesta se llama{" "}
                <a href="https://git-scm.com/about" target="_blank" rel="noopener noreferrer">
                  Git
                </a>
                : un sistema de control de versiones distribuido donde el historial
                vive en tu propio disco, no en un servidor de terceros.
              </p>
              <p>
                La pregunta que este post responde es simple:{" "}
                <strong>¿se puede aplicar la misma lógica a la gestión de proyectos?</strong>{" "}
                Sí, pero solo si la herramienta lo permite a nivel de
                arquitectura.
              </p>
            </>
          ),
        },
        {
          heading: "Por qué esto es posible en Hito (y no en la mayoría de herramientas)",
          body: (
            <>
              <p>
                Esto no es una integración de Hito con Git. No hay un botón
                "conectar a GitHub" dentro de la app, y es importante ser honestos
                al respecto. Lo que sí existe es una arquitectura de storage que
                hace que Git funcione de forma natural, sin ningún trabajo extra:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Hito guarda tu workspace como una carpeta de archivos{" "}
                  <code>.json</code> planos, no en una base de datos propietaria.
                </li>
                <li>
                  Cada entidad es su propio archivo: cada proyecto vive en{" "}
                  <code>projects/{"{id}"}.json</code>, cada checklist en{" "}
                  <code>checklist-templates/{"{id}"}.json</code>, y así con cada
                  colección (productos, tipos de proyecto, procesos,
                  automatizaciones, trimestres).
                </li>
                <li>
                  Hay un <code>workspace.json</code> en la raíz con la
                  configuración general.
                </li>
                <li>
                  Todo esto se valida con esquemas antes de guardarse, así que los
                  archivos son consistentes y legibles con cualquier editor de
                  texto.
                </li>
              </ul>
              <p>
                En otras palabras: Git no es una feature que Hito construyó. Es una
                consecuencia directa de ser{" "}
                <a href="https://hito.autos/blogs/local-first-guia-definitiva-2026" target="_blank" rel="noopener noreferrer">
                  local-first
                </a>{" "}
                — tus datos ya están en un formato que cualquier herramienta de
                versionado puede leer. Puedes verificarlo tú mismo: el{" "}
                <a href="https://github.com/appcreathings/Gestion-de-Proyectos-APP" target="_blank" rel="noopener noreferrer">
                  código de Hito es público y auditable en GitHub
                </a>
                .
              </p>
            </>
          ),
        },
        {
          heading: "Cómo versionar tu carpeta de Hito con Git",
          body: (
            <>
              <p>
                Estos son los pasos reales, usando comandos estándar de Git — no
                hace falta ninguna herramienta adicional.
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Conecta Hito a una carpeta local.</strong> Si usas
                  Chrome, Edge o Brave, Hito te deja elegir la carpeta
                  directamente desde el navegador (File System Access API). Si usas
                  Firefox o Safari, exporta/importa archivos manualmente. En ambos
                  casos, termina existiendo una carpeta real en tu disco.
                </li>
                <li>
                  <strong>Abre una terminal en esa carpeta e inicializa el repositorio:</strong>
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                    <code>cd /ruta/a/tu/workspace-hito{'\n'}git init</code>
                  </pre>
                </li>
                <li>
                  <strong>Crea un <code>.gitignore</code></strong> para excluir lo
                  que no aporta al historial (ver sección siguiente).
                </li>
                <li>
                  <strong>Haz tu primer commit:</strong>
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                    <code>git add .{'\n'}git commit -m "Estado inicial del workspace"</code>
                  </pre>
                  Este commit es tu línea base. A partir de acá, cada cambio que
                  hagas en Hito —crear una tarea, mover una tarjeta, editar un
                  proceso— queda disponible para que lo confirmes con{" "}
                  <code>git add</code> y <code>git commit</code> cuando quieras.
                </li>
                <li>
                  <strong>Revisa cambios antes de confirmarlos:</strong>
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                    <code>git status{'\n'}git diff</code>
                  </pre>
                  Como cada tarea es un archivo JSON individual,{" "}
                  <code>git diff</code> te muestra exactamente qué campo cambió —
                  el <code>status</code> de una tarea, un comentario nuevo, una
                  fecha de vencimiento— igual que verías el diff de una línea de
                  código.
                </li>
                <li>
                  <strong>Consulta el historial completo cuando lo necesites:</strong>
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                    <code>git log --oneline -- projects/</code>
                  </pre>
                  Esto te da un historial real, con autor, fecha y mensaje de cada
                  cambio — algo que ninguna app cloud te da con este nivel de
                  detalle y control.
                </li>
                <li>
                  <strong>Marca hitos importantes con tags</strong> (por ejemplo,
                  el cierre de un sprint o la entrega a un cliente):
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                    <code>git tag -a cierre-q1-2026 -m "Cierre de proyectos Q1"</code>
                  </pre>
                </li>
                <li>
                  <strong>Comparte el repositorio con tu equipo</strong> si quieres
                  colaboración con historial compartido: puedes usar un remoto
                  privado (GitHub, GitLab, Gitea autoalojado) y trabajar con{" "}
                  <code>git pull</code> / <code>git push</code> como con cualquier
                  repo de código. Si no quieres un servidor remoto, una carpeta
                  compartida por red también funciona — el historial de Git vive
                  dentro de la propia carpeta.
                </li>
              </ol>
            </>
          ),
        },
        {
          heading: "Qué excluir del .gitignore",
          body: (
            <>
              <p>Un <code>.gitignore</code> razonable para un workspace de Hito:</p>
              <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                <code>.backups/</code>
              </pre>
              <p>
                Hito crea automáticamente una carpeta <code>.backups/</code> con
                snapshots previos a migraciones de esquema (por ejemplo, cuando
                actualizas de versión y el formato de un archivo cambia). Una vez
                que tienes Git llevando el historial real, esos snapshots
                automáticos son redundantes — Git ya te permite volver a cualquier
                estado anterior con más precisión. Esta es una recomendación
                práctica nuestra, no un requisito de Hito: si prefieres conservar
                ambos, no pasa nada.
              </p>
            </>
          ),
        },
        {
          heading: "Merge conflicts: cuándo pasan y cómo evitarlos",
          body: (
            <>
              <p>
                Si dos personas usan la misma carpeta sin coordinarse, pueden
                pasar conflictos de merge — como con cualquier repo de Git. La
                buena noticia es que la arquitectura de "un archivo por entidad"
                reduce mucho el riesgo: si tú editas la tarea A y tu compañero
                edita la tarea B, son dos archivos distintos y Git los combina sin
                problema.
              </p>
              <p>
                El conflicto real aparece cuando <strong>dos personas editan la misma tarea o el mismo proceso</strong>{" "}
                en paralelo sin sincronizar. Ahí sí vas a tener que resolver el
                conflicto manualmente, igual que harías con un archivo de código.
                Para equipos que editan mucho en simultáneo sobre las mismas
                entidades, un sync en tiempo real (Dropbox, Google Drive) evita
                esta fricción mejor que Git.
              </p>
            </>
          ),
        },
        {
          heading: "Git vs Dropbox/Drive: cuándo usar cada uno",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Necesitas…</th>
                  <th className="py-2 font-semibold">Usa</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Historial real, auditable, con diffs y autoría</td>
                  <td className="py-2 font-semibold">Git</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Volver a cualquier estado anterior con precisión</td>
                  <td className="py-2 font-semibold">Git</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Colaboración simultánea sin pensar en conflictos</td>
                  <td className="py-2 font-semibold">Dropbox / Google Drive</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Onboarding sin conocimientos técnicos en el equipo</td>
                  <td className="py-2 font-semibold">Dropbox / Google Drive</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Auditoría de cambios para compliance</td>
                  <td className="py-2 font-semibold">Git</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Simplicidad máxima, cero fricción</td>
                  <td className="py-2 font-semibold">Dropbox / Google Drive</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Versionar proyectos con Git deja de ser una idea exótica en cuanto
                la herramienta que usas guarda tus datos como archivos abiertos.
                En Hito no hace falta ninguna integración especial: tu workspace ya
                es una carpeta de JSON planos, así que <code>git init</code> y un
                primer commit son suficientes para empezar a tener el mismo control
                de versiones que ya usas en tu código.
              </p>
              <p>
                Si quieres probarlo, instala Hito, conecta una carpeta y corre los
                ocho pasos de esta guía — vas a tener historial real de tus
                proyectos en menos de cinco minutos.
              </p>
              <p>
                <strong>Sobre Hito:</strong> Gestión de proyectos, procesos y
                checklists 100% local-first. Open source (MIT), sin nube, sin
                cuenta, sin suscripción.{" "}
                <a href="https://hito.autos" target="_blank" rel="noopener noreferrer">
                  <strong>Pruébalo gratis →</strong>
                </a>
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "hito-vs-clickup",
    title: "Hito vs ClickUp: comparativa honesta",
    excerpt:
      "ClickUp es más completo, pero no es gratis de verdad ni es local-first. Comparativa honesta de precio, IA y privacidad para elegir bien.",
    category: "comparativas",
    categoryLabel: "Comparativas",
    publishedAt: "2026-08-31",
    readingTime: "14 min",
    featured: false,
    seo: {
      title: "Hito vs ClickUp: comparativa honesta (2026) | Hito",
      description:
        "ClickUp es más completo, pero no es gratis de verdad ni es local-first. Comparativa honesta de precio, IA y privacidad para elegir bien.",
      ogImageAlt: "Comparativa honesta Hito vs ClickUp 2026.",
    },
    content: {
      eyebrow: "Comparativas",
      intro: (
        <>
          <strong>En una línea:</strong> ClickUp es más completo que Hito —
          más vistas, más integraciones nativas y una IA (Brain) mucho más
          avanzada. Pero esa profundidad tiene precio: el plan gratis de
          ClickUp limita el storage a 60MB, y la IA es un add-on aparte desde
          9 USD/usuario/mes. Hito es la alternativa cuando lo que buscas es
          privacidad real (todo local, sin backend), un modelo gratis sin
          límites y una IA opcional que tú controlas con tu propia API key.
          No es un reemplazo directo — es la opción correcta para un perfil
          distinto.
        </>
      ),
      sections: [
        {
          heading: "La respuesta rápida",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Si tu prioridad es…</th>
                  <th className="py-2 font-semibold">Elige</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Profundidad de features (Gantt, whiteboards, +15 vistas)</td>
                  <td className="py-2">ClickUp</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Privacidad total y datos que nunca salen de tu equipo</td>
                  <td className="py-2 font-semibold">Hito</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Un plan gratis sin límite de almacenamiento</td>
                  <td className="py-2 font-semibold">Hito</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">IA con memoria persistente, múltiples modelos y agentes</td>
                  <td className="py-2">ClickUp</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">IA opcional, con tu propia API key, sin costo de licencia</td>
                  <td className="py-2 font-semibold">Hito</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Integraciones nativas con cientos de apps (Slack, Jira, Salesforce…)</td>
                  <td className="py-2">ClickUp</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Certificaciones enterprise (SOC 2, HIPAA, SAML SSO)</td>
                  <td className="py-2">ClickUp</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">Equipos chicos o sensibles a datos (legal, salud, consultoría)</td>
                  <td className="py-2 font-semibold">Hito</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Onboarding con documentación y comunidad masivas</td>
                  <td className="py-2">ClickUp</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Tabla comparativa completa",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Característica</th>
                  <th className="py-2 pr-4 font-semibold">Hito</th>
                  <th className="py-2 font-semibold">ClickUp</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Modelo de datos</td>
                  <td className="py-2 pr-4">Local-first (archivos JSON en tu equipo)</td>
                  <td className="py-2">Cloud-first (servidores de ClickUp)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Plan gratis</td>
                  <td className="py-2 pr-4">Gratis para siempre, sin límites</td>
                  <td className="py-2">"Free Forever": 60MB de storage, 5 spaces, límites en custom fields y Gantt</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Plan de pago</td>
                  <td className="py-2 pr-4">No existe — todo el producto es gratis</td>
                  <td className="py-2">Unlimited $7/usuario/mes · Business $12/usuario/mes · Enterprise a medida</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">IA</td>
                  <td className="py-2 pr-4">Asistente con function calling + RAG local (Gemini, tu API key)</td>
                  <td className="py-2">ClickUp Brain: add-on aparte, $9/usuario/mes (Brain AI) o $28/usuario/mes (Everything AI)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Vistas</td>
                  <td className="py-2 pr-4">Kanban, checklists, procesos/SOPs</td>
                  <td className="py-2">+15 vistas: Gantt, whiteboards, mind maps, timeline, workload, dashboards</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Integraciones nativas</td>
                  <td className="py-2 pr-4">HubSpot, Google Sheets, webhooks entrantes/salientes</td>
                  <td className="py-2">Cientos: Slack, Jira, Salesforce, Google Drive, HubSpot, Zapier y más</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Automatizaciones</td>
                  <td className="py-2 pr-4">Constructor visual de flujos (canvas), sin límite de uso</td>
                  <td className="py-2">100/mes en Free, 5.000/mes en Business, 250.000/mes en Enterprise</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Cuenta requerida</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2">Sí</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Funciona offline</td>
                  <td className="py-2 pr-4">Sí, nativo (PWA)</td>
                  <td className="py-2">Limitado</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Código abierto</td>
                  <td className="py-2 pr-4">Sí (MIT)</td>
                  <td className="py-2">No</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Certificaciones compliance</td>
                  <td className="py-2 pr-4">No aplica (no hay servidor que certificar)</td>
                  <td className="py-2">SOC 2, ISO 27001, GDPR, HIPAA</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Dónde gana ClickUp",
          body: (
            <>
              <p>
                Hay que decirlo con claridad: si necesitas una plataforma "todo
                en uno" con la máxima profundidad de features, ClickUp gana en
                casi cualquier comparación directa de funcionalidad.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                1. Profundidad de producto
              </h3>
              <p>
                ClickUp tiene más de 15 vistas (Gantt, whiteboards, mind maps,
                workload, timeline), dashboards avanzados y reporting de sprints.
                Hito cubre kanban, checklists y procesos/SOPs — suficiente para
                gestión de proyectos y equipos, pero no compite en amplitud con
                una suite que lleva más de una década construyendo features.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                2. Ecosistema de integraciones
              </h3>
              <p>
                ClickUp se integra nativamente con cientos de herramientas:
                Slack, Jira, Salesforce, Google Drive, HubSpot, y su propio
                marketplace. Hito hoy tiene integraciones nativas con HubSpot y
                Google Sheets, más webhooks genéricos que te permiten conectar
                con Zapier o Make — funcional, pero mucho más acotado.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                3. ClickUp Brain: la IA más ambiciosa de las dos
              </h3>
              <p>
                ClickUp relanzó su IA como{" "}
                <a href="https://clickup.com/brain" target="_blank" rel="noopener noreferrer">
                  "Brain 2"
                </a>{" "}
                en junio de 2026, con memoria persistente (recuerda cómo escribes
                un reporte y lo replica), ruteo automático entre modelos (Claude,
                GPT, Gemini según la tarea) y "Super Agents" que aparecen como
                usuarios reales en el workspace, asignables y programables. Es,
                en términos de capacidad bruta, más avanzada que el asistente de
                Hito.
              </p>
              <p>
                El costo de esa potencia: es un add-on separado del plan base,
                desde 9 USD/usuario/mes (Brain AI) hasta 28 USD/usuario/mes
                (Everything AI, con notetaker, generación de imágenes y agentes
                completos). Y tus datos viajan a los servidores de ClickUp y a
                los proveedores de modelos que ellos eligen enrutar.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                4. Compliance de nivel enterprise
              </h3>
              <p>
                SOC 2, ISO 27001, GDPR y HIPAA compliant, con SAML SSO, SCIM y
                audit log en el plan Enterprise. Para organizaciones grandes con
                requisitos formales de auditoría de un proveedor cloud, esto es un
                checkbox que Hito no ofrece — porque, al no haber servidor, no
                hay nada que certificar de esa forma.
              </p>
            </>
          ),
        },
        {
          heading: "Dónde gana Hito",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                1. El plan gratis es gratis de verdad
              </h3>
              <p>
                Esta es la diferencia más concreta y menos discutible. El{" "}
                <a href="https://clickup.com/pricing" target="_blank" rel="noopener noreferrer">
                  "Free Forever" de ClickUp
                </a>{" "}
                te da 60MB de storage — una cifra que un equipo real agota rápido
                con adjuntos, imágenes y documentos. Pasar a Unlimited ($7/usuario/mes)
                o Business ($12/usuario/mes) es casi inevitable en cuanto el
                equipo crece.
              </p>
              <p>
                Hito no tiene ese techo. Es open source (MIT), gratis para
                siempre, sin límite de storage, sin límite de usuarios y sin
                ningún plan superior esperando en la esquina.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                2. Privacidad: sin servidor que auditar
              </h3>
              <p>
                ClickUp resuelve el compliance con certificaciones sobre su
                propia infraestructura cloud (SOC 2, HIPAA). Hito resuelve la
                misma preocupación de forma distinta: no hay servidor al que
                conectarse. Tus proyectos son archivos{" "}
                <code>.json</code> en tu equipo —{" "}
                <a href="https://hito.autos/blogs/local-first-guia-definitiva-2026" target="_blank" rel="noopener noreferrer">
                  local-first
                </a>{" "}
                por diseño, no por certificación externa.
              </p>
              <p>
                Para estudios jurídicos, consultoras o equipos de salud, esto
                cambia la pregunta de "¿confío en las certificaciones de este
                proveedor?" a "no hay proveedor que necesite mi confianza".
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                3. IA opcional, sin costo de licencia
              </h3>
              <p>
                El asistente de Hito usa function calling nativo sobre unas 40
                herramientas con Gemini, más{" "}
                <a href="https://hito.autos/blogs/que-es-mcp" target="_blank" rel="noopener noreferrer">
                  RAG local
                </a>{" "}
                sobre tu workspace. Tú traes tu propia API key de Google AI
                Studio, así que pagas directamente el uso de la API — sin el
                margen de un add-on de 9 a 28 USD por usuario que cobra ClickUp
                encima del costo del modelo. Y si no quieres activar el
                asistente, el resto de Hito funciona 100% local, sin que un solo
                byte salga de tu equipo.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                4. Simplicidad para equipos chicos
              </h3>
              <p>
                ClickUp está diseñado para escalar a organizaciones grandes con
                estructuras complejas. Esa misma potencia puede ser fricción
                para un equipo de 3 a 15 personas que solo necesita proyectos,
                checklists y procesos claros, sin configurar 15 vistas distintas.
              </p>
            </>
          ),
        },
        {
          heading: "¿Cuál elegir según tu caso?",
          body: (
            <>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                🎯 Elige ClickUp si…
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Necesitas la mayor profundidad de features posible: Gantt,
                  whiteboards, dashboards avanzados, reporting de sprints.
                </li>
                <li>
                  Tu organización requiere certificaciones formales (SOC 2, HIPAA,
                  SAML SSO) sobre la infraestructura del proveedor.
                </li>
                <li>
                  Quieres la IA más potente disponible hoy en gestión de
                  proyectos, y el costo del add-on no es un problema.
                </li>
                <li>
                  Tu flujo depende de integraciones nativas con un stack amplio
                  (Slack, Jira, Salesforce).
                </li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                🎯 Elige Hito si…
              </h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  La privacidad no es negociable y prefieres que no exista un
                  servidor con tus datos, en lugar de confiar en las
                  certificaciones de uno.
                </li>
                <li>
                  Quieres un plan gratis que sea gratis de verdad, sin límite de
                  storage ni de usuarios.
                </li>
                <li>
                  Tu equipo es chico o mediano y no necesita la profundidad
                  completa de una suite enterprise.
                </li>
                <li>
                  Prefieres pagar tú directamente el uso de la IA (tu API key)
                  en lugar de un add-on con margen.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                ClickUp y Hito no están resolviendo el mismo problema. ClickUp
                apuesta por ser la suite más completa del mercado, con el precio y
                la complejidad que eso conlleva. Hito apuesta por privacidad real
                y un modelo gratis sin letra pequeña, a cambio de menos
                profundidad de producto.
              </p>
              <p>
                Si tu prioridad es la privacidad, el costo real a largo plazo o
                simplemente no depender de un servidor ajeno, vale la pena probar
                Hito. Si necesitas la suite más completa del mercado y el
                presupuesto lo permite, ClickUp sigue siendo una opción sólida.
              </p>
              <p>
                <strong>La mejor forma de decidir es probarlo.</strong> Hito se
                instala en segundos, no requiere cuenta y tus proyectos se guardan
                en tu equipo, sin límites de storage ni de usuarios.
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Sin cuenta, sin nube, sin suscripción.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "como-priorizar-tareas",
    title: "Cómo priorizar tareas: 4 métodos con ejemplos",
    excerpt:
      "4 métodos para priorizar tareas —Eisenhower, MoSCoW, RICE e Ivy Lee— con ejemplos y cómo aplicarlos hoy, en cualquier herramienta.",
    category: "productividad",
    categoryLabel: "Productividad",
    publishedAt: "2026-09-14",
    readingTime: "10 min",
    featured: false,
    seo: {
      title: "Cómo priorizar tareas: 4 métodos con ejemplos | Hito",
      description:
        "4 métodos para priorizar tareas —Eisenhower, MoSCoW, RICE e Ivy Lee— con ejemplos y cómo aplicarlos hoy, en cualquier herramienta.",
      ogImageAlt:
        "Cómo priorizar tareas con 4 métodos: Eisenhower, MoSCoW, RICE e Ivy Lee.",
    },
    content: {
      eyebrow: "Productividad",
      intro: (
        <>
          <strong>En una línea:</strong> no existe un método universal para
          priorizar. La{" "}
          <strong>Matriz de Eisenhower</strong> separa lo urgente de lo
          importante para el día a día, <strong>MoSCoW</strong> clasifica
          requisitos cuando el alcance de un proyecto está fijo,{" "}
          <strong>RICE Score</strong> puntúa iniciativas quitando la
          subjetividad, y el <strong>método Ivy Lee</strong> fuerza un orden
          estricto de las tareas más importantes del día. Esta guía explica los
          cuatro, con ejemplos, y cuándo conviene cada uno.
        </>
      ),
      sections: [
        {
          heading:
            'El problema: "todo es urgente" no es una prioridad',
          body: (
            <>
              <p>
                Cuando alguien dice que todo en su lista es urgente, en realidad
                está diciendo que no tiene un criterio para decidir. Sin un
                método, la priorización termina dependiendo de quién gritó más
                fuerte último, o de qué tarea es más fácil de tachar rápido — no
                de qué mueve realmente la aguja.
              </p>
              <p>
                Los cuatro métodos de este post resuelven ese problema desde
                ángulos distintos: dos están pensados para el día a día
                individual (Eisenhower, Ivy Lee) y dos para decisiones de equipo
                o producto (MoSCoW, RICE). Elegir el método correcto según tu
                situación es la mitad del trabajo.
              </p>
            </>
          ),
        },
        {
          heading: "Método 1: Matriz de Eisenhower",
          body: (
            <>
              <p>
                Atribuida al expresidente estadounidense Dwight D. Eisenhower
                (popularizada después por Stephen Covey en{" "}
                <em>Los 7 hábitos de la gente altamente efectiva</em>), este
                método separa las tareas en cuatro cuadrantes según dos ejes:{" "}
                <strong>urgencia</strong> e <strong>importancia</strong>.
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-semibold"></th>
                    <th className="py-2 pr-4 font-semibold">Urgente</th>
                    <th className="py-2 font-semibold">No urgente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">Importante</td>
                    <td className="py-2 pr-4">Hacer ahora</td>
                    <td className="py-2 pr-4">Planificar cuándo hacerlo</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4 font-medium">No importante</td>
                    <td className="py-2 pr-4">Delegar</td>
                    <td className="py-2">Eliminar</td>
                  </tr>
                </tbody>
              </table>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Urgente + importante:</strong> una crisis de cliente,
                  un bug en producción. Se hace de inmediato.
                </li>
                <li>
                  <strong>Importante, no urgente:</strong> planificación
                  estratégica, aprender una habilidad nueva. Se agenda, no se
                  improvisa.
                </li>
                <li>
                  <strong>Urgente, no importante:</strong> la mayoría de las
                  interrupciones y reuniones de "solo 5 minutos". Se delega si es
                  posible.
                </li>
                <li>
                  <strong>Ni urgente ni importante:</strong> distracciones. Se
                  elimina de la lista.
                </li>
              </ul>
              <p>
                <strong>Cuándo usarlo:</strong> para el día a día individual,
                cuando necesitas decidir rápido si algo merece tu atención ahora
                mismo o puede esperar. Es el método más simple de los cuatro y
                el más fácil de enseñarle a un equipo completo.
              </p>
            </>
          ),
        },
        {
          heading: "Método 2: MoSCoW",
          body: (
            <>
              <p>
                MoSCoW es un acrónimo de <strong>Must have, Should have, Could
                have, Won't have</strong> (this time). Nació en el contexto de
                desarrollo de software con alcance fijo y tiempo limitado, y hoy
                se usa en cualquier proyecto donde hay que decidir qué entra en
                una entrega y qué no.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Must have:</strong> sin esto, el proyecto falla o no
                  tiene sentido entregarlo.
                </li>
                <li>
                  <strong>Should have:</strong> importante, pero el proyecto
                  sobrevive sin ello en esta iteración.
                </li>
                <li>
                  <strong>Could have:</strong> deseable, se hace si sobra
                  tiempo.
                </li>
                <li>
                  <strong>Won't have (por ahora):</strong> explícitamente fuera
                  de esta entrega — no es un "no" definitivo, es un "no ahora".
                </li>
              </ul>
              <p>
                <strong>Cuándo usarlo:</strong> cuando estás definiendo el
                alcance de un proyecto o sprint y necesitas que todo el equipo
                (y el cliente) esté de acuerdo en qué es innegociable y qué es
                negociable. Es especialmente útil para evitar el "scope creep" —
                que todo se vuelva "must have" a último momento.
              </p>
            </>
          ),
        },
        {
          heading: "Método 3: RICE Score",
          body: (
            <>
              <p>
                RICE es un método cuantitativo, popularizado por el equipo de
                producto de Intercom, que le pone un número a cada iniciativa
                para reducir la subjetividad al priorizar un backlog. Se calcula
                así:
              </p>
              <p>
                <strong>
                  RICE = (Reach × Impact × Confidence) / Effort
                </strong>
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Reach (alcance):</strong> a cuántas personas o casos
                  afecta en un período (ej. usuarios por trimestre).
                </li>
                <li>
                  <strong>Impact (impacto):</strong> cuánto mueve el objetivo,
                  en una escala simple (ej. 3 = alto, 2 = medio, 1 = bajo, 0,5 =
                  mínimo).
                </li>
                <li>
                  <strong>Confidence (confianza):</strong> qué tan seguro estás
                  de tus estimaciones de Reach e Impact, como porcentaje (100%,
                  80%, 50%).
                </li>
                <li>
                  <strong>Effort (esfuerzo):</strong> cuánto trabajo requiere,
                  en persona-mes o cualquier unidad consistente.
                </li>
              </ul>
              <p>
                Cuanto más alto el número resultante, más arriba va en el
                backlog. La ventaja de RICE es que obliga a poner números donde
                antes había solo intuición — y a discutir los números, no las
                opiniones.
              </p>
              <p>
                <strong>Cuándo usarlo:</strong> cuando tienes un backlog de
                iniciativas de producto o proyectos candidatos y necesitas un
                criterio defendible para explicar por qué algo va antes que otra
                cosa, especialmente frente a stakeholders.
              </p>
            </>
          ),
        },
        {
          heading: "Método 4: Método Ivy Lee",
          body: (
            <>
              <p>
                Este es el más antiguo de los cuatro — data de 1918, cuando el
                consultor Ivy Lee se lo propuso al presidente de Bethlehem Steel.
                La regla es deliberadamente simple:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  Al final del día, escribe las 6 tareas más importantes que
                  tienes que hacer mañana.
                </li>
                <li>
                  Ordénalas por importancia real, de la 1 a la 6.
                </li>
                <li>
                  Al día siguiente, trabaja solo en la tarea 1 hasta terminarla
                  antes de pasar a la 2.
                </li>
                <li>
                  Lo que quede sin terminar pasa a la lista del día siguiente.
                </li>
              </ol>
              <p>
                No hay cuadrantes ni fórmulas — la disciplina está en el límite
                de 6 tareas y en no saltar de una a otra sin terminar la
                anterior.
              </p>
              <p>
                <strong>Cuándo usarlo:</strong> cuando el problema no es decidir
                qué es importante (ya lo sabes) sino ejecutar sin dispersarte. Es
                el método más efectivo para el día a día individual cuando la
                lista de tareas es interminable y la tentación de saltar entre
                ellas es alta.
              </p>
            </>
          ),
        },
        {
          heading: "¿Qué método usar según tu situación?",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold">Tu situación</th>
                  <th className="py-2 font-semibold">Método recomendado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">
                    Necesitas decidir rápido si algo merece tu atención ahora
                  </td>
                  <td className="py-2 font-semibold">Matriz de Eisenhower</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">
                    Estás definiendo el alcance de un proyecto o sprint con el
                    equipo
                  </td>
                  <td className="py-2 font-semibold">MoSCoW</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4">
                    Tienes un backlog de iniciativas y necesitas un criterio
                    numérico defendible
                  </td>
                  <td className="py-2 font-semibold">RICE Score</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Sabes qué es importante pero te dispersas al ejecutar
                  </td>
                  <td className="py-2 font-semibold">Método Ivy Lee</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Cómo aplicar estos métodos en Hito",
          body: (
            <>
              <p>
                Ninguno de estos cuatro métodos requiere una herramienta
                específica — funcionan igual en papel, en una hoja de cálculo o
                en cualquier gestor de proyectos. Si ya tienes{" "}
                <a
                  href="https://hito.autos/blogs/plantillas-sop-descargables"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  procesos documentados con plantillas de SOP
                </a>
                , priorizar es el paso siguiente: primero decides qué proceso
                aplicar, después en qué orden. Esto es lo que aporta Hito en
                concreto, con honestidad sobre lo que hace la app y lo que
                decides tú:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Campo de prioridad nativo:</strong> cada tarea y cada
                  proyecto en Hito tiene un campo de prioridad con cuatro valores
                  (Baja, Media, Alta, Crítica). Es el lugar natural para reflejar
                  el resultado de tu clasificación de Eisenhower o de MoSCoW una
                  vez que ya decidiste — no calcula la prioridad por ti, la
                  registra.
                </li>
                <li>
                  <strong>Tags para clasificaciones propias:</strong> si usas
                  MoSCoW, puedes usar tags como <code>must</code>, <code>should</code>,{" "}
                  <code>could</code> en lugar de (o además de) el campo de
                  prioridad, para no perder la categoría exacta del método.
                </li>
                <li>
                  <strong>Orden manual en el kanban:</strong> las tarjetas se
                  reordenan arrastrando (drag-and-drop), como en el{" "}
                  <a
                    href="https://hito.autos/blogs/hito-vs-trello"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    kanban que comparamos con el de Trello
                  </a>
                  . Esto es exactamente lo que necesitas para aplicar Ivy Lee:
                  ordenar tus 6 tareas del día de la 1 a la 6 dentro de una
                  columna.
                </li>
                <li>
                  <strong>Lo que Hito no hace:</strong> no hay un campo o vista
                  que calcule un RICE Score automáticamente, ni una vista nativa
                  de matriz 2×2 de Eisenhower. Si usas RICE, probablemente
                  quieras calcular el número aparte (en la descripción de la
                  tarea o en una hoja de cálculo) y luego reflejar el resultado
                  con el campo de prioridad o el orden de las tarjetas.
                </li>
              </ul>
              <p>
                En otras palabras: el método lo eliges y lo calculas tú; Hito te
                da los campos (prioridad, tags, orden de tarjetas) para que ese
                criterio quede reflejado y visible para todo el equipo, sin
                depender de memoria ni de una hoja de cálculo aparte.
              </p>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Priorizar bien no es encontrar la app correcta — es elegir el
                criterio correcto para tu situación. Usa la Matriz de Eisenhower
                para decisiones del día a día, MoSCoW cuando definas el alcance
                de un proyecto con tu equipo, RICE cuando necesites un número
                defendible para un backlog, e Ivy Lee cuando el problema sea
                ejecutar sin dispersarte.
              </p>
              <p>
                Elige el método que mejor encaje con lo que tienes enfrente esta
                semana y aplícalo en tu próximo proyecto. Si buscas dónde
                reflejar esas prioridades sin depender de una hoja de cálculo
                aparte, Hito tiene el campo de prioridad, tags y un kanban
                ordenable listos para usar —{" "}
                <a
                  href="https://hito.autos/blogs/local-first-guia-definitiva-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  gratis y con tus datos en tu propio equipo
                </a>
                .
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Sin cuenta, sin nube, sin suscripción.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "prompts-gestion-proyectos-ia",
    title: "10 prompts de gestión de proyectos para usar con IA",
    excerpt:
      "10 prompts concretos para tu asistente de IA de gestión de proyectos: crear tareas, resumir salud de proyecto, buscar y más.",
    category: "inteligencia-artificial",
    categoryLabel: "Inteligencia artificial",
    publishedAt: "2026-09-21",
    readingTime: "8 min",
    featured: false,
    seo: {
      title:
        "10 prompts de gestión de proyectos para usar con IA | Hito",
      description:
        "10 prompts concretos para tu asistente de IA de gestión de proyectos: crear tareas, resumir salud de proyecto, buscar y más.",
      ogImageAlt:
        "10 prompts de gestión de proyectos para usar con inteligencia artificial.",
    },
    content: {
      eyebrow: "Inteligencia artificial",
      intro: (
        <>
          <strong>En una línea:</strong> un buen prompt para un asistente de IA
          de gestión de proyectos no es un pedido genérico ("ayúdame a
          organizarme") — es una instrucción concreta que la IA puede ejecutar
          sobre tus datos reales. Estos 10 prompts están pensados para el
          asistente de Hito, que puede crear tareas, resumir proyectos y buscar
          en tu workspace de verdad, no solo conversar sobre ellos.
        </>
      ),
      sections: [
        {
          heading: "Los 10 prompts",
          body: (
            <>
              <p>
                Si le pides a un asistente genérico "ayúdame a priorizar mi
                semana", te va a devolver un consejo genérico. Si tu asistente
                está integrado a tu gestor de proyectos —como el de Hito, que
                actúa sobre tus tareas y proyectos reales mediante function
                calling— el mismo tipo de pedido puede convertirse en una acción
                concreta. La diferencia está en cómo lo pides.
              </p>
              <ol className="list-decimal space-y-4 pl-6 text-muted-foreground">
                <li>
                  <strong>
                    "Dame un resumen del estado de todos mis proyectos activos."
                  </strong>
                  <p className="mt-1">
                    Dispara un resumen general del workspace: proyectos, salud y
                    alertas, sin que tengas que entrar proyecto por proyecto.
                  </p>
                </li>
                <li>
                  <strong>
                    "¿Qué tareas están bloqueadas en el proyecto [nombre]?"
                  </strong>
                  <p className="mt-1">
                    Filtra las tareas de ese proyecto por estado "bloqueada",
                    para que sepas exactamente dónde intervenir antes de la
                    próxima reunión de equipo.
                  </p>
                </li>
                <li>
                  <strong>
                    "Crea una tarea en [proyecto]: 'Revisar contrato con legal',
                    prioridad alta, vence el viernes."
                  </strong>
                  <p className="mt-1">
                    Crea la tarea directamente en el proyecto indicado, con
                    prioridad y fecha de vencimiento — sin abrir el formulario
                    manualmente.
                  </p>
                </li>
                <li>
                  <strong>
                    "Busca todo lo relacionado a 'migración de datos' en mi
                    workspace."
                  </strong>
                  <p className="mt-1">
                    Ejecuta una búsqueda semántica sobre tus proyectos, tareas y
                    procesos — encuentra menciones relevantes aunque no uses
                    exactamente esas palabras en el texto original.
                  </p>
                </li>
                <li>
                  <strong>
                    "Crea un proyecto nuevo a partir del tipo 'Implementación de
                    cliente'."
                  </strong>
                  <p className="mt-1">
                    Si ya tienes un tipo de proyecto definido con su estructura
                    estándar, este prompt te ahorra recrear áreas y procesos
                    desde cero cada vez.
                  </p>
                </li>
                <li>
                  <strong>
                    "Actualiza la tarea 'Enviar propuesta' a completada."
                  </strong>
                  <p className="mt-1">
                    Cambia el estado de una tarea puntual sin que tengas que
                    ubicarla manualmente en el kanban.
                  </p>
                </li>
                <li>
                  <strong>
                    "Dame la salud del proyecto [nombre]: ¿está en riesgo?"
                  </strong>
                  <p className="mt-1">
                    Pide un diagnóstico puntual de un proyecto específico — útil
                    antes de un check-in con un cliente o con tu equipo
                    directivo.
                  </p>
                </li>
                <li>
                  <strong>
                    "Crea un proceso llamado 'Cierre de sprint' con estos pasos:
                    revisar backlog, actualizar estimaciones, retro del equipo,
                    planificar el siguiente sprint."
                  </strong>
                  <p className="mt-1">
                    Genera un SOP nuevo en tu biblioteca de procesos, listo para
                    aplicar al próximo sprint.
                  </p>
                </li>
                <li>
                  <strong>
                    "Agrega un ítem a la checklist de onboarding: 'Confirmar
                    acceso al repositorio'."
                  </strong>
                  <p className="mt-1">
                    Suma un paso puntual a una checklist existente sin abrir el
                    editor de plantillas.
                  </p>
                </li>
                <li>
                  <strong>
                    "Dame un overview completo: productos activos, proyectos en
                    riesgo y notificaciones pendientes."
                  </strong>
                  <p className="mt-1">
                    El pedido más amplio de la lista — junta varias fuentes de
                    tu workspace en una sola respuesta, útil para arrancar el
                    lunes con contexto completo.
                  </p>
                </li>
              </ol>
            </>
          ),
        },
        {
          heading: "Cómo escribir tus propios prompts",
          body: (
            <>
              <p>
                La regla general: nombra la entidad exacta (proyecto, tarea,
                checklist) y el resultado que quieres, en lugar de pedir algo
                abstracto. "Ayúdame con el proyecto X" es ambiguo. "Dame la
                salud del proyecto X" o "crea una tarea en el proyecto X" son
                instrucciones que el asistente puede ejecutar porque mapean
                directamente a una acción concreta sobre tus datos.
              </p>
              <p>
                Vale la pena recordar el trade-off de privacidad: el asistente
                de Hito usa{" "}
                <a
                  href="https://hito.autos/blogs/que-es-mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  function calling nativo y RAG local
                </a>
                , pero para responder, el contenido relevante de tu workspace
                viaja a la API de Gemini con tu propia API key. Si no quieres
                activar el asistente, el resto de Hito —incluyendo{" "}
                <a
                  href="https://hito.autos/blogs/como-priorizar-tareas"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  priorizar tus tareas con cualquiera de estos métodos
                </a>
                — sigue funcionando 100% local.
              </p>
            </>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Los prompts más útiles para un asistente de gestión de proyectos
                no son los más creativos, son los más específicos. Copia estos
                10, adáptalos a tus proyectos reales, y vas a notar la
                diferencia entre pedirle consejo a una IA y pedirle que haga el
                trabajo.
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                con un asistente de IA opcional que tú controlas con tu propia
                API key.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "rag-local-explicado",
    title: "RAG local explicado sin jerga",
    excerpt:
      "Qué es RAG, qué lo hace 'local' y cómo lo implementa Hito de verdad: qué se indexa, dónde vive y qué viaja a un servidor externo.",
    category: "inteligencia-artificial",
    categoryLabel: "Inteligencia artificial",
    publishedAt: "2026-09-28",
    readingTime: "10 min",
    featured: false,
    seo: {
      title: "RAG local explicado sin jerga | Hito",
      description:
        "Qué es RAG, qué lo hace 'local' y cómo lo implementa Hito de verdad: qué se indexa, dónde vive y qué viaja a un servidor externo.",
      ogImageAlt:
        "RAG local explicado sin jerga: búsqueda semántica en tu dispositivo.",
    },
    content: {
      eyebrow: "Inteligencia artificial",
      intro: (
        <>
          <strong>En una línea:</strong> RAG (Retrieval-Augmented Generation) es
          la técnica que le da a un asistente de IA acceso a tus datos privados
          —proyectos, tareas, notas— sin que el modelo haya sido entrenado con
          ellos: antes de responder, busca lo más relevante y lo agrega a la
          pregunta. "RAG local" significa que ese índice de búsqueda vive en tu
          dispositivo, no en la base de datos vectorial de un tercero. Con un
          matiz importante que vamos a explicar sin vueltas: local es el índice,
          no necesariamente cada paso del proceso.
        </>
      ),
      sections: [
        {
          heading: "El problema que resuelve RAG",
          body: (
            <>
              <p>
                Un modelo de IA como Gemini o Claude fue entrenado con una foto
                fija de internet hasta cierta fecha. No sabe nada de tu proyecto
                "Rediseño Q3" ni de la tarea que creaste ayer — porque esa
                información no existía cuando se entrenó, y probablemente nunca
                debería haber sido pública.
              </p>
              <p>
                La solución obvia sería escribir todo el contexto en cada
                pregunta ("aquí están mis 40 proyectos, ahora responde"), pero
                eso no escala: hay un límite de cuánto texto le puedes dar a un
                modelo de una sola vez, y la mayor parte sería irrelevante para
                la pregunta puntual. RAG resuelve exactamente ese problema: en
                lugar de mandar todo, busca solo lo relevante y se lo pasa al
                modelo justo antes de que responda.
              </p>
            </>
          ),
        },
        {
          heading: "Cómo funciona RAG, paso a paso",
          body: (
            <>
              <p>
                Sin jerga, esto es lo que pasa cada vez que le preguntas algo a
                un asistente con RAG:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Tus datos se convierten en números.</strong> Cada
                  pieza de información (una tarea, una nota, un proyecto) se
                  transforma en una lista de números que representa su
                  significado — esto se llama <em>embedding</em>. Dos textos con
                  significados parecidos generan listas de números parecidas,
                  aunque usen palabras distintas.
                </li>
                <li>
                  <strong>Esos números se guardan en un índice buscable.</strong>{" "}
                  Este índice es lo que se consulta más adelante, en lugar de
                  releer todo el texto original cada vez.
                </li>
                <li>
                  <strong>Cuando haces una pregunta, tu pregunta también se
                  convierte en números</strong>, usando el mismo proceso.
                </li>
                <li>
                  <strong>Se comparan los números de tu pregunta con los del
                  índice</strong> para encontrar las piezas de información más
                  parecidas en significado — no necesariamente las que comparten
                  las mismas palabras.
                </li>
                <li>
                  <strong>Los resultados más relevantes se agregan a tu
                  pregunta</strong> antes de mandársela al modelo, que ahora sí
                  tiene el contexto necesario para responder con precisión sobre
                  tus datos.
                </li>
              </ol>
              <p>
                Todo esto pasa en segundos, sin que lo veas — el asistente
                simplemente "sabe" de qué le estás hablando.
              </p>
            </>
          ),
        },
        {
          heading: "Qué hace 'local' al RAG",
          body: (
            <>
              <p>
                La diferencia entre un RAG genérico y un <strong>RAG local</strong>{" "}
                está en el paso 2: dónde vive ese índice de números.
              </p>
              <p>
                En la mayoría de las implementaciones empresariales de RAG, el
                índice vive en una base de datos vectorial especializada en la
                nube (Pinecone, Weaviate, y similares), gestionada por un
                proveedor externo. Es rápida y escala bien, pero implica que tu
                índice de búsqueda —una representación de todo tu contenido—
                vive en el servidor de otra empresa.
              </p>
              <p>
                En un RAG local, ese índice vive en tu propio dispositivo. No hay
                una base de datos vectorial externa que mantener ni a la que
                confiarle una copia de tu información indexada.
              </p>
            </>
          ),
        },
        {
          heading: "Cómo lo implementa Hito, en concreto",
          body: (
            <>
              <p>
                Para que esto no quede en teoría, así es como funciona el RAG de
                Hito, verificado directamente contra el código:
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Qué se indexa
              </h3>
              <p>
                Cuando activas la búsqueda semántica, Hito recorre tu workspace y
                convierte en texto descriptivo cada: producto, proyecto, tarea,
                área, ítem de checklist, persona, plantilla de checklist,
                plantilla de proceso, tipo de proyecto y automatización. Por
                ejemplo, una tarea se convierte en algo como{" "}
                <code>
                  "Tarea: Revisar contrato — Descripción: pendiente de firma
                  legal"
                </code>{" "}
                antes de generar su embedding.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Cómo se generan los embeddings
              </h3>
              <p>
                Cada uno de esos textos se envía al modelo{" "}
                <code>gemini-embedding-001</code> de Google, que devuelve la
                lista de números correspondiente. La indexación es{" "}
                <strong>incremental</strong>: si una tarea no cambió desde la
                última vez que se indexó, Hito no vuelve a pedir su embedding —
                ahorra llamadas a la API y hace que reindexar sea rápido después
                de la primera vez.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Dónde vive el índice
              </h3>
              <p>
                Los embeddings resultantes se guardan en <strong>IndexedDB</strong>,
                la base de datos incorporada en tu navegador — no en un servidor
                de Hito (que no existe) ni en una base de datos vectorial de
                terceros.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Cómo se busca
              </h3>
              <p>
                Cuando preguntas algo, tu pregunta se convierte en su propio
                embedding y se compara contra todos los guardados usando{" "}
                <strong>similitud coseno</strong>, calculada a mano en JavaScript
                puro, sin ninguna librería externa de búsqueda vectorial. Es una
                búsqueda lineal (recorre todos los embeddings uno por uno), no
                una estructura optimizada tipo ANN — funciona bien para el
                volumen de datos de un workspace personal o de equipo chico, pero
                no es la arquitectura de un buscador a escala de miles de
                millones de documentos.
              </p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                Cómo se activa
              </h3>
              <p>
                Todo esto se controla desde Ajustes: hay un interruptor para
                activar RAG, un estado visible (sin datos, indexando, actualizado,
                parcial, error), una barra de progreso y botones para cancelar o
                borrar el índice completo. No pasa nada en segundo plano sin que
                lo actives explícitamente.
              </p>
            </>
          ),
        },
        {
          heading: "La aclaración honesta que no podemos saltarnos",
          body: (
            <>
              <p>
                "RAG local" describe dónde vive el índice ya calculado — no que
                absolutamente nada toque un servidor externo en todo el proceso.
                Para generar cada embedding, el texto de tu tarea o proyecto se
                envía a la API de Google (<code>embedContent</code>) con tu
                propia API key. Es el mismo viaje de datos que ya existe cuando
                usas el chat del asistente,{" "}
                <a
                  href="https://hito.autos/blogs/que-es-mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  explicado en detalle en nuestro post sobre MCP
                </a>
                .
              </p>
              <p>
                Lo que sí es enteramente local: el índice resultante (las listas
                de números y a qué entidad corresponden) vive únicamente en tu
                navegador, y la búsqueda posterior —comparar tu pregunta contra
                ese índice— ocurre completamente en tu máquina, sin ninguna
                llamada de red adicional. Si nunca activas el asistente ni el
                RAG, ninguno de tus datos sale de tu equipo.
              </p>
            </>
          ),
        },
        {
          heading: "RAG local vs RAG en la nube",
          body: (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-4 font-semibold"></th>
                  <th className="py-2 pr-4 font-semibold">
                    RAG local (Hito)
                  </th>
                  <th className="py-2 font-semibold">
                    RAG en la nube (típico enterprise)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    Dónde vive el índice
                  </td>
                  <td className="py-2 pr-4">
                    IndexedDB, en tu navegador
                  </td>
                  <td className="py-2">
                    Base de datos vectorial gestionada (Pinecone, Weaviate…)
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    Quién administra el índice
                  </td>
                  <td className="py-2 pr-4">
                    Nadie — es un archivo de tu navegador
                  </td>
                  <td className="py-2">Un proveedor externo</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">Búsqueda</td>
                  <td className="py-2 pr-4">
                    Cosine similarity en JS, lineal
                  </td>
                  <td className="py-2">
                    Búsqueda vectorial optimizada (ANN), a escala
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    Generación de embeddings
                  </td>
                  <td className="py-2 pr-4">
                    Vía API de Gemini, con tu propia key
                  </td>
                  <td className="py-2">
                    Vía API del proveedor de IA elegido por la empresa
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    Escala recomendada
                  </td>
                  <td className="py-2 pr-4">
                    Workspace personal o de equipo chico
                  </td>
                  <td className="py-2">
                    Miles a millones de documentos
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">
                    Costo de licencia adicional
                  </td>
                  <td className="py-2 pr-4">Ninguno</td>
                  <td className="py-2">
                    Suele ser un servicio de pago aparte
                  </td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                RAG no es magia: es buscar lo relevante antes de responder, en
                lugar de intentar que el modelo lo sepa todo de memoria. Que sea
                "local" cambia una cosa importante — dónde vive el índice
                resultante y quién lo administra — sin cambiar el hecho de que
                generar embeddings requiere, hoy, una llamada a una API externa.
              </p>
              <p>
                Si quieres ver esto funcionando sobre tus propios datos, activa
                la búsqueda semántica en Ajustes y prueba a{" "}
                <a
                  href="https://hito.autos/blogs/prompts-gestion-proyectos-ia"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pedirle al asistente
                </a>{" "}
                que busque algo que escribiste hace semanas sin usar las palabras
                exactas — vas a notar la diferencia entre buscar por palabra
                clave y buscar por significado.
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                con un asistente de IA y RAG opcionales que tú controlas con tu
                propia API key.
              </p>
            </>
          ),
        },
      ],
    },
  },
  {
    slug: "hito-para-estudio-juridico",
    title: "Cómo configurar Hito para un estudio jurídico",
    excerpt:
      "Guía práctica para organizar expedientes, clientes y tareas de un estudio jurídico en Hito, sin nube ni cuentas externas.",
    category: "implementacion",
    categoryLabel: "Implementación",
    publishedAt: "2026-10-05",
    readingTime: "11 min",
    featured: false,
    seo: {
      title: "Cómo configurar Hito para un estudio jurídico | Hito",
      description:
        "Guía práctica para organizar expedientes, clientes y tareas de un estudio jurídico en Hito, sin nube ni cuentas externas.",
      ogImageAlt:
        "Configurar Hito para un estudio jurídico: expedientes, clientes y colaboración.",
    },
    content: {
      eyebrow: "Implementación",
      intro: (
        <>
          <strong>En una línea:</strong> configurar Hito para un estudio
          jurídico implica tres decisiones: mapear tus áreas de práctica y
          expedientes al modelo producto → proyecto → área de Hito, decidir si
          aíslas cada cliente en su propia carpeta de trabajo, y definir cómo
          va a colaborar el equipo sin depender de una nube. Esta guía cubre
          las tres, con el detalle práctico de cada una.
        </>
      ),
      sections: [
        {
          heading: "Cómo mapear tu estructura real al modelo de Hito",
          body: (
            <>
              <p>
                En un estudio jurídico, la confidencialidad no es un checkbox
                de compliance — es secreto profesional. Eso descarta de entrada
                cualquier herramienta que guarde tus expedientes en el servidor
                de otra empresa, sin importar cuántas certificaciones tenga.
                Hito resuelve esto por arquitectura: no hay servidor, no hay
                cuenta, tus datos son archivos en tu equipo.
              </p>
              <p>
                Hito organiza todo en una jerarquía:{" "}
                <strong>producto → proyecto → área</strong>, con procesos (SOPs),
                checklists y tareas colgando de cada área. Para un estudio
                jurídico, la traducción más natural es:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Producto:</strong> tu estudio, o un área de práctica
                  si el estudio es multidisciplinario (por ejemplo, "Derecho
                  Corporativo" y "Derecho Laboral" como dos productos
                  separados).
                </li>
                <li>
                  <strong>Proyecto:</strong> cada expediente o caso activo. Un
                  cliente con dos causas distintas tiene dos proyectos, no uno.
                </li>
                <li>
                  <strong>Área:</strong> las fases del caso (por ejemplo,
                  "Instrucción", "Audiencias", "Cierre"), cada una con sus
                  propios procesos, checklists y tareas.
                </li>
              </ul>
              <p>
                Esta estructura te da algo que una lista plana de tareas no da:
                cuando abres un expediente, ves de un vistazo en qué fase está,
                qué falta y quién es responsable — sin depender de la memoria
                de una sola persona del equipo.
              </p>
            </>
          ),
        },
        {
          heading: "Separación de casos por cliente: el patrón recomendado",
          body: (
            <>
              <p>
                Aquí hay un matiz importante en el que preferimos ser honestos en
                lugar de prometer de más: <strong>hoy Hito no tiene una función
                para exportar un solo expediente de forma aislada.</strong> El
                export de Ajustes genera un archivo <code>.json</code> con todo
                el workspace, no un archivo separado por cliente.
              </p>
              <p>
                Para un estudio que necesita aislamiento real entre clientes
                (por ejemplo, si un cliente pide que su información nunca
                comparta espacio físico con la de otro), la forma correcta de
                lograrlo con lo que Hito ofrece hoy es{" "}
                <strong>usar una carpeta de trabajo distinta por cliente</strong>.{" "}
                Hito te permite conectar y cambiar de carpeta libremente, así
                que el flujo es:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  Crea una carpeta en tu disco (o en tu sistema de backups) por
                  cada cliente.
                </li>
                <li>
                  Conecta Hito a esa carpeta cuando trabajes en ese cliente
                  específico.
                </li>
                <li>
                  Al cerrar el caso, archivas la carpeta completa (junto con
                  todo su historial, si la versionaste con Git) y queda aislada
                  del resto.
                </li>
              </ol>
              <p>
                Es más manual que un botón de "exportar este cliente", pero es
                un patrón real, verificado y que no depende de ninguna feature
                que no exista. Si tu estudio maneja pocos clientes muy sensibles
                a la vez, esta separación física es, de hecho, más segura que
                cualquier exportación automática.
              </p>
              <p>
                Para estudios con muchos clientes activos simultáneamente donde
                la separación total no es un requisito duro, un solo workspace
                con un proyecto por expediente (como describimos arriba) es más
                simple de operar en el día a día.
              </p>
            </>
          ),
        },
        {
          heading: "Documenta el proceso de apertura de expediente",
          body: (
            <>
              <p>
                Uno de los procesos que más se beneficia de estar documentado
                como SOP es la apertura de un expediente nuevo: qué documentos
                pedir, qué conflictos de interés verificar, cuándo notificar al
                cliente. Si ya tienes un{" "}
                <a
                  href="https://hito.autos/blogs/plantillas-sop-descargables"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  proceso de onboarding de cliente
                </a>{" "}
                importado en tu Biblioteca, es la base perfecta para adaptarlo a
                la apertura de un caso: agrega los pasos específicos de tu
                jurisdicción y aplícalo a cada expediente nuevo para no depender
                de que alguien "se acuerde" de todos los pasos.
              </p>
            </>
          ),
        },
        {
          heading: "Colaboración entre profesionales del estudio",
          body: (
            <>
              <p>
                Si son varios abogados trabajando sobre los mismos expedientes,
                necesitas que todos vean la misma carpeta. Las opciones, de más
                simple a más robusta:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Dropbox o Google Drive:</strong> cada persona conecta
                  Hito a la misma carpeta sincronizada. Simple, sin
                  configuración técnica.
                </li>
                <li>
                  <strong>Git:</strong> si el estudio tiene perfil técnico o
                  quiere{" "}
                  <a
                    href="https://hito.autos/blogs/versionar-proyectos-con-git"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    historial auditable de cada cambio
                  </a>
                  , versionar la carpeta con Git te da un registro completo de
                  quién cambió qué y cuándo — útil si alguna vez necesitas
                  reconstruir la cronología de un expediente.
                </li>
              </ul>
              <p>
                Ninguna de las dos requiere que el estudio dependa de un servidor
                externo para colaborar.
              </p>
            </>
          ),
        },
        {
          heading: "El asistente de IA: cuándo activarlo y cuándo no",
          body: (
            <>
              <p>
                Hito incluye un asistente de IA opcional. Es genuinamente útil
                para resumir el estado de un expediente o buscar información
                dentro de tu workspace — pero hay que ser honestos sobre el
                trade-off: cuando lo activas, el contenido relevante de tu
                workspace viaja a la API de Gemini con tu propia API key.
              </p>
              <p>
                Para un estudio jurídico, la recomendación es simple: si el
                contenido de un expediente es extremadamente sensible (por
                ejemplo, información cubierta por secreto profesional estricto),
                no actives el asistente ni la búsqueda semántica para ese
                workspace en particular. El resto de Hito —kanban, checklists,
                procesos— funciona 100% local sin necesidad de la IA. Puedes
                reservar el asistente para workspaces administrativos (gestión
                interna del estudio, no expedientes de clientes) si prefieres no
                arriesgar nada.
              </p>
            </>
          ),
        },
        {
          heading: "Backup y archivo al cerrar un caso",
          body: (
            <>
              <p>
                Cuando cierras un expediente, dos cosas razonables para hacer:
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Exporta el workspace completo</strong> desde Ajustes
                  (genera un archivo <code>{'"hito-{fecha}.json"'}</code> con todo tu
                  workspace) como respaldo adicional, sabiendo que es un backup
                  del workspace entero, no solo de ese cliente.
                </li>
                <li>
                  <strong>Archiva la carpeta física</strong> del cliente (si
                  usaste el patrón de una carpeta por cliente) en tu sistema de
                  backups o almacenamiento frío, tal como harías con cualquier
                  expediente físico.
                </li>
              </ol>
            </>
          ),
        },
        {
          heading: "Checklist de arranque en 15 minutos",
          body: (
            <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
              <li>
                Decide si vas a usar un workspace único o una carpeta por
                cliente.
              </li>
              <li>Crea tu primer producto (estudio o área de práctica).</li>
              <li>
                Da de alta tu primer expediente como proyecto, con sus áreas
                (fases del caso).
              </li>
              <li>
                Importa o crea el proceso de apertura de expediente como
                plantilla reutilizable.
              </li>
              <li>
                Decide si vas a activar el asistente de IA para este workspace,
                o dejarlo apagado.
              </li>
              <li>
                Si trabajan varios abogados, define el método de colaboración
                (Dropbox, Drive o Git).
              </li>
            </ol>
          ),
        },
        {
          heading: "Conclusión",
          body: (
            <>
              <p>
                Un estudio jurídico no necesita la herramienta con más features —
                necesita una que no ponga en riesgo el secreto profesional y que
                ordene expedientes de forma clara. Hito resuelve lo primero por
                arquitectura (sin servidor, sin cuenta) y lo segundo con una
                jerarquía simple de producto, proyecto y área. El resto son
                decisiones tuyas: cuánto aislar cada cliente, cómo colabora el
                equipo y cuándo vale la pena activar la IA.
              </p>
              <p>
                👉{" "}
                <a href="https://hito.autos/" target="_blank" rel="noopener noreferrer">
                  <strong>Prueba Hito gratis</strong>
                </a>{" "}
                — gestor de proyectos, procesos y checklists 100% local-first,
                open source (MIT). Sin cuenta, sin nube, sin suscripción.
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
