import { motion } from "framer-motion";
import { BarChart3, DollarSign, Users, TrendingUp, UserPlus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["hsl(260, 8%, 45%)", "hsl(280, 65%, 60%)", "hsl(45, 93%, 58%)", "hsl(265, 90%, 60%)", "hsl(142, 71%, 45%)"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-lg border border-border/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">{payload[0].value.toLocaleString()} T</p>
      </div>
    );
  }
  return null;
};

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

  const stats = [
    { title: "Token Guadagnati", value: `${metrics.revenue.toLocaleString()} T`, trend: metrics.revenueTrend, icon: DollarSign },
    { title: "Fan Attivi", value: metrics.activeFans.toLocaleString(), trend: metrics.fansTrend, icon: Users },
    { title: "Conversione", value: `${metrics.conversionRate}%`, trend: metrics.conversionTrend, icon: TrendingUp },
    { title: "Nuovi Abbonati", value: metrics.newSubs, trend: metrics.newSubsTrend, icon: UserPlus },
  ];

  const funnel = metrics.funnel;
  const funnelWithData = funnel.filter((s) => s.count > 0);
  const maxFunnel = Math.max(funnel[0]?.count || 0, 1);

  const hasChart = metrics.revenueChart.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Panoramica completa delle performance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card/50 border border-border/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-xl font-heading font-bold">{s.value}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{s.title}</p>
                {s.trend && <span className="text-xs font-semibold text-chart-3">{s.trend}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue chart + Pie breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card/50 border border-border/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-base">Guadagni Token</h3>
            <p className="text-xl font-heading font-bold text-primary">{metrics.revenue.toLocaleString()} T</p>
          </div>
          <div className="h-64">
            {hasChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.revenueChart}>
                  <defs>
                    <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(265, 90%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(265, 90%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 16%)" />
                  <XAxis dataKey="month" stroke="hsl(260, 8%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(260, 8%, 55%)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} T`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="hsl(265, 90%, 60%)" strokeWidth={2} fill="url(#analyticsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                I dati del grafico appariranno con più transazioni nel tempo
              </div>
            )}
          </div>
        </div>

        {/* Subscription breakdown pie */}
        <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
          <h3 className="font-heading font-bold text-base mb-4">Distribuzione Fan</h3>
          {funnelWithData.length > 0 ? (
            <>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={funnelWithData}
                      dataKey="count"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {funnelWithData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {funnelWithData.map((item, i) => (
                  <div key={item.stage} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.stage}</span>
                    </div>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
        <h3 className="font-heading font-bold text-base mb-1">Funnel di Conversione</h3>
        <p className="text-xs text-muted-foreground mb-6">Percorso dalla scoperta all'abbonamento premium</p>
        <div className="space-y-4">
          {funnel.map((item, i) => {
            const widthPercent = Math.max((item.count / maxFunnel) * 100, 8);
            const prev = funnel[i - 1]?.count;
            const rate = i > 0 && prev > 0 ? ((item.count / prev) * 100).toFixed(1) : null;
            return (
              <motion.div
                key={item.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                    {rate && <span className="text-xs text-muted-foreground">({rate}%)</span>}
                  </div>
                </div>
                <div className="h-7 bg-secondary/50 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${item.color} rounded-lg`}
                    style={{ opacity: 0.7 + i * 0.075 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Top fans */}
      {metrics.topFans.length > 0 && (
        <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
          <h3 className="font-heading font-bold text-base mb-4">Top Fan</h3>
          <div className="space-y-3">
            {metrics.topFans.map((fan, i) => (
              <motion.div
                key={fan.email}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <img src={fan.avatar} alt={fan.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fan.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{fan.email}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${fan.status === "Premium" ? "bg-chart-3/20 text-chart-3 border-chart-3/30" : "bg-primary/20 text-primary border-primary/30"}`}>
                  {fan.status}
                </span>
                <span className="text-sm font-bold text-primary min-w-[60px] text-right">{fan.spent}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
