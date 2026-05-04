import { useNavigate } from "react-router-dom";
import { CheckCheck, Megaphone, Bell, Inbox } from "lucide-react";

const TYPE_META = {
  broadcast: { icon: Megaphone, accent: "text-primary" },
  system:    { icon: Bell,      accent: "text-foreground" },
};

function relativeTime(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 1)  return "ora";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} g fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}

function navigateForNotification(n) {
  switch (n.type) {
    case "broadcast": return "/dashboard/broadcasts";
    case "system":    return null;
    default:          return null;
  }
}

export default function NotificationDropdown({ items, count, onMarkAsRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate();

  const handleClick = (n) => {
    if (!n.read) onMarkAsRead(n.id);
    const target = navigateForNotification(n);
    if (target) {
      navigate(target);
      onClose();
    }
  };

  return (
    <div role="menu" className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] flex flex-col bg-card border border-border rounded-lg shadow-card overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-heading font-bold text-sm">Notifiche</p>
        {count > 0 && (
          <button type="button" onClick={onMarkAllRead} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> Segna tutte lette
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nessuna notifica</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-secondary transition-colors flex gap-3 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${meta.accent}`} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p className={`text-sm truncate ${!n.read ? "font-semibold" : "font-medium"}`}>
                          {n.title || "Notifica"}
                        </p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Non letta" />}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{relativeTime(n.created_at)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
