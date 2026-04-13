import HeroSection from "../components/home/HeroSection";
import HowItWorks from "../components/home/HowItWorks";
import AdvantagesSection from "../components/home/AdvantagesSection";
import FeaturedCreators from "../components/home/FeaturedCreators";
import OnboardingCTA from "../components/home/OnboardingCTA";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <div>
      <HeroSection />
      <HowItWorks />
      <AdvantagesSection />
      <FeaturedCreators />
      <OnboardingCTA />
      
      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-bold">Unlockr</span>
          </Link>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{f.privacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{f.terms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{f.support}</a>
          </div>
          <p className="text-xs text-muted-foreground">{f.copyright}</p>
        </div>
      </footer>
    </div>
  );
}