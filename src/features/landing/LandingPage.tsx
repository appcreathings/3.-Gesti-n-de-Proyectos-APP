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
  );
}
