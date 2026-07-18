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
