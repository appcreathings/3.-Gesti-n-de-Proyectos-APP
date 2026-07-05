import { Hero } from "./components/Hero";
import { ValueProps } from "./components/ValueProps";
import { HowItWorks } from "./components/HowItWorks";
import { FeatureHighlights } from "./components/FeatureHighlights";
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
        <ValueProps />
        <HowItWorks />
        <FeatureHighlights />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
