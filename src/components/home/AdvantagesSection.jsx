import { motion } from "framer-motion";
import { GitBranch, Users, TrendingUp, MessageCircle, Shield, BarChart3 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const ICONS = [GitBranch, Users, TrendingUp, MessageCircle, Shield, BarChart3];

export default function AdvantagesSection() {
  const { t } = useLanguage();
  const adv = t.advantages;

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-semibold text-sm tracking-widest uppercase mb-3">{adv.label}</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            {adv.title1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">{adv.title2}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{adv.subtitle}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {adv.items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl bg-card/30 border border-border/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}