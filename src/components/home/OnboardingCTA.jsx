import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

export default function OnboardingCTA() {
  const { t } = useLanguage();
  const c = t.cta;

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl opacity-40" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border/50 bg-card/80 p-8 sm:p-12 text-center overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-6" />
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            {c.title1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{c.title2}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">{c.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/creator-onboarding" className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm sm:text-base px-6 sm:px-8 h-12 rounded-md text-primary-foreground w-full sm:w-auto group">
              {c.button}
              <ArrowRight className="w-4 h-4 ml-2 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <span>✓ {c.feature1}</span>
            <span>✓ {c.feature2}</span>
            <span>✓ {c.feature3}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}