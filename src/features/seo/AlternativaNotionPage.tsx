import { SeoPage } from "./SeoPage";
import { SeoArticle } from "./SeoArticle";

export function AlternativaNotionPage() {
  return (
    <SeoPage
      title="Hito — Alternativa local a Notion para gestión de proyectos (sin nube, MIT)"
      description="Hito es una alternativa local a Notion para proyectos, procesos (SOPs) y checklists. Tus datos viven en archivos .json, no en la nube. Open source y gratuita."
      path="/alternativa-notion-local"
      ogImageAlt="Hito: alternativa local a Notion con jerarquía Producto→Proyecto→Área→Proceso→Tarea."
      schemaJson={{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Hito — Alternativa local a Notion para proyectos",
        "description": "Hito reemplaza la base de datos de Notion con archivos .json locales, versionables con Git.",
        "author": { "@type": "Organization", "name": "Hito" },
        "publisher": { "@type": "Organization", "name": "Hito" },
        "mainEntityOfPage": "https://hito.autos/alternativa-notion-local",
      }}
    >
      <SeoArticle
        eyebrow="Comparativa"
        title="Hito: la alternativa local a Notion para proyectos y procesos"
        intro="Notion es un cuaderno universal. Hito es específicamente gestión de proyectos, procesos (SOPs) y checklists — y vive en una carpeta de tu equipo. Si lo que necesitas es reemplazar las bases de datos de Notion sin entregar tu información, Hito está diseñado para eso."
        sections={[
          {
            heading: "Lo que Hito toma de Notion",
            body: (
              <>
                <p>
                  Jerarquía clara, plantillas reutilizables, documentación al lado de las tareas,
                  un dashboard que muestra el estado del portafolio. La diferencia: en Hito toda
                  esa estructura es <code>Producto → Proyecto → Área → Proceso → Tarea</code>,
                  y cada nivel es un archivo .json.
                </p>
              </>
            ),
          },
          {
            heading: "Lo que Hito deja afuera a propósito",
            body: (
              <>
                <p>
                  No hay páginas libres, ni bases de datos customizables al infinito, ni
                  fórmulas tipo Excel. Hito cree que para gestión de proyectos la estructura
                  debe ser la misma para todos los equipos — porque si no, pierdes el tiempo
                  diseñando tu propio sistema en lugar de usarlo.
                </p>
              </>
            ),
          },
          {
            heading: "Para quién tiene sentido migrar",
            body: (
              <>
                <p>
                  Equipos que ya versionan su trabajo en Git y quieren que la gestión de
                  proyectos viva en el mismo repo. Equipos que necesitan que sus SOPs sean
                  auditables (legal, contable, salud). Equipos que trabajan en entornos donde
                  subir datos a una nube estadounidense o europea no es opción.
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
