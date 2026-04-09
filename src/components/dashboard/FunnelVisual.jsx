import { motion } from "framer-motion";
import { dashboardData } from "../../lib/mockData";

export default function FunnelVisual() {
  const maxCount = dashboardData.funnel[0].count;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card/50 border border-border/30 rounded-2xl p-6"
    >
      <h3 className="font-heading font-bold text-base mb-1">Funnel di Conversione</h3>
      <p className="text-xs text-muted-foreground mb-6">Free → Trial → Abbonamento → Premium</p>

      <div className="space-y-4">
        {dashboardData.funnel.map((item, i) => {
          const widthPercent = Math.max((item.count / maxCount) * 100, 15);
          const conversionRate = i > 0 
            ? ((item.count / dashboardData.funnel[i - 1].count) * 100).toFixed(1) 
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
    </motion.div>
  );
}