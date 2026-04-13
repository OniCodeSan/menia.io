const SEGMENT_CONFIG = {
  whale:   { label: "🐋 Whale",   className: "bg-chart-4/20 text-chart-4 border-chart-4/40" },
  spender: { label: "💳 Spender", className: "bg-chart-3/20 text-chart-3 border-chart-3/40" },
  lurker:  { label: "👀 Lurker",  className: "bg-muted text-muted-foreground border-border/40" },
};

export default function SegmentBadge({ segment }) {
  const cfg = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.lurker;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}