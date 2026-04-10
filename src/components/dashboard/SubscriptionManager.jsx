import { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Users, DollarSign, TrendingUp, ToggleLeft, ToggleRight, Crown, Bell, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MOCK_SUBS = [
  { id: 1, name: "Giulia M.", email: "giulia@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face", plan: "Pro", price: 9.99, since: "Gen 2026", active: true, notify: true },
  { id: 2, name: "Lorenzo R.", email: "lorenzo@example.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face", plan: "Base", price: 4.99, since: "Feb 2026", active: true, notify: false },
  { id: 3, name: "Martina P.", email: "martina@example.com", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&h=60&fit=crop&crop=face", plan: "Pro", price: 9.99, since: "Mar 2026", active: true, notify: true },
  { id: 4, name: "Davide C.", email: "davide@example.com", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=60&h=60&fit=crop&crop=face", plan: "Base", price: 4.99, since: "Mar 2026", active: false, notify: false },
  { id: 5, name: "Alessia T.", email: "alessia@example.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", plan: "Pro", price: 9.99, since: "Apr 2026", active: true, notify: true },
];

const PLANS = [
  { id: "base", label: "Piano Base", price: "", desc: "Accesso ai contenuti standard", active: true },
  { id: "pro", label: "Piano Pro", price: "", desc: "Accesso completo + messaggi privati", active: true },
];

export default function SubscriptionManager() {
  const [subs, setSubs] = useState(MOCK_SUBS);
  const [plans, setPlans] = useState(PLANS);
  const [prices, setPrices] = useState({ base: "4.99", pro: "9.99" });
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSent, setNotifSent] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [expandedSub, setExpandedSub] = useState(null);

  const activeSubs = subs.filter(s => s.active);
  const monthlyRevenue = activeSubs.reduce((sum, s) => sum + s.price, 0);

  const toggleSub = (id) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const togglePlan = (id) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSendingNotif(true);
    try {
      // Send to all active subscribers with notify=true
      const notifyList = subs.filter(s => s.active && s.notify);
      for (const sub of notifyList) {
        await base44.functions.invoke("sendNotification", {
          to: sub.email,
          type: "new_content",
          data: { creatorName: "Il tuo creator", contentTitle: broadcastMsg },
        });
      }
    } catch (e) { /* ignore */ }
    setSendingNotif(false);
    setNotifSent(true);
    setBroadcastMsg("");
    setTimeout(() => setNotifSent(false), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Gestione Abbonamenti</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gestisci piani, abbonati e notifiche</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Abbonati attivi", value: activeSubs.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Entrate mensili", value: `€${monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: "text-chart-3", bg: "bg-chart-3/10" },
          { label: "Tasso attività", value: `${Math.round((activeSubs.length / subs.length) * 100)}%`, icon: TrendingUp, color: "text-chart-4", bg: "bg-chart-4/10" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card/50 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-heading font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plans config */}
        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-chart-4" />
            <h3 className="font-heading font-bold text-sm">Piani di abbonamento</h3>
          </div>
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{plan.label}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${plan.active ? "bg-chart-3/15 text-chart-3" : "bg-secondary text-muted-foreground"}`}>
                    {plan.active ? "Attivo" : "Disattivo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{plan.desc}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">€</span>
                  <Input
                    type="number"
                    value={prices[plan.id]}
                    onChange={e => setPrices(p => ({ ...p, [plan.id]: e.target.value }))}
                    className="bg-secondary/30 border-border/30 h-7 w-20 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">/mese</span>
                </div>
              </div>
              <Switch checked={plan.active} onCheckedChange={() => togglePlan(plan.id)} />
            </div>
          ))}
          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 h-9 font-semibold">
            Salva modifiche
          </Button>
        </div>

        {/* Broadcast */}
        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-bold text-sm">Notifica abbonati</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Invia una email a tutti gli abbonati con notifiche attive ({subs.filter(s => s.active && s.notify).length} fan)
          </p>
          <textarea
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
            placeholder="Es. Ho appena pubblicato un nuovo video esclusivo..."
            className="w-full h-24 bg-secondary/30 border border-border/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {notifSent ? (
            <div className="flex items-center gap-2 text-chart-3 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Email inviate con successo!
            </div>
          ) : (
            <Button
              onClick={sendBroadcast}
              disabled={!broadcastMsg.trim() || sendingNotif}
              size="sm"
              className="w-full bg-accent hover:bg-accent/90 h-9 font-semibold"
            >
              {sendingNotif ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Invio...</> : "Invia notifica email"}
            </Button>
          )}
        </div>
      </div>

      {/* Subscribers list */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-3">
        <h3 className="font-heading font-bold text-sm mb-1">Tutti gli abbonati ({subs.length})</h3>
        {subs.map((sub, i) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border/20 overflow-hidden"
          >
            <div
              className="flex items-center gap-3 p-3 hover:bg-secondary/20 transition-colors cursor-pointer"
              onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
            >
              <img src={sub.avatar} alt={sub.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{sub.name}</p>
                <p className="text-[11px] text-muted-foreground">{sub.plan} · da {sub.since}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.active ? "bg-chart-3/15 text-chart-3" : "bg-secondary text-muted-foreground"}`}>
                  {sub.active ? "Attivo" : "Sospeso"}
                </span>
                <span className="text-xs font-semibold">€{sub.price}</span>
                {expandedSub === sub.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
            {expandedSub === sub.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border/20 bg-secondary/10 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">{sub.email}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Email</span>
                    <Switch
                      checked={sub.notify}
                      onCheckedChange={() => setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, notify: !s.notify } : s))}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={sub.active ? "outline" : "default"}
                    onClick={() => toggleSub(sub.id)}
                    className={`h-7 text-xs ${sub.active ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "bg-chart-3/80 hover:bg-chart-3 text-white"}`}
                  >
                    {sub.active ? "Sospendi" : "Riattiva"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}