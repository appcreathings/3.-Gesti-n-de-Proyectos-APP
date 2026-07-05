import type { BlogArticle } from "../types";

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "gestion-proyectos-sin-nube",
    title: "Gestión de proyectos sin nube: por qué la soberanía de datos es una ventaja",
    excerpt:
      "Descubrí por qué cada vez más equipos eligen un gestor de proyectos sin nube. Control total, privacidad real y datos que siempre podés migrar.",
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
                <code>.json</code> dentro de una carpeta que vos elegís en tu
                equipo.
              </p>
              <p>
                Eso no significa que no puedas compartir el trabajo. Podés usar
                Git, Dropbox, una red local o cualquier medio que ya utilices.
                La diferencia es que vos decidís dónde y cómo se sincronizan los
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
                  dispositivo a menos que vos lo decidas.
                </li>
                <li>
                  <strong>Control total:</strong> podés abrir, editar, versionar y
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
                  <strong>Migrabilidad garantizada:</strong> si mañana cambiás de
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
                sin renunciar al control. Si buscás una alternativa a Notion o una
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
                    Sí. Como los datos son archivos, podés compartir la carpeta por
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
        {
          heading: "Plantillas de checklist: documentar una vez, usar siempre",
          body: (
            <>
              <p>
                Las tareas repetitivas son el mejor lugar para empezar. Si todos
                los meses hacés un lanzamiento, una reunión de retro o una
                auditoría de seguridad, convertí esos pasos en una plantilla de
                checklist. Así no tenés que recordar qué preguntar ni qué revisar:
                la plantilla lo hace por vos.
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
                    tres minutos de lectura es ideal. Si es más largo, dividilo en
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
          contás? Si querés usar un{" "}
          <strong>asistente de IA para proyectos</strong> sin convertirte en el
          producto, necesitás entender cómo se procesa la información.
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
                No se trata de no usar IA. Se trata de usarla de forma que vos
                decidas qué compartís, cuándo y bajo qué términos.
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
                  <strong>Vos controlás la clave:</strong> usás tu propia API key
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
                Vos decidís si activarlo, con qué modelo y cuándo desactivarlo.
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
                    riesgo, pero siempre revisá los términos del modelo.
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
      "No necesitás más apps: necesitás una estructura clara. Descubrí una jerarquía práctica para organizar proyectos, áreas, procesos y tareas.",
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
                    Podés tener proyectos sueltos, pero conviene agruparlos bajo
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
          no controlás. Para muchos equipos, eso es más riesgo del que parece.
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
                    cuando disparás un evento relevante.
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
