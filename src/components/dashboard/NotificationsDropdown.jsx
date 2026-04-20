import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, BellOff, Repeat2, AtSign, Heart, MessageCircle, Crown, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsService } from "@/lib/notifications";

const TYPE_ICON = {
  tag: { icon: AtSign, color: "text-accent", bg: "bg-accent/10" },
  reshare: { icon: Repeat2, color: "text-chart-3", bg: "bg-chart-3/10" },
  like: { icon: Heart, color: "text-destructive", bg: "bg-destructive/10" },
  comment: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  subscription: { icon: Crown, color: "text-chart-4", bg: "bg-chart-4/10" },
  token: { icon: Coins, color: "text-chart-4", bg: "bg-chart-4/10" },
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}g`;
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsService.list({ limit: 30 })
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const markRead = async (id) => {
    await notificationsService.markRead(id);
    setNotifications(prev => prev.map(x => x.id === id ? { ...x, read: true } : x));
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className="border-border/50 relative"
        onClick={() => setOpen(v => !v)}
      >
        <Bell className="w-4 h-4 mr-2" />
        Notifiche
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <h4 className="font-heading font-bold text-sm">Notifiche</h4>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
                    Segna tutte come lette
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:text-foreground text-muted-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/10">
              {loading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <BellOff className="w-5 h-5 text-primary/60" />
                  </div>
                  <p className="text-xs font-semibold mb-1">Nessuna notifica</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Qui vedrai tag, ricondivisioni, abbonamenti e altre attività.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_ICON[n.type] || TYPE_ICON.tag;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer ${!n.read ? "bg-secondary/20" : ""}`}
                      onClick={() => markRead(n.id)}
                    >
                      <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{n.title}</p>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
