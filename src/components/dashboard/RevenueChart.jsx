import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const CustomTooltip = /** @type {any} */ (({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-lg border border-border/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">{payload[0].value.toLocaleString()} T</p>
      </div>
    );
  }
  return null;
});

export default function RevenueChart({ metrics }) {
  if (!metrics) return null;
  const hasData = metrics.revenueChart.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card/50 border border-border/30 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-bold text-base">Guadagni Token</h3>
          <p className="text-xs text-muted-foreground">Totale guadagnato</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading font-bold text-primary">{metrics.revenue.toLocaleString()} T</p>
          {metrics.revenueTrend && (
            <p className="text-xs text-chart-3 font-semibold">{metrics.revenueTrend} vs mese scorso</p>
          )}
        </div>
      </div>

      <div className="h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.revenueChart}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(265, 90%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(265, 90%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 16%)" />
              <XAxis
                dataKey="month"
                stroke="hsl(260, 8%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(260, 8%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} T`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(265, 90%, 60%)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-primary/60" />
            </div>
            <p className="text-sm font-semibold mb-1">Nessun dato ancora</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Le tue entrate appariranno qui non appena i fan inizieranno ad abbonarsi o a sbloccare i tuoi contenuti.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
