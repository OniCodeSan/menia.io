import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { dashboardData } from "../../lib/mockData";

const statusColors = {
  Premium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Abbonato: "bg-primary/20 text-primary border-primary/30",
  Trial: "bg-chart-4/20 text-chart-4 border-chart-4/30",
};

export default function FanCRM() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card/50 border border-border/30 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-bold text-base">CRM Fan</h3>
          <p className="text-xs text-muted-foreground">Top fan per spesa</p>
        </div>
      </div>

      <div className="space-y-3">
        {dashboardData.topFans.map((fan, i) => (
          <motion.div
            key={fan.email}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <img
              src={fan.avatar}
              alt={fan.name}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fan.name}</p>
              <p className="text-xs text-muted-foreground truncate">{fan.email}</p>
            </div>
            <Badge className={`text-[10px] ${statusColors[fan.status]}`}>
              {fan.status}
            </Badge>
            <span className="text-sm font-bold text-primary min-w-[60px] text-right">{fan.spent}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}