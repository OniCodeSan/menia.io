import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

// Menia Hero — copy-driven, single CTA, tighter padding.
//
// Hero image switch: cambia HERO_IMAGE per A/B testare versioni diverse.
//   "/hero-creator.jpg"     → versione originale (creator foto reale)
//   "/hero-creator-v2.jpg"  → versione abstract pastel
//   "/menia01.jpg"          → menia abstract pastel v2
const HERO_IMAGE = "/menia01.jpg";

export default function HeroSection() {
  const { t } = useLanguage();
  const h = t.hero;

  return (
    <section className="relative pt-2 sm:pt-3 lg:pt-4 pb-10 sm:pb-14 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-4 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-primary">{h.badgePrefix}</span>
              <span className="text-foreground/80">{h.badge}</span>
            </span>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-5 text-balance">
              {h.title1}{" "}
              <span className="text-primary">{h.title2}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed">
              {h.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Link to="/courses">
                <Button size="lg" className="group">
                  {h.cta1}
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link to="/trainer-login?mode=register">
                <Button size="lg" variant="ghost">
                  Diventa formatore
                </Button>
              </Link>
            </div>

            {/* Concrete reassurances — più forti di una row di avatar senza numero.
                Niente promesse vaghe: tre fatti verificabili sul prodotto. */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
            >
              {["Anteprima gratuita su ogni corso", "Nessuna carta richiesta", "Cancelli quando vuoi"].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-chart-3 shrink-0" />
                  {label}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Visual: lighter card, keeps the "this is what a real creator looks like"
              social-proof angle without the heavy gradient blur halos */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            {/* Hover effect: profondità solo on-hover. shadow-none default per
                visual flat; al hover, shadow-2xl + lift di 4px + leggera scale-up
                dell'immagine per creare la sensazione di "tirar fuori dal piano". */}
            <div className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-none hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ease-out">
              <img
                src={HERO_IMAGE}
                alt=""
                className="w-full aspect-[4/5] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                loading="lazy"
              />
              {/* Creator card sovrapposta solo per la versione "real creator photo".
                  Con immagine astratta (v2) la card non ha senso (no persona reale). */}
              {HERO_IMAGE === "/hero-creator.jpg" && (
                <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
                        alt="Sara Rossi"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">Sara Rossi</p>
                        <p className="text-xs text-muted-foreground">Marketing & Branding</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary">
                      Featured
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Studenti" value="2.4K" />
                    <Stat label="Lezioni" value="42" />
                    <Stat label="Live" value="8" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-secondary rounded-lg p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
