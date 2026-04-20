import { motion } from "framer-motion";
import { Upload, Zap, DollarSign } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const ICONS = [Upload, Zap, DollarSign];
const GRADIENTS = ["from-primary/20 to-primary/5", "from-accent/20 to-accent/5", "from-chart-3/20 to-chart-3/5"];
const ICON_COLORS = ["text-primary", "text-accent", "text-chart-3"];
const STEP_NUMS = ["01", "02", "03"];

export default function HowItWorks() {
  const { t } = useLanguage();
  const hw = t.howItWorks;

  return (
    <section className="py-12 sm:py-24 px-4 sm:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">{hw.label}</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            {hw.title1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{hw.title2}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {hw.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i]} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative bg-card/50 border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className={`w-6 h-6 ${ICON_COLORS[i]}`} />
                    </div>
                    <span className="text-4xl font-heading font-bold text-border/80">{STEP_NUMS[i]}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}