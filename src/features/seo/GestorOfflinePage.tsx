import { SeoPage } from "./SeoPage";
import { SeoArticle } from "./SeoArticle";

export function GestorOfflinePage() {
  return (
    <SeoPage
      title="Hito — Gestor de proyectos offline (PWA, local-first, MIT)"
      description="Hito es un gestor de proyectos que funciona 100% offline. PWA instalable, datos en archivos .json, sin servidor, sin cuenta. Open source (MIT)."
      path="/gestor-proyectos-offline"
      ogImageAlt="Hito: gestor de proyectos offline. PWA instalable, datos locales en .json."
      schemaJson={{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Hito — Gestor de proyectos offline",
        "description": "Hito funciona 100% offline como PWA, sin servidor, con datos en archivos .json locales.",
        "author": { "@type": "Organization", "name": "Hito" },
        "publisher": { "@type": "Organization", "name": "Hito" },
        "mainEntityOfPage": "https://hito.autos/gestor-proyectos-offline",
      }}
    >
      <SeoArticle
        eyebrow="Funcionalidad"
        title="Un gestor de proyectos que funciona sin internet"
        intro="Hito es una PWA (Progressive Web App) instalable: una vez cargada, no necesita internet para funcionar. Tus proyectos, procesos, checklists y tareas viven en una carpeta local que vos elegís. La nube no es un prerrequisito para operar."
        sections={[
          {
            heading: "Cómo funciona offline",
            body: (
              <>
                <p>
                  Cuando instalás Hito, el navegador cachea la app. Después, abrir Hito es
                  abrir una aplicación nativa: ícono, splash screen, sin barra del navegador.
                  Los datos se leen y escriben directamente sobre tu carpeta de archivos
                  <code> .json</code> (vía File System Access API) o sobre IndexedDB si tu
                  navegador no soporta FSA (Firefox, Safari).
                </p>
              </>
            ),
          },
          {
            heading: "Qué pasa cuando volvés a tener internet",
            body: (
              <>
                <p>
                  Nada mágico. Hito no sincroniza con un servidor porque no hay servidor. Si
                  compartís la carpeta con tu equipo (por red, Dropbox, Git, lo que sea), la
                  sincronización la hace la herramienta que ya usás para compartir archivos.
                  Hito respeta ese flujo: no inventa uno propio.
                </p>
              </>
            ),
          },
          {
            heading: "Para qué te sirve offline-first",
            body: (
              <>
                <p>
                  Para trabajar en un avión, en una obra, en un estudio sin Wi-Fi, en una
                  zona con conectividad intermitente. Para equipos distribuidos en zonas
                  rurales o en países con infraestructura limitada. Para casos donde la
                  confidencialidad exige que los datos no toquen una red.
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
