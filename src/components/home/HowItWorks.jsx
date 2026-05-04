import { motion } from "framer-motion";
import { Search, PlayCircle, Target } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// HowItWorks — 3 step icon-driven, copy action-oriented.
// Spec Menia: outline icons grandi, no gradient pesanti, numerazione discreta.
// Step 2 NON usa CreditCard: visivamente suggerisce "paga" ed è coerente
// con il modello platform-subscription (l'utente non paga il singolo corso).
const ICONS = [Search, PlayCircle, Target];

export default function HowItWorks() {
  const { t } = useLanguage();
  const hw = t.howItWorks;

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{hw.label}</p>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
            {hw.title1} <span className="text-primary">{hw.title2}</span>
          </h2>
        </div>

        {/* Step grid with connecting line on desktop */}
        <div className="relative grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Connector line — sits behind cards on md+ */}
          <div
            className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-border"
            aria-hidden
          />
          {hw.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Passo {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold mb-2 leading-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
