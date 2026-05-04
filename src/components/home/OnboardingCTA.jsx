import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

// Final CTA — split in due colonne (studente / creator) come da spec.
// Niente garanzie generiche tipo "supporto in italiano": le promesse vere
// vivono sui Termini & Privacy.
export default function OnboardingCTA() {
  const { t } = useLanguage();
  const c = t.finalCta || {};

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-center leading-tight tracking-tight mb-10">
          {c.title || "Pronto a iniziare?"}
        </h2>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Studenti */}
          <div className="bg-card border border-border rounded-2xl p-7 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5 text-primary" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-xl font-bold mb-2">
              {c.studentTitle || "Voglio imparare"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
              {c.studentText || "Trova un corso che ti aiuti a fare il prossimo passo, dalla teoria alla pratica."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link to="/courses">
                <Button className="w-full sm:w-auto">
                  {c.studentCta || "Esplora i corsi"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground sm:ml-2">
                {c.studentLink || "Sfoglia senza registrarti"}
              </Link>
            </div>
          </div>

          {/* Formatori */}
          <div className="bg-card border border-primary/30 rounded-2xl p-7 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-xl font-bold mb-2">
              {c.creatorTitle || "Voglio insegnare"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
              {c.creatorText || "Trasforma le tue competenze in corsi e live. Pubblichi tu, decidi tu il prezzo."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link to="/trainer-portal">
                <Button className="w-full sm:w-auto">
                  {c.creatorCta || "Diventa formatore"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground sm:ml-2">
                {c.creatorLink || "Vedi piani e prezzi"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
