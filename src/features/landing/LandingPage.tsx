import { Helmet } from "react-helmet-async";
import { Hero } from "./components/Hero";
import { ProductMockup } from "./components/ProductMockup";
import { ValueProps } from "./components/ValueProps";
import { HowItWorks } from "./components/HowItWorks";
import { FeatureHighlights } from "./components/FeatureHighlights";
import { UseCases } from "./components/UseCases";
import { FinalCta } from "./components/FinalCta";
import { LandingNav } from "./components/LandingNav";
import { LandingFooter } from "./components/LandingFooter";

/** Public marketing/onboarding page at "/". No connection to a local folder required. */
export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Hito — Gestión de proyectos local-first</title>
        <meta name="description" content="Hito: gestor de proyectos local-first. Productos, proyectos, procesos (SOPs), checklists, Kanban y automatizaciones. Tus datos nunca salen de tu equipo." />
        <meta property="og:title" content="Hito — Gestión de proyectos local-first" />
        <meta property="og:description" content="Gestión de proyectos, procesos y checklists 100% local: tus datos viven en una carpeta de tu equipo." />
        <meta property="og:url" content="https://hito.autos/" />
        <meta property="og:image" content="https://hito.autos/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hito — Gestión de proyectos local-first" />
        <meta name="twitter:description" content="Gestión de proyectos, procesos y checklists 100% local: tus datos viven en una carpeta de tu equipo." />
        <meta name="twitter:image" content="https://hito.autos/og-image.png" />
        <link rel="canonical" href="https://hito.autos/" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <ProductMockup />
        <ValueProps />
        <HowItWorks />
        <FeatureHighlights />
        <UseCases />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
    </>
  );
}
