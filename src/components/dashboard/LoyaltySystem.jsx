import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Flame, Zap, Heart, MessageCircle, Gift, TrendingUp, ChevronDown, ChevronUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = [
  { id: "legend",   label: "Legend",   min: 5000, icon: Crown,  color: "text-chart-4",    bg: "bg-chart-4/15 border-chart-4/40",    glow: "shadow-[0_0_16px_hsl(45_90%_60%/0.35)]" },
  { id: "elite",    label: "Elite",    min: 2000, icon: Star,   color: "text-primary",    bg: "bg-primary/15 border-primary/40",    glow: "shadow-[0_0_12px_hsl(265_90%_60%/0.3)]" },
  { id: "fire",     label: "Fire",     min: 800,  icon: Flame,  color: "text-chart-5",    bg: "bg-chart-5/15 border-chart-5/40",    glow: "" },
  { id: "active",   label: "Active",   min: 300,  icon: Zap,    color: "text-accent",     bg: "bg-accent/15 border-accent/40",      glow: "" },
  { id: "supporter",label: "Supporter",min: 0,    icon: Heart,  color: "text-chart-3",    bg: "bg-chart-3/15 border-chart-3/30",    glow: "" },
];

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGES = [
  { id: "early",    icon: "🌟", label: "Early Adopter",   desc: "Abbonato da oltre 12 mesi" },
  { id: "whale",    icon: "🐋", label: "Big Spender",     desc: "Oltre €500 totali donati" },
  { id: "chatter",  icon: "💬", label: "Super Chatter",   desc: "Più di 200 messaggi inviati" },
  { id: "live",     icon: "🔴", label: "Live Addict",     desc: "Presente in 20+ live" },
  { id: "referral", icon: "🤝", label: "Ambassador",      desc: "Ha invitato 3+ fan" },
  { id: "streak",   icon: "🔥", label: "30-Day Streak",   desc: "Attivo 30 giorni consecutivi" },
  { id: "gifter",   icon: "🎁", label: "Gift King",       desc: "Ha regalato 5+ abbonamenti" },
  { id: "comment",  icon: "📝", label: "Commentatore",    desc: "100+ commenti ai post" },
];

// ── Mock fan data ─────────────────────────────────────────────────────────────
const FANS = [
  { id: 1, name: "Giulia M.",    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face", score: 6200, months: 18, donations: 620, messages: 312, liveCount: 28, badges: ["early","whale","chatter","live","streak"] },
  { id: 2, name: "Lorenzo R.",   avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face", score: 3800, months: 14, donations: 340, messages: 185, liveCount: 22, badges: ["early","live","referral","comment"] },
  { id: 3, name: "Martina P.",   avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face", score: 2100, months: 10, donations: 210, messages: 98,  liveCount: 15, badges: ["streak","comment","gifter"] },
  { id: 4, name: "Davide C.",    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop&crop=face", score: 1450, months: 8,  donations: 145, messages: 72,  liveCount: 9,  badges: ["live","streak"] },
  { id: 5, name: "Alessia T.",   avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face", score: 920,  months: 7,  donations: 95,  messages: 55,  liveCount: 6,  badges: ["referral","comment"] },
  { id: 6, name: "Federico N.",  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face", score: 640,  months: 5,  donations: 65,  messages: 40,  liveCount: 5,  badges: ["streak"] },
  { id: 7, name: "Sofia B.",     avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face", score: 380,  months: 4,  donations: 40,  messages: 28,  liveCount: 3,  badges: ["comment"] },
  { id: 8, name: "Marco V.",     avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face", score: 180,  months: 2,  donations: 18,  messages: 14,  liveCount: 1,  badges: [] },
];

function getLevel(score) {
  return LEVELS.find((l) => score >= l.min) || LEVELS[LEVELS.length - 1];
}

function ProgressBar({ score }) {
  const levelIdx = LEVELS.findIndex((l) => score >= l.min);
  const current = LEVELS[levelIdx];
  const next = LEVELS[levelIdx - 1];
  if (!next) return <div className="text-[10px] text-chart-4 font-semibold">Livello massimo 🏆</div>;
  const pct = Math.min(100, Math.round(((score - current.min) / (next.min - current.min)) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>{score.toLocaleString("it-IT")} pt</span>
        <span>→ {next.label} ({next.min.toLocaleString("it-IT")} pt)</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  );
}

function FanRow({ fan, idx }) {
  const [expanded, setExpanded] = useState(false);
  const level = getLevel(fan.score);
  const LevelIcon = level.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors text-left"
      >
        {/* Rank */}
        <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
          {idx + 1}
        </span>

        {/* Avatar */}
        <div className="relative shrink-0">
          <img src={fan.avatar} alt={fan.name} className="w-10 h-10 rounded-full object-cover" />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${level.bg} ${level.glow}`}>
            <LevelIcon className={`w-2.5 h-2.5 ${level.color}`} />
          </div>
        </div>

        {/* Name + level */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{fan.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${level.bg} ${level.color}`}>
              {level.label}
            </span>
          </div>
          <ProgressBar score={fan.score} />
        </div>

        {/* Badges preview */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {fan.badges.slice(0, 3).map((bid) => {
            const b = BADGES.find((x) => x.id === bid);
            return b ? <span key={bid} title={b.label} className="text-base">{b.icon}</span> : null;
          })}
          {fan.badges.length > 3 && (
            <span className="text-[10px] text-muted-foreground font-semibold">+{fan.badges.length - 3}</span>
          )}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-primary">{fan.score.toLocaleString("it-IT")}</p>
          <p className="text-[10px] text-muted-foreground">punti</p>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="p-4 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Mesi abbonato", value: fan.months, icon: "📅" },
                  { label: "Donazioni totali", value: `€${fan.donations}`, icon: "💰" },
                  { label: "Messaggi inviati", value: fan.messages, icon: "💬" },
                  { label: "Live seguiti", value: fan.liveCount, icon: "🔴" },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/30 rounded-xl p-3 text-center">
                    <p className="text-lg">{s.icon}</p>
                    <p className="text-sm font-bold mt-1">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* All badges */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Badge conquistati</p>
                <div className="flex flex-wrap gap-2">
                  {BADGES.map((b) => {
                    const owned = fan.badges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        title={b.desc}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          owned
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-secondary/20 border-border/20 text-muted-foreground opacity-40"
                        }`}
                      >
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LoyaltySystem() {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  const filtered = FANS.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === "all" || getLevel(f.score).id === filterLevel;
    return matchSearch && matchLevel;
  });

  // Summary stats
  const levelCounts = LEVELS.map((l) => ({
    ...l,
    count: FANS.filter((f) => getLevel(f.score).id === l.id).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-lg">Sistema di Fedeltà</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Identifica e premia i tuoi sostenitori più fedeli</p>
      </div>

      {/* Level summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {levelCounts.map((l, i) => {
          const Icon = l.icon;
          return (
            <motion.button
              key={l.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setFilterLevel(filterLevel === l.id ? "all" : l.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                filterLevel === l.id ? `${l.bg} ${l.glow}` : "bg-card/40 border-border/30 hover:border-border/60"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${l.bg}`}>
                <Icon className={`w-4 h-4 ${l.color}`} />
              </div>
              <p className="text-xl font-heading font-bold">{l.count}</p>
              <p className={`text-xs font-semibold ${l.color}`}>{l.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{l.min.toLocaleString("it-IT")}+ pt</p>
            </motion.button>
          );
        })}
      </div>

      {/* Badge legend */}
      <div className="bg-card/40 border border-border/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Badge disponibili</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <div key={b.id} title={b.desc} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/30 bg-secondary/20 text-xs text-muted-foreground">
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search + list */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Cerca fan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary/30 border-border/30 h-9 max-w-xs text-sm"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} fan</span>
        </div>

        <div className="space-y-2">
          {filtered.map((fan, i) => (
            <FanRow key={fan.id} fan={fan} idx={i} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nessun fan trovato</p>
          )}
        </div>
      </div>
    </div>
  );
}