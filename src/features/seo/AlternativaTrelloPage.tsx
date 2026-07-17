import { SeoPage } from "./SeoPage";
import { SeoArticle } from "./SeoArticle";

export function AlternativaTrelloPage() {
  return (
    <SeoPage
      title="Hito — Alternativa local-first a Trello (sin nube, sin cuenta, MIT)"
      description="¿Buscas una alternativa a Trello que funcione offline y guarde tus datos en una carpeta de tu equipo? Hito es open source, local-first, y gratuita."
      path="/alternativa-trello"
      ogImageAlt="Hito como alternativa local-first a Trello: Kanban drag-and-drop, datos en .json."
      schemaJson={{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Hito — Alternativa local-first a Trello",
        "description": "Hito es una alternativa a Trello 100% local-first, open source, offline, sin cuenta y gratuita.",
        "author": { "@type": "Organization", "name": "Hito" },
        "publisher": { "@type": "Organization", "name": "Hito" },
        "mainEntityOfPage": "https://hito.autos/alternativa-trello",
      }}
    >
      <SeoArticle
        eyebrow="Comparativa"
        title="Hito: la alternativa a Trello que no te pide tus datos"
        intro="Trello es una herramienta excelente para tableros Kanban. Pero tus tarjetas viven en sus servidores, y la versión gratis tiene límites que aparecen justo cuando un equipo empieza a escalar. Hito toma lo mejor de Trello (Kanban arrastrable, etiquetas, miembros) y lo guarda en archivos .json en una carpeta que tú controlas."
        sections={[
          {
            heading: "Qué comparten Hito y Trello",
            body: (
              <>
                <p>
                  Ambos son tableros Kanban con columnas, tarjetas, etiquetas, fechas y miembros.
                  Hito usa la misma metáfora mental: arrastrar para cambiar de estado, ver el
                  progreso de un vistazo, mover cosas entre columnas sin perder contexto.
                </p>
                <p>
                  La diferencia no está en el modelo mental — está en dónde viven los datos y
                  quién decide cómo se comparten.
                </p>
              </>
            ),
          },
          {
            heading: "Qué cambia cuando los datos son tuyos",
            body: (
              <>
                <p>
                  En Trello, abrir un tablero nuevo es una decisión con consecuencias: dependes
                  de su uptime, de su plan, de si te siguen dando el export a JSON. En Hito, abrir
                  un proyecto es crear un archivo <code>q3-lanzamiento.json</code> en una carpeta.
                </p>
                <p>
                  Si mañana dejas de usar Hito, los archivos siguen ahí: legibles, editables con
                  cualquier editor de texto, versionables con Git. Si necesitas migrar, ya
                  tienes el formato abierto.
                </p>
              </>
            ),
          },
          {
            heading: "Limitaciones honestas",
            body: (
              <>
                <p>
                  Hito no tiene notificaciones push en tiempo real, ni integraciones con Slack,
                  ni automatizaciones de terceros. Lo que tiene son reglas
                  <em> trigger → condición → acción </em> que viven dentro de tu carpeta y
                  funcionan sin internet.
                </p>
                <p>
                  Si tu equipo es &gt; 50 personas, vive en 5 zonas horarias y necesita
                  colaboración en tiempo real sobre los mismos tableros, Trello (o Linear, o
                  Jira) sigue siendo la mejor opción. Hito no compite ahí.
                </p>
              </>
            ),
          },
        ]}
        cta={{ label: "Probar Hito — sin registro" }}
      />
    </SeoPage>
  );
}
