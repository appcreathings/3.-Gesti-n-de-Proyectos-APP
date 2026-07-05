import { Hero } from "./components/Hero";
import { ValueProps } from "./components/ValueProps";
import { HowItWorks } from "./components/HowItWorks";
import { FeatureHighlights } from "./components/FeatureHighlights";
import { FinalCta } from "./components/FinalCta";

/** Public marketing/onboarding page at "/". No connection to a local folder required. */
export function LandingPage() {
  return (
    <div>
      <Hero />
      <ValueProps />
      <HowItWorks />
      <FeatureHighlights />
      <FinalCta />
    </div>
  );
}
