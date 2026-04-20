import { useState } from "react";

const SEGMENT_CONFIG = {
  whale:   { label: "🐋 Whale",   className: "bg-chart-4/20 text-chart-4 border-chart-4/40", tip: "Hai speso molti token — sei un top supporter!" },
  spender: { label: "💳 Spender", className: "bg-chart-3/20 text-chart-3 border-chart-3/40", tip: "Supporti attivamente i creator con i tuoi token" },
  lurker:  { label: "👀 Lurker",  className: "bg-muted text-muted-foreground border-border/40", tip: "Esplora i creator e inizia a supportarli!" },
};

export default function SegmentBadge({ segment }) {
  const cfg = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.lurker;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition-colors hover:brightness-110 ${cfg.className}`}
      >
        {cfg.label}
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 rounded-xl bg-popover border border-border shadow-lg text-xs text-popover-foreground z-50 text-center animate-in fade-in-0 zoom-in-95">
          {cfg.tip}
        </div>
      )}
    </div>
  );
}
