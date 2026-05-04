import { motion } from "framer-motion";
import { BookOpen, Radio, Users } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// AdvantagesSection — 3 differenziatori veri (con copy ricco).
// Spec Menia: rimosso "Pagamenti sicuri" perché non è un differenziatore
// reale (lo fanno tutti) — è ora coperto in §4 dei Termini.
const ICONS = [BookOpen, Radio, Users];

export default function AdvantagesSection() {
  const { t } = useLanguage();
  const adv = t.advantages;

  // Mostra solo i primi 3 item anche se l'i18n ne contiene di più.
  const items = (adv.items || []).slice(0, 3);

  return (
    <section className="py-16 sm:py-20 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{adv.label}</p>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight mb-3">
            {adv.title1} <span className="text-primary">{adv.title2}</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">{adv.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const Icon = ICONS[i] || BookOpen;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="font-heading font-bold text-base mb-2 leading-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
