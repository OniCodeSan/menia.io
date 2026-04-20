import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Crown, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState(null);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, fan_id, tier, status, started_at, expires_at, profiles!subscriptions_fan_id_fkey(full_name, handle, avatar_url)")
        .eq("creator_id", user.id)
        .order("started_at", { ascending: false });
      if (!error && data) {
        setSubs(data.map((s) => {
          const p = s.profiles || {};
          return {
            id: s.id,
            fanId: s.fan_id,
            name: p.full_name || "Fan",
            handle: p.handle || "",
            avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "F")}&background=7c3aed&color=fff&size=80`,
            tier: s.tier,
            status: s.status,
            startedAt: s.started_at,
            expiresAt: s.expires_at,
            tokens: s.tier === "premium" ? 200 : 100,
          };
        }));
      }
      setLoading(false);
    })();
  }, [user]);

  const activeSubs = subs.filter((s) => s.status === "active");
  const totalTokens = activeSubs.reduce((sum, s) => sum + s.tokens, 0);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Gestione Abbonamenti</h2>
        <p className="text-xs text-muted-foreground mt-0.5">I fan abbonati al tuo profilo</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Abbonati attivi", value: activeSubs.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Token mensili", value: `${totalTokens} T`, icon: Crown, color: "text-chart-3", bg: "bg-chart-3/10" },
          { label: "Tasso rinnovo", value: subs.length > 0 ? `${Math.round((activeSubs.length / subs.length) * 100)}%` : "—", icon: TrendingUp, color: "text-chart-4", bg: "bg-chart-4/10" },
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

      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-3">
        <h3 className="font-heading font-bold text-sm mb-1">Tutti gli abbonati ({subs.length})</h3>
        {subs.length === 0 && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-primary/60" />
            </div>
            <p className="text-sm font-semibold mb-1">Nessun abbonato ancora</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Quando i primi fan sottoscriveranno un piano, li troverai qui.
            </p>
          </div>
        )}
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
                <p className="text-[11px] text-muted-foreground">
                  {sub.tier === "premium" ? "Pro" : "Base"} · da {sub.startedAt ? new Date(sub.startedAt).toLocaleDateString("it-IT") : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === "active" ? "bg-chart-3/15 text-chart-3" : "bg-secondary text-muted-foreground"}`}>
                  {sub.status === "active" ? "Attivo" : sub.status === "cancelled" ? "Cancellato" : sub.status}
                </span>
                <span className="text-xs font-semibold">{sub.tokens} T</span>
                {expandedSub === sub.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
            {expandedSub === sub.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border/20 bg-secondary/10 text-xs text-muted-foreground">
                <p>@{sub.handle || "—"}</p>
                {sub.expiresAt && <p>Scade: {new Date(sub.expiresAt).toLocaleDateString("it-IT")}</p>}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
