import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

// Suggestions whose action should trigger the same flow as the corresponding
// dashboard button (instead of navigating to a route).
const TRIGGER_TYPES = {
  first_course: "onCreateCourse",
  publish_more: "onCreateCourse",
};

// Tipi di suggerimento da skippare quando le rispettive feature sono disabilitate.
const HIDDEN_TYPES = new Set(["schedule_live"]);

export default function Suggestions({ suggestions = [], onCreateCourse }) {
  const visible = suggestions.filter((n) => !HIDDEN_TYPES.has(n.type));
  if (!visible.length) return null;
  const handlers = { onCreateCourse };

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Prossimi passi</h2>
      <div className="space-y-2">
        {visible.map((n) => {
          const triggerKey = TRIGGER_TYPES[n.type];
          const trigger = triggerKey ? handlers[triggerKey] : null;
          return (
            <div key={n.type} className="flex items-start gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
              <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.text}</p>
              </div>
              {n.action && (
                trigger ? (
                  <button
                    onClick={trigger}
                    className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                  >
                    {n.action.label} →
                  </button>
                ) : (
                  <Link to={n.action.to} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                    {n.action.label} →
                  </Link>
                )
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
