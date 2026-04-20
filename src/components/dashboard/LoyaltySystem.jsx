import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Users, Loader2, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function LoyaltySystem() {
  const { user } = useAuth();
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, fan_id, tier, status, started_at, profiles!subscriptions_fan_id_fkey(full_name, handle, avatar_url)")
        .eq("creator_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: true });
      if (!error && data) {
        setFans(data.map((s) => {
          const p = s.profiles || {};
          const startDate = new Date(s.started_at);
          const days = Math.floor((Date.now() - startDate.getTime()) / 86400000);
          let badge = "Nuovo";
          let badgeColor = "bg-chart-4/20 text-chart-4 border-chart-4/30";
          if (days >= 365) { badge = "Leggenda"; badgeColor = "bg-chart-3/20 text-chart-3 border-chart-3/30"; }
          else if (days >= 180) { badge = "Veterano"; badgeColor = "bg-primary/20 text-primary border-primary/30"; }
          else if (days >= 90) { badge = "Fedele"; badgeColor = "bg-accent/20 text-accent border-accent/30"; }
          else if (days >= 30) { badge = "Sostenitore"; badgeColor = "bg-chart-4/20 text-chart-4 border-chart-4/30"; }
          return {
            id: s.id,
            name: p.full_name || "Fan",
            handle: p.handle || "",
            avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "F")}&background=7c3aed&color=fff&size=80`,
            tier: s.tier,
            days,
            badge,
            badgeColor,
          };
        }));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (fans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-border/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Crown className="w-8 h-8 text-primary/60" />
        </div>
        <h2 className="font-heading font-bold text-lg mb-2">Sistema di fedeltà</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          I tuoi fan più fedeli, i livelli e i badge appariranno qui una volta che inizierai a ricevere
          abbonamenti dai tuoi sostenitori.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Sistema di Fedeltà</h2>
        <p className="text-xs text-muted-foreground mt-0.5">I tuoi fan più fedeli e i loro badge</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Leggende (1a+)", count: fans.filter((f) => f.badge === "Leggenda").length, color: "text-chart-3", bg: "bg-chart-3/10" },
          { label: "Veterani (6m+)", count: fans.filter((f) => f.badge === "Veterano").length, color: "text-primary", bg: "bg-primary/10" },
          { label: "Fedeli (3m+)", count: fans.filter((f) => f.badge === "Fedele").length, color: "text-accent", bg: "bg-accent/10" },
          { label: "Nuovi (<1m)", count: fans.filter((f) => f.badge === "Nuovo" || f.badge === "Sostenitore").length, color: "text-chart-4", bg: "bg-chart-4/10" },
        ].map((s) => (
          <div key={s.label} className="bg-card/50 border border-border/30 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-3">
        <h3 className="font-heading font-bold text-sm mb-1">Tutti i fan fedeli ({fans.length})</h3>
        {fans.map((fan, i) => (
          <motion.div
            key={fan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
          >
            <img src={fan.avatar} alt={fan.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{fan.name}</p>
              <p className="text-[11px] text-muted-foreground">
                @{fan.handle || "—"} · {fan.tier === "premium" ? "Pro" : "Base"} · {fan.days}g
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${fan.badgeColor}`}>
              {fan.badge}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
