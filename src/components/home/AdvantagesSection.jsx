import { motion } from "framer-motion";
import { GitBranch, Users, TrendingUp, MessageCircle, Shield, BarChart3 } from "lucide-react";

const advantages = [
  {
    icon: GitBranch,
    title: "Funnel Automatici",
    description: "Converti visitatori in fan paganti con sequenze automatizzate.",
  },
  {
    icon: Users,
    title: "CRM Fan",
    description: "Gestisci i tuoi fan con segmenti, tag e analisi comportamentale.",
  },
  {
    icon: TrendingUp,
    title: "Monetizzazione Avanzata",
    description: "Abbonamenti, pay-per-view, messaggi privati, bundle esclusivi.",
  },
  {
    icon: MessageCircle,
    title: "Messaggistica Premium",
    description: "Messaggi diretti monetizzabili con risposte prioritarie.",
  },
  {
    icon: Shield,
    title: "Protezione Contenuti",
    description: "DRM avanzato e watermark automatici per proteggere il tuo lavoro.",
  },
  {
    icon: BarChart3,
    title: "Analytics Pro",
    description: "Dashboard completa con metriche di conversione e retention.",
  },
];

export default function AdvantagesSection() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-semibold text-sm tracking-widest uppercase mb-3">Vantaggi</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Tutto quello che ti serve per{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">crescere</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Strumenti professionali pensati per massimizzare le tue entrate e costruire una community fedele.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <motion.div
              key={adv.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-card/30 border border-border/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <adv.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-base mb-2">{adv.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{adv.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}