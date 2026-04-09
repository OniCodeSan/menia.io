import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Heart, Users, Zap, Radio } from "lucide-react";

const RANGES = [
  { label: "7G", days: 7 },
  { label: "30G", days: 30 },
  { label: "90G", days: 90 },
  { label: "1A", days: 365 },
];

// ── Data generators ──────────────────────────────────────────────────────────
function generateDonations(days) {
  const data = [];
  let base = 120;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    base = Math.max(20, base + (Math.random() - 0.48) * 40);
    const isLiveDay = Math.random() < 0.15;
    data.push({
      date: d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      donazioni: Math.round(base + (isLiveDay ? 200 + Math.random() * 300 : 0)),
      live: isLiveDay,
    });
  }
  return data;
}

function generateConversion(days) {
  const data = [];
  let visitors = 800, subs = 60;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    visitors = Math.max(200, visitors + (Math.random() - 0.45) * 80);
    subs = Math.max(5, subs + (Math.random() - 0.42) * 8);
    data.push({
      date: d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      visitatori: Math.round(visitors),
      abbonati: Math.round(subs),
      tasso: parseFloat(((subs / visitors) * 100).toFixed(2)),
    });
  }
  return data;
}

function generateLiveEngagement(days) {
  const data = [];
  const liveCount = Math.max(3, Math.round(days / 7));
  for (let i = 0; i < liveCount; i++) {
    const d = new Date();
    d.setDate(d.getDate() - Math.round(Math.random() * days));
    const peak = 200 + Math.round(Math.random() * 1800);
    data.push({
      date: d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      picco: peak,
      medio: Math.round(peak * (0.4 + Math.random() * 0.3)),
      donazioni: Math.round(peak * (0.8 + Math.random() * 1.2)),
      durata: Math.round(30 + Math.random() * 90),
    });
  }
  return data.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>
            {prefix}{typeof p.value === "number" ? p.value.toLocaleString("it-IT") : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, trend, color, delay }) {
  const up = parseFloat(trend) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/50 border border-border/30 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-chart-3" : "text-destructive"}`}>
          {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {up ? "+" : ""}{trend}%
        </span>
      </div>
      <div>
        <p className="text-2xl font-heading font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Chart wrapper ─────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/50 border border-border/30 rounded-2xl p-5"
    >
      <div className="mb-4">
        <h3 className="font-heading font-bold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

// ── Sampling helper ───────────────────────────────────────────────────────────
function sample(data, maxPoints = 30) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [range, setRange] = useState(30);

  const donationsData = useMemo(() => sample(generateDonations(range)), [range]);
  const conversionData = useMemo(() => sample(generateConversion(range)), [range]);
  const liveData = useMemo(() => generateLiveEngagement(range), [range]);

  const totalDonations = donationsData.reduce((s, d) => s + d.donazioni, 0);
  const avgConversion = (conversionData.reduce((s, d) => s + d.tasso, 0) / conversionData.length).toFixed(1);
  const totalSubs = conversionData.reduce((s, d) => s + d.abbonati, 0);
  const maxLivePeak = liveData.length ? Math.max(...liveData.map((d) => d.picco)) : 0;

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">Analytics Avanzata</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Metriche di performance nel periodo selezionato</p>
        </div>
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === r.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Heart} label="Donazioni totali" value={`€${totalDonations.toLocaleString("it-IT")}`} trend={((Math.random() * 20) - 5).toFixed(1)} color="bg-chart-5/15 text-chart-5" delay={0} />
        <KpiCard icon={Users} label="Nuovi abbonati" value={totalSubs.toLocaleString("it-IT")} trend={((Math.random() * 15) + 2).toFixed(1)} color="bg-primary/15 text-primary" delay={0.05} />
        <KpiCard icon={TrendingUp} label="Tasso di conversione" value={`${avgConversion}%`} trend={((Math.random() * 10) - 2).toFixed(1)} color="bg-accent/15 text-accent" delay={0.1} />
        <KpiCard icon={Radio} label="Picco live max" value={`${maxLivePeak.toLocaleString("it-IT")} spettatori`} trend={((Math.random() * 25) + 5).toFixed(1)} color="bg-destructive/15 text-destructive" delay={0.15} />
      </div>

      {/* Donations area chart */}
      <ChartCard title="Andamento Donazioni" subtitle="Importo giornaliero — i picchi coincidono con i live" delay={0.2}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={donationsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradDon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(330 80% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(330 80% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
            <Tooltip content={<CustomTooltip prefix="€" />} />
            <Area type="monotone" dataKey="donazioni" name="Donazioni" stroke="hsl(330 80% 60%)" fill="url(#gradDon)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Conversion + rate dual chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Conversione Abbonamenti" subtitle="Visitatori vs nuovi abbonati" delay={0.25}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conversionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="visitatori" name="Visitatori" fill="hsl(210 100% 55% / 0.4)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="abbonati" name="Abbonati" fill="hsl(265 90% 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasso di Conversione %" subtitle="Percentuale visitatori → abbonati nel tempo" delay={0.3}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={conversionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRate" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(265 90% 60%)" />
                  <stop offset="100%" stopColor="hsl(210 100% 55%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Line type="monotone" dataKey="tasso" name="Conversione" stroke="url(#gradRate)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Live engagement bar chart */}
      <ChartCard title="Picchi di Engagement durante i Live" subtitle="Spettatori massimi e medi per ogni sessione live" delay={0.35}>
        {liveData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">Nessuna sessione live nel periodo selezionato</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={liveData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(260 8% 55%)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="picco" name="Picco spettatori" fill="hsl(0 84% 60% / 0.85)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="medio" name="Media spettatori" fill="hsl(45 90% 60% / 0.7)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="donazioni" name="Donazioni (€)" fill="hsl(180 70% 50% / 0.7)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}