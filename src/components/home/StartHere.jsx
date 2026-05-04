import { Link } from "react-router-dom";
import { Megaphone, Rocket, Sparkles, ArrowRight } from "lucide-react";

// Entry point per chi non sa da dove iniziare: 3 macro-percorsi che corrispondono
// a categorie reali di corsi. Ogni card ha un accent-color distinto + icona
// caratterizzata per renderle visivamente scansionabili (non sembrare un menu).
const PATHS = [
  {
    icon: Megaphone,
    title: "Marketing digitale",
    desc: "Acquisisci clienti, vendi meglio, costruisci presenza online.",
    href: "/courses?cat=marketing",
    // viola primary
    accent: "from-primary/15 to-primary/5",
    border: "hover:border-primary/50",
    iconBg: "bg-primary/15 text-primary",
    glow: "from-primary/30",
  },
  {
    icon: Rocket,
    title: "Business e monetizzazione",
    desc: "Trasforma competenze, contenuti o servizi in entrate ricorrenti.",
    href: "/courses?cat=business",
    // ambra/oro
    accent: "from-amber-500/15 to-amber-500/5",
    border: "hover:border-amber-500/50",
    iconBg: "bg-amber-500/15 text-amber-600",
    glow: "from-amber-500/30",
  },
  {
    icon: Sparkles,
    title: "Creatività e contenuti",
    desc: "Migliora video, foto, copy, design e comunicazione.",
    href: "/courses?cat=creativity",
    // teal/emerald — pari intensità a primary/amber
    accent: "from-emerald-500/15 to-emerald-500/5",
    border: "hover:border-emerald-500/50",
    iconBg: "bg-emerald-500/15 text-emerald-600",
    glow: "from-emerald-500/30",
  },
];

export default function StartHere() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Inizia da qui</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Scegli il percorso che ti interessa
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PATHS.map((p) => (
            <Link
              key={p.title}
              to={p.href}
              className={`group relative bg-gradient-to-br ${p.accent} bg-card border border-border/40 ${p.border} rounded-2xl p-5 sm:p-6 transition-all hover:shadow-md flex flex-col overflow-hidden`}
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${p.glow} to-transparent blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
              <div className={`relative w-12 h-12 rounded-xl ${p.iconBg} flex items-center justify-center mb-4`}>
                <p.icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="relative font-heading font-bold text-lg mb-1">{p.title}</h3>
              <p className="relative text-sm text-muted-foreground flex-1">{p.desc}</p>
              <span className="relative mt-4 text-sm font-semibold text-foreground inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Esplora <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:text-left">
          <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Vedi tutti i percorsi <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
