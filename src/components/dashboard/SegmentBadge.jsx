import { Sparkles, TrendingUp, Award, Crown } from "lucide-react";

const SEGMENT_META = {
  starter: { label: "Starter", color: "text-muted-foreground bg-secondary/40 border-border/30", icon: Sparkles },
  growing: { label: "Growing", color: "text-chart-3 bg-chart-3/10 border-chart-3/30", icon: TrendingUp },
  pro:     { label: "Pro",     color: "text-primary bg-primary/15 border-primary/30",  icon: Award },
  elite:   { label: "Elite",   color: "text-accent bg-accent/15 border-accent/30",     icon: Crown },
};

export default function SegmentBadge({ kpi }) {
  if (!kpi) return null;
  const meta = SEGMENT_META[kpi.segment.segment_type] || SEGMENT_META.starter;
  const Icon = meta.icon;

  return (
    <section>
      <div className="bg-card border border-border/30 rounded-2xl p-4 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${meta.color}`}>
          <Icon className="w-4 h-4" /> {meta.label}
        </span>
        <p className="text-sm flex-1">
          <span className="text-muted-foreground">Segmento attuale</span> · score <strong>{kpi.segment.score}</strong>
        </p>
      </div>
    </section>
  );
}
