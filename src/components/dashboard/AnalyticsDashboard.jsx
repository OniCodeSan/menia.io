import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

export default function AnalyticsDashboard({ metrics }) {
  if (!metrics || !metrics.hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-primary/60" />
        </div>
        <h2 className="font-heading font-bold text-lg mb-2">Analytics non ancora disponibili</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          I grafici di performance si attiveranno automaticamente quando il tuo profilo riceverà le prime visite,
          donazioni e abbonamenti. Pubblica il tuo primo contenuto per iniziare a generare dati.
        </p>
      </motion.div>
    );
  }

  return null;
}
