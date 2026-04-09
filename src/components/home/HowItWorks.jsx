import { motion } from "framer-motion";
import { Upload, Zap, DollarSign } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Pubblica",
    description: "Carica i tuoi contenuti esclusivi: video, foto, messaggi. Crea piani di abbonamento personalizzati.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: Zap,
    step: "02",
    title: "Automatizza",
    description: "Attiva funnel automatici, messaggi di benvenuto, offerte personalizzate. La piattaforma lavora per te.",
    gradient: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
  },
  {
    icon: DollarSign,
    step: "03",
    title: "Guadagna",
    description: "Monetizza ogni interazione: abbonamenti, contenuti premium, messaggi privati. Massimizza le entrate.",
    gradient: "from-chart-3/20 to-chart-3/5",
    iconColor: "text-chart-3",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">Come funziona</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            Tre passi verso la{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">monetizzazione</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative bg-card/50 border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                  </div>
                  <span className="text-4xl font-heading font-bold text-border/80">{step.step}</span>
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}