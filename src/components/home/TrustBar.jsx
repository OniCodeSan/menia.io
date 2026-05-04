import { GraduationCap, Sparkles, MessageCircle } from "lucide-react";

// TrustBar qualitativa: finché i numeri sono bassi mostrare "2 corsi" trasmette
// l'impressione di un sito vuoto. Mostriamo invece COSA offriamo, non quanto.
const ITEMS = [
  { icon: GraduationCap, title: "Corsi pratici",         desc: "Lezioni applicabili da subito, non teoria." },
  { icon: Sparkles,      title: "Aggiornamenti continui", desc: "Nuove lezioni e materiali aggiunti dal formatore." },
  { icon: MessageCircle, title: "Community private",     desc: "Spazi dedicati per confrontarti su ogni corso." },
];

export default function TrustBar() {
  return (
    <section className="border-y border-border/50 bg-secondary/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {ITEMS.map((it, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <it.icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold text-base leading-tight">{it.title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
