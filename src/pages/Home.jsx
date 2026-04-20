import HeroSection from "../components/home/HeroSection";
import HowItWorks from "../components/home/HowItWorks";
import AdvantagesSection from "../components/home/AdvantagesSection";
import FeaturedCreators from "../components/home/FeaturedCreators";
import OnboardingCTA from "../components/home/OnboardingCTA";
import SEO from "@/components/shared/SEO";
export default function Home() {

  return (
    <div>
      <SEO />
      <HeroSection />
      <HowItWorks />
      <AdvantagesSection />
      <FeaturedCreators />
      <OnboardingCTA />
      

    </div>
  );
}