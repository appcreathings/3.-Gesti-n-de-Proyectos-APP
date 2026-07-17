import { Helmet } from "react-helmet-async";
import { ScrollToHash } from "@/components/ScrollToHash";
import { LandingNav } from "@/features/landing/components/LandingNav";
import { LandingFooter } from "@/features/landing/components/LandingFooter";
import { StickyCta } from "@/features/landing/components/StickyCta";

type SeoPageProps = {
  title: string;
  description: string;
  path: string;
  ogImageAlt?: string;
  schemaJson?: object;
  children: React.ReactNode;
};

/**
 * Layout shell for SEO satellite pages. Reuses the landing chrome (nav/footer)
 * and centralises <Helmet> meta so the same canonical, OG, and Twitter patterns
 * are applied everywhere.
 */
export function SeoPage({
  title,
  description,
  path,
  ogImageAlt,
  schemaJson,
  children,
}: SeoPageProps) {
  const url = `https://hito.autos${path}`;
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_CO" />
        <meta property="og:site_name" content="Hito" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content="https://hito.autos/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {ogImageAlt ? <meta property="og:image:alt" content={ogImageAlt} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://hito.autos/og-image.png" />
        {schemaJson ? (
          <script type="application/ld+json">{JSON.stringify(schemaJson)}</script>
        ) : null}
      </Helmet>
      <ScrollToHash />
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <StickyCta />
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </>
  );
}
