import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Sparkles, Gift, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { kpiApi } from "@/lib/api";

// Final CTA — split in due colonne (studente / creator).
// La card formatore mostra anche i 3 piani + counter live promo "primi N formatori".
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

          {/* Formatori — con preview piani + promo counter */}
          <CreatorCard c={c} />
        </div>
      </div>
    </section>
  );
}

// I 3 piani standard (Master è "contact only", non lo mostriamo qui)
const PLANS_PREVIEW = [
  { id: "free",    name: "Base",    price: "4,99",  desc: "1 corso · analytics base" },
  { id: "starter", name: "Starter", price: "14,90", desc: "5 corsi · boost +10",        recommended: true },
  { id: "pro",     name: "Grow",    price: "29,90", desc: "15 corsi · analytics full" },
];

function CreatorCard({ c }) {
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    kpiApi.promoStatus()
      .then((r) => setPromo(r))
      .catch(() => setPromo({ tier: 1, months: 1, slots_remaining: null }));
  }, []);

  return (
    <div className="bg-card border border-primary/30 rounded-2xl p-7 flex flex-col relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <div className="relative w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="relative font-heading text-xl font-bold mb-2">
        {c.creatorTitle || "Voglio insegnare"}
      </h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed mb-4">
        {c.creatorText || "Pubblica corsi e contenuti premium in uno spazio dedicato — senza piattaforme separate."}
      </p>

      {/* Promo banner — visibile solo se ci sono ancora slot tier 2 o 3 */}
      {promo && promo.tier > 1 && (
        <PromoBanner promo={promo} />
      )}

      {/* Tier piani */}
      <div className="relative grid grid-cols-3 gap-2 mb-5">
        {PLANS_PREVIEW.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl p-2.5 border ${p.recommended ? "border-accent/40 bg-accent/5" : "border-border/40 bg-secondary/20"}`}
          >
            {p.recommended && (
              <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-accent mb-0.5">Consigliato</span>
            )}
            <p className="font-heading font-bold text-sm leading-tight">{p.name}</p>
            <p className="text-base font-bold mt-0.5">€{p.price}<span className="text-[10px] text-muted-foreground font-normal">/mese</span></p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center mt-auto">
        <Link to="/trainer-login?mode=register">
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
  );
}

function PromoBanner({ promo }) {
  const isHotTier = promo.tier === 3;
  const Icon = isHotTier ? Flame : Gift;
  const tone = isHotTier
    ? "bg-amber-500/15 border-amber-500/40 text-amber-700"
    : "bg-primary/10 border-primary/30 text-primary";
  return (
    <div className={`relative inline-flex items-start gap-2 rounded-lg border px-3 py-2 mb-4 text-xs ${tone}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="leading-snug">
        <strong>{promo.months} mesi gratis</strong> sul tuo piano formatore
        {promo.slots_remaining != null && promo.slots_remaining > 0 && (
          <> — restano <strong>{promo.slots_remaining}</strong> post{promo.slots_remaining === 1 ? "o" : "i"} a questo prezzo</>
        )}.
        <span className="block text-[10px] mt-0.5 opacity-80">Non cumulabile · 1 sola attivazione per email</span>
      </div>
    </div>
  );
}
