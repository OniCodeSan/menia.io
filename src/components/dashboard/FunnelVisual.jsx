import { motion } from "framer-motion";
import { Filter } from "lucide-react";

export default function FunnelVisual({ metrics }) {
  if (!metrics) return null;
  const funnel = metrics.funnel;
  const hasData = funnel.some((s) => s.count > 0);
  const maxCount = Math.max(funnel[0]?.count || 0, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card/50 border border-border/30 rounded-2xl p-6"
    >
      <h3 className="font-heading font-bold text-base mb-1">Funnel di Conversione</h3>
      <p className="text-xs text-muted-foreground mb-6">Free → Trial → Abbonamento → Premium</p>

      {hasData ? (
        <div className="space-y-4">
          {funnel.map((item, i) => {
            const widthPercent = Math.max((item.count / maxCount) * 100, 15);
            const prev = funnel[i - 1]?.count;
            const conversionRate = i > 0 && prev > 0
              ? ((item.count / prev) * 100).toFixed(1)
              : null;

            return (
              <motion.div
                key={item.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                    {conversionRate && (
                      <span className="text-xs text-muted-foreground">({conversionRate}%)</span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-secondary/50 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${item.color} rounded-lg`}
                    style={{ opacity: 0.7 + (i * 0.075) }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Filter className="w-6 h-6 text-primary/60" />
          </div>
          <p className="text-sm font-semibold mb-1">Funnel vuoto</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Quando i primi visitatori arriveranno sul tuo profilo, vedrai qui il percorso dalla scoperta all'abbonamento.
          </p>
        </div>
      )}
    </motion.div>
  );
}
