import { useEffect, useState } from "react";
import { Eye, Target, BarChart3, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Metric from "./Metric";
import { kpiApi } from "@/lib/api";

const ANALYTICS_TIER = { none: 0, basic: 1, advanced: 2, full: 3 };

export default function PerformanceSection({ kpi, conversion }) {
  const tier = ANALYTICS_TIER[kpi?.plan?.analytics_level] ?? 0;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (tier >= 1) {
      kpiApi.history(tier >= 2 ? 30 : 14).then((r) => setHistory(r.history || []));
    }
  }, [tier]);

  if (!kpi || !conversion) return null;

  // Tassonomia colore:
  //   - grigio se zero accessi (account nuovo / nessuna conversione ancora misurabile,
  //     anche se ci sono views: views da sole non bastano a dire "conversione bassa")
  //   - verde se >=5%, ambra se 2-5%, rosso se <2% — solo quando ci sono accessi reali
  const hasAccesses = (conversion.total_students || 0) > 0;
  const rateColor = !hasAccesses ? "text-muted-foreground"
    : conversion.rate >= 0.05 ? "text-chart-3"
    : conversion.rate >= 0.02 ? "text-chart-4"
    : "text-destructive";

  // Tier 0 (Free): basic numbers only
  if (tier === 0) {
    return (
      <section>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Performance</h2>
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Visualizzazioni" value={conversion.total_views || 0} icon={Eye} />
            <Metric label="Accessi" value={conversion.total_students || 0} icon={Target} />
          </div>
          <UpgradeNudge text="Passa a Starter per vedere conversione e grafici settimanali" />
        </div>
      </section>
    );
  }

  // Tier 1+: views/access/conversion + chart
  const chartData = history.map((d) => ({
    date: new Date(d.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
    views: (d.profile_views || 0) + (d.course_views || 0),
    students: d.new_students || 0,
  }));

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Performance</h2>
      <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Visualizzazioni" value={conversion.total_views || 0} icon={Eye} />
          <Metric label="Accessi" value={conversion.total_students || 0} icon={Target} />
          <Metric label="Conversione" value={`${(conversion.rate * 100).toFixed(1)}%`} icon={BarChart3} color={rateColor} />
        </div>

        {chartData.length > 1 && (
          <div className="border-t border-border/20 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Andamento {tier >= 2 ? "(30 giorni)" : "(14 giorni)"}
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid hsl(260 12% 90%)", borderRadius: 8, fontSize: 12, color: "#1a1530", padding: "6px 10px" }}
                    cursor={{ stroke: "hsl(260 12% 80%)", strokeDasharray: "3 3" }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} name="Views" />
                  {tier >= 2 && <Line type="monotone" dataKey="students" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10b981" }} name="Studenti" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {conversion.warning && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs">
            <strong>⚠️ {conversion.warning}</strong>
          </div>
        )}

        {tier === 1 && <UpgradeNudge text="Passa a Pro per analytics per corso e finestra di 30 giorni" />}
        {tier === 2 && <UpgradeNudge text="Passa a Elite per il funnel completo (visite → click → acquisti)" />}
      </div>
    </section>
  );
}

function UpgradeNudge({ text }) {
  return (
    <Link to="/pricing" className="block bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-xs hover:bg-primary/10 transition-colors">
      <Lock className="w-3 h-3 inline mr-1 text-primary" />
      {text} <span className="text-primary font-semibold">→</span>
    </Link>
  );
}
