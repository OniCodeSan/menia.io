import { Users, GraduationCap, Euro } from "lucide-react";
import StatCard from "./StatCard";

export default function DashboardOverview({ kpi }) {
  if (!kpi) return null;
  const a = kpi.aggregated;
  const t = kpi.trend7d || { new_students: 0, new_accesses: 0 };

  const cards = [
    {
      title: "Studenti",
      value: a.total_students,
      icon: Users,
      color: "text-chart-3",
      trend: t.new_students > 0 ? `+${t.new_students} ultimi 7gg` : null,
    },
    { title: "Corsi attivi", value: a.total_courses, icon: GraduationCap, color: "text-primary" },
    {
      title: "Ricavi stimati",
      value: `€${Number(a.total_revenue_estimated || 0).toFixed(0)}`,
      icon: Euro,
      color: "text-chart-4",
      trend: t.new_accesses > 0 ? `+${t.new_accesses} accessi ultimi 7gg` : null,
      hint: "Stima basata sugli accessi ai corsi a pagamento (vendita diretta). Le revenue dell'abbonamento Menia sono distribuite a fine mese e non incluse qui.",
    },
  ];

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => <StatCard key={c.title} {...c} />)}
      </div>
    </section>
  );
}
