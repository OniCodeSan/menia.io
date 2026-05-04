import HeroSection      from "../components/home/HeroSection";
import TrustBar          from "../components/home/TrustBar";
import StartHere         from "../components/home/StartHere";
import FeaturedCourses   from "../components/home/FeaturedCourses";
import FreeTrialBlock    from "../components/home/FreeTrialBlock";
import HowItWorks        from "../components/home/HowItWorks";
import FeaturedCreators  from "../components/home/FeaturedCreators";
import AdvantagesSection from "../components/home/AdvantagesSection";
import OnboardingCTA     from "../components/home/OnboardingCTA";
import SEO from "@/components/shared/SEO";

// Menia home composition.
//   Hero (CTA principale) → Trust qualitative → "Inizia da qui" 3 percorsi →
//   Corsi in evidenza → Free-trial conversion block → Come funziona →
//   Formatori reali → Differenziatori → Split CTA finale.
// Skipped: testimonials. Senza voci raccolte da utenti veri sarebbe un dark pattern.
export default function Home() {
  return (
    <div>
      <SEO />
      <HeroSection />
      <TrustBar />
      <StartHere />
      <FeaturedCourses />
      <FreeTrialBlock />
      <HowItWorks />
      <FeaturedCreators />
      <AdvantagesSection />
      <OnboardingCTA />
    </div>
  );
}
