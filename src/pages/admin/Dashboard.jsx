import { useEffect, useState } from "react";
import { Loader2, Users, GraduationCap, Euro, BookOpen, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { adminApi } from "@/lib/api";

const COLORS = ["#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function fmtEur(n) { return `€ ${(Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtInt(n) { return (Number(n) || 0).toLocaleString("it-IT"); }

function Card({ title, value, sub, icon: Icon, accent = "text-primary" }) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        {Icon && <Icon className={`w-4 h-4 ${accent}`} />}
      </div>
      <div className="text-2xl font-heading font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [biz, setBiz] = useState(null);
  const [perf, setPerf] = useState(null);
  const [signups, setSignups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      adminApi.business(),
      adminApi.coursesPerformance(),
      adminApi.metricsSignups().catch(() => null),
    ]).then((results) => {
      if (!alive) return;
      const [b, p, s] = results;
      if (b.status === "fulfilled") setBiz(b.value); else setErr(b.reason?.message || "Errore business");
      if (p.status === "fulfilled") setPerf(p.value);
      if (s.status === "fulfilled") setSignups(s.value);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (err && !biz) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {err}
        </div>
      </div>
    );
  }

  const subsData = biz ? [
    { name: "Trial", value: biz.platform_subscriptions.trial },
    { name: "Active", value: biz.platform_subscriptions.active },
    { name: "Past due", value: biz.platform_subscriptions.past_due },
    { name: "Canceled", value: biz.platform_subscriptions.canceled },
    { name: "Expired", value: biz.platform_subscriptions.expired },
  ] : [];

  const revenueData = biz ? [
    { name: "Studenti", value: biz.revenue.from_fans_eur },
    { name: "Formatori", value: biz.revenue.from_creators_eur },
    { name: "Altri", value: biz.revenue.from_others_eur },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Panoramica business e performance corsi.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Iscritti totali" value={fmtInt(biz?.users.total)} sub={`${fmtInt(biz?.users.fans)} studenti · ${fmtInt(biz?.users.creators)} formatori`} icon={Users} />
        <Card title="Incassi totali" value={fmtEur(biz?.revenue.total_eur)} sub={`${fmtInt(biz?.revenue.orders_count)} ordini`} icon={Euro} accent="text-emerald-500" />
        <Card title="Corsi caricati" value={fmtInt(biz?.courses.total)} sub={`${fmtInt(biz?.courses.published)} pubblicati`} icon={BookOpen} />
        <Card title="Lezioni totali" value={fmtInt(biz?.courses.lessons_total)} sub="proxy ore corso" icon={GraduationCap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold mb-3">Incassi per ruolo pagatore</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueData} dataKey="value" nameKey="name" outerRadius={80} label={(e) => fmtEur(e.value)}>
                  {revenueData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => fmtEur(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold mb-3">Stato platform subscriptions</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={subsData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Chiusi: {biz?.platform_subscriptions.canceled_by_role.fan} fan · {biz?.platform_subscriptions.canceled_by_role.creator} creator · scaduti: {biz?.platform_subscriptions.expired_by_role.fan} fan · {biz?.platform_subscriptions.expired_by_role.creator} creator
          </div>
        </div>
      </div>

      {biz?.packages?.length > 0 && (
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold mb-3">Pacchetti sottoscritti</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border/30">
              <tr>
                <th className="text-left py-2">Codice</th>
                <th className="text-right py-2">Sottoscrizioni</th>
                <th className="text-right py-2">Iscritti unici</th>
                <th className="text-right py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {biz.packages.map((p) => (
                <tr key={p.code} className="border-b border-border/10">
                  <td className="py-2 font-medium">{p.code}</td>
                  <td className="text-right">{fmtInt(p.count)}</td>
                  <td className="text-right">{fmtInt(p.unique_subscribers)}</td>
                  <td className="text-right">{fmtEur(p.revenue_eur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {perf && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CoursePerfCard
            title="Top per acquisti"
            icon={TrendingUp}
            accent="text-emerald-500"
            rows={perf.top_acquired}
            metric="acquisitions"
            metricLabel="Acquisti"
          />
          <CoursePerfCard
            title="Top per visualizzazioni"
            icon={TrendingUp}
            accent="text-cyan-500"
            rows={perf.top_viewed}
            metric="views"
            metricLabel="Views"
          />
          <CoursePerfCard
            title="Acquistati ma non aperti"
            icon={TrendingDown}
            accent="text-amber-500"
            rows={perf.purchased_not_opened}
            metric="acquired_not_opened"
            metricLabel="Inerti"
          />
          <CoursePerfCard
            title="Zero performance (pubblicati)"
            icon={AlertCircle}
            accent="text-destructive"
            rows={perf.zero_performance}
            metric="lesson_count"
            metricLabel="Lezioni"
          />
        </div>
      )}

      {signups?.points && (
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold mb-3">Andamento iscrizioni</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={signups.points}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function CoursePerfCard({ title, icon: Icon, accent, rows, metric, metricLabel }) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <h2 className="font-heading text-sm font-bold mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent}`} /> {title}
      </h2>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4">Nessun corso in questa categoria.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 8).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 border-b border-border/10 pb-2 last:border-0">
              <span className="truncate" title={c.title}>{c.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {metricLabel}: <strong className="text-foreground">{fmtInt(c[metric])}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
