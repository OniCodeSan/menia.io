import { motion } from "framer-motion";

export default function StatCard({ title, value, trend, icon: Icon, delay = 0 }) {
  const isPositive = trend?.startsWith("+");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/50 border border-border/30 rounded-2xl p-5 hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            isPositive ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"
          }`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}