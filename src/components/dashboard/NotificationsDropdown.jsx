import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, UserPlus, DollarSign, MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTIFICATIONS = [
  { id: 1, icon: UserPlus, color: "text-primary", bg: "bg-primary/10", title: "Nuovo abbonato", desc: "Lorenzo R. si è abbonato al tuo piano mensile", time: "2 min fa", unread: true },
  { id: 2, icon: DollarSign, color: "text-chart-3", bg: "bg-chart-3/10", title: "Donazione ricevuta", desc: "Giulia M. ti ha donato €10 durante la live", time: "15 min fa", unread: true },
  { id: 3, icon: MessageCircle, color: "text-accent", bg: "bg-accent/10", title: "Nuovo messaggio", desc: "Martina P. ti ha inviato un messaggio privato", time: "1 ora fa", unread: true },
  { id: 4, icon: Heart, color: "text-chart-5", bg: "bg-chart-5/10", title: "Post molto apprezzato", desc: "Il tuo ultimo post ha ricevuto 120 like", time: "3 ore fa", unread: false },
  { id: 5, icon: UserPlus, color: "text-primary", bg: "bg-primary/10", title: "Nuovo abbonato", desc: "Davide C. si è abbonato al tuo piano annuale", time: "ieri", unread: false },
];

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const ref = useRef(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, unread: false })));

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
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer ${n.unread ? "bg-secondary/20" : ""}`}
                    onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                  >
                    <div className={`w-8 h-8 rounded-xl ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${n.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.desc}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}