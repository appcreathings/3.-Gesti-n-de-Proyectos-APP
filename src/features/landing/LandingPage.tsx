import { Helmet } from "react-helmet-async";
import { ScrollToHash } from "@/components/ScrollToHash";
import { Hero } from "./components/Hero";
import { TrustBar } from "./components/TrustBar";
import { ProductMockup } from "./components/ProductMockup";
import { ValueProps } from "./components/ValueProps";
import { HowItWorks } from "./components/HowItWorks";
import { FeatureHighlights } from "./components/FeatureHighlights";
import { Comparison } from "./components/Comparison";
import { UseCases } from "./components/UseCases";
import { Faq } from "./components/Faq";
import { FinalCta } from "./components/FinalCta";
import { LandingNav } from "./components/LandingNav";
import { LandingFooter } from "./components/LandingFooter";
import { StickyCta } from "./components/StickyCta";
import { TrustBadges } from "./components/TrustBadges";
import { Reveal } from "./components/Reveal";

/** Public marketing/onboarding page at "/". No connection to a local folder required. */
export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Hito — Gestión de proyectos, procesos (SOPs) y checklists 100% local-first</title>
        <meta name="description" content="Hito gestiona proyectos, procesos, checklists y tareas con privacidad total. Local-first: tus datos nunca salen de tu equipo. Sin nube, sin cuenta, sin suscripción. Kanban, automatizaciones, asistente IA y PWA offline. Gratuito y open source (MIT)." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_AR" />
        <meta property="og:site_name" content="Hito" />
        <meta property="og:title" content="Hito — Gestión de proyectos, procesos y checklists 100% local-first" />
        <meta property="og:description" content="Gestioná productos, proyectos, SOPs y checklists con privacidad total. Tus datos viven en tu equipo, no en la nube. Gratuito, open source, offline-first." />
        <meta property="og:url" content="https://hito.autos/" />
        <meta property="og:image" content="https://hito.autos/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@hito" />
        <meta name="twitter:creator" content="@hito" />
        <meta name="twitter:title" content="Hito — Gestión de proyectos, procesos y checklists 100% local-first" />
        <meta name="twitter:description" content="Gestioná proyectos, SOPs y checklists sin rendir cuentas a la nube. Local-first, open source, offline." />
        <meta name="twitter:image" content="https://hito.autos/og-image.png" />
        <meta name="application-name" content="Hito" />
        <link rel="canonical" href="https://hito.autos/" />
        <meta name="og:image:alt" content="Hito — gestor de proyectos local-first. Vista del Kanban con árbol de proyectos." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Hito",
            "url": "https://hito.autos/",
            "logo": "https://hito.autos/icon.svg",
            "description": "Gestor de proyectos, procesos y checklists local-first y open source.",
            "sameAs": [
              "https://github.com/hito-app/hito"
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Hito",
            "url": "https://hito.autos/",
            "inLanguage": "es-AR",
            "publisher": { "@type": "Organization", "name": "Hito" }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "¿Mis datos están seguros en Hito?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Sí. Hito es local-first: tus datos nunca se envían a ningún servidor. Viven en archivos .json dentro de una carpeta que vos elegís en tu equipo. No hay backend, no hay nube, no hay terceros con acceso."
                }
              },
              {
                "@type": "Question",
                "name": "¿Puedo compartir la carpeta con mi equipo?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Sí. Como los datos son archivos .json en una carpeta local, podés compartirla por red, Dropbox, Google Drive, Git o cualquier medio que ya uses. Cada persona abre la misma carpeta desde su Hito."
                }
              },
              {
                "@type": "Question",
                "name": "¿Hito funciona sin internet?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Sí. Hito es una PWA (Progressive Web App) que funciona completamente offline. Una vez instalada, podés gestionar proyectos, procesos y tareas sin conexión. Los datos se sincronizan cuando volvés a estar online si compartís la carpeta."
                }
              },
              {
                "@type": "Question",
                "name": "¿Hito es realmente gratis?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Sí. Hito es 100% gratuito y open source bajo licencia MIT. No hay planes pagos, no hay suscripciones, no hay límites ocultos. Podés usarlo para proyectos personales, profesionales o comerciales sin restricciones."
                }
              },
              {
                "@type": "Question",
                "name": "¿Qué diferencia a Hito de Trello, Notion o ClickUp?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "La diferencia fundamental es la privacidad y el control de datos. Trello, Notion y ClickUp guardan tus datos en sus servidores. Hito es local-first: tus datos viven en tu equipo, son archivos .json legibles y versionables con Git. No necesitás cuenta, no hay límite de usuarios, y funcionás offline."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <ScrollToHash />
      <div className="min-h-screen flex flex-col">
      <LandingNav />
      <StickyCta />
      <main className="flex-1">
        <Hero />
        <Reveal>
          <div className="mx-auto -mt-12 max-w-3xl px-6 pb-2">
            <TrustBadges />
          </div>
        </Reveal>
        <Reveal><TrustBar /></Reveal>
        <Reveal delay={100}><ProductMockup /></Reveal>
        <Reveal delay={50}><ValueProps /></Reveal>
        <Reveal delay={100}><HowItWorks /></Reveal>
        <Reveal delay={150}><FeatureHighlights /></Reveal>
        <Reveal delay={200}><Comparison /></Reveal>
        <Reveal delay={250}><UseCases /></Reveal>
        <Reveal delay={300}><Faq /></Reveal>
        <Reveal delay={150}><FinalCta /></Reveal>
      </main>
      <LandingFooter />
    </div>
    </>
  );
}
