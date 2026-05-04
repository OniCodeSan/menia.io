import { motion } from "framer-motion";
import InfoTooltip from "@/components/ui/InfoTooltip";

export default function StatCard({ title, value, icon: Icon, color = "text-primary", trend, hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/30 rounded-2xl p-4"
    >
      {Icon && <Icon className={`w-5 h-5 ${color} mb-2`} />}
      <p className="text-2xl font-heading font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-1 inline-flex items-center gap-1">
        {title}
        {hint && <InfoTooltip text={hint} />}
      </p>
      {trend && <p className="text-[10px] text-chart-3 font-semibold mt-1">↑ {trend}</p>}
    </motion.div>
  );
}
