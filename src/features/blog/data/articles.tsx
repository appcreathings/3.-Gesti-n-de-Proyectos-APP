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
