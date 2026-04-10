import { useState } from "react";
import { motion } from "framer-motion";
import AuthGuard from "../components/shared/AuthGuard";
import { Flame, Star, Users, Play as PlayIcon } from "lucide-react";
import { Heart, Bell, BellOff, Crown, Play, Radio, MessageCircle, Search, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FAVORITE_CREATORS = [
  {
    id: 1,
    name: "Giulia Fit",
    handle: "@giulia.fit",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=120&fit=crop",
    category: "Fitness & Wellness",
    plan: "Pro",
    planColor: "text-chart-4",
    planBg: "bg-chart-4/10 border-chart-4/30",
    notify: true,
    isLive: true,
    newContent: 3,
    nextLive: "Oggi 20:00",
  },
  {
    id: 2,
    name: "Marco Chef",
    handle: "@marco.chef",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=120&fit=crop",
    category: "Cucina & Ricette",
    plan: "Base",
    planColor: "text-primary",
    planBg: "bg-primary/10 border-primary/30",
    notify: false,
    isLive: false,
    newContent: 1,
    nextLive: "Ven 19:00",
  },
  {
    id: 3,
    name: "Sofia Travels",
    handle: "@sofia.travels",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=120&fit=crop",
    category: "Viaggi & Avventure",
    plan: "Pro",
    planColor: "text-chart-4",
    planBg: "bg-chart-4/10 border-chart-4/30",
    notify: true,
    isLive: false,
    newContent: 5,
    nextLive: "Dom 15:00",
  },
  {
    id: 4,
    name: "Luca Music",
    handle: "@luca.music",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=120&fit=crop",
    category: "Musica & Tutorial",
    plan: "Base",
    planColor: "text-primary",
    planBg: "bg-primary/10 border-primary/30",
    notify: true,
    isLive: false,
    newContent: 0,
    nextLive: "Mer 21:00",
  },
];

const RECENT_ACTIVITY = [
  { id: 1, creator: "Giulia Fit", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face", action: "ha pubblicato un nuovo video", time: "5 min fa", type: "video" },
  { id: 2, creator: "Sofia Travels", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face", action: "ha iniziato una live!", time: "12 min fa", type: "live" },
  { id: 3, creator: "Marco Chef", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face", action: "ha condiviso una nuova ricetta", time: "1 ora fa", type: "post" },
  { id: 4, creator: "Luca Music", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face", action: "ha caricato un tutorial di chitarra", time: "3 ore fa", type: "video" },
];

const SUGGESTED_CREATORS = [
  {
    id: 10,
    name: "Elena Conti",
    handle: "@elenaconti",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face",
    category: "Musica",
    fans: "15.1K",
    rating: 5.0,
    tags: ["musica", "chitarra"],
    reason: "Popolare nella tua area",
  },
  {
    id: 11,
    name: "Roberto Esposito",
    handle: "@roberto.v",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
    category: "Viaggi",
    fans: "13.6K",
    rating: 4.9,
    tags: ["viaggi", "avventura"],
    reason: "Basato sui tuoi interessi",
  },
  {
    id: 12,
    name: "Giulia Moretti",
    handle: "@giuliam",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    category: "Arte",
    fans: "9.8K",
    rating: 4.8,
    tags: ["arte", "design"],
    reason: "Trending questa settimana",
  },
];

const STATS = [
  { label: "Creator seguiti", value: "4", icon: Heart, color: "text-chart-5", bg: "bg-chart-5/10" },
  { label: "Contenuti guardati", value: "38", icon: Play, color: "text-primary", bg: "bg-primary/10" },
  { label: "Live seguite", value: "12", icon: Radio, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Messaggi inviati", value: "24", icon: MessageCircle, color: "text-accent", bg: "bg-accent/10" },
];

export default function FanDashboard() {
  const [creators, setCreators] = useState(FAVORITE_CREATORS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("preferiti");

  const toggleNotify = (id) => {
    setCreators(prev => prev.map(c => c.id === id ? { ...c, notify: !c.notify } : c));
  };

  const filtered = creators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGuard allowedRoles={["fan", "admin"]}>
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold">La mia Dashboard</h1>
              <p className="text-sm text-muted-foreground">I tuoi creator preferiti e le ultime novità</p>
            </div>
            <Link to="/explore">
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary">
                <Search className="w-4 h-4 mr-2" />
                Scopri nuovi creator
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 bg-secondary/40 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {[
              { id: "preferiti", label: "Preferiti" },
              { id: "attivita", label: "Attività recente" },
              { id: "abbonamenti", label: "Abbonamenti" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card/50 border border-border/30 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* In primo piano — suggeriti */}
        {activeTab === "preferiti" && (
          <div className="space-y-6">
            {/* Suggeriti */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-chart-4" />
                <h2 className="font-heading font-bold text-base">In primo piano per te</h2>
                <span className="text-xs text-muted-foreground ml-1">Basato sui tuoi interessi</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {SUGGESTED_CREATORS.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-card/50 border border-border/30 rounded-2xl p-4 hover:border-chart-4/40 transition-all"
                  >
                    <Link to="/explore" className="block">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.handle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary/50 border border-border/20 text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.fans}</span>
                        <span className="flex items-center gap-0.5 text-chart-4"><Star className="w-3 h-3 fill-chart-4" />{c.rating}</span>
                      </div>
                      <p className="text-[10px] text-chart-3 font-medium bg-chart-3/10 border border-chart-3/20 rounded-lg px-2 py-1 text-center">{c.reason}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* I preferiti */}
            <div>
              <h2 className="font-heading font-bold text-base mb-4">I tuoi creator</h2>
              <div className="flex items-center gap-3 mb-4">
                <Input
                  placeholder="Cerca tra i tuoi creator..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-secondary/30 border-border/30 h-9 max-w-xs text-sm"
                />
                <span className="text-xs text-muted-foreground">{filtered.length} creator</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden hover:border-border/60 transition-all"
                  >
                    <div className="relative h-24 overflow-hidden">
                      <img src={c.cover} alt={c.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                      {c.isLive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE ORA
                        </div>
                      )}
                      {c.newContent > 0 && !c.isLive && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                          +{c.newContent} nuovi
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover border-2 border-border" />
                          <div>
                            <p className="text-sm font-semibold">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.category}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleNotify(c.id)}
                          className={`p-2 rounded-lg transition-all ${c.notify ? "bg-chart-3/10 text-chart-3" : "bg-secondary/50 text-muted-foreground"}`}
                        >
                          {c.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.planBg} ${c.planColor}`}>{c.plan}</span>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />{c.nextLive}
                          </div>
                        </div>
                        <Link to="/feed">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-border/50 px-3">Vai al profilo</Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nessun creator trovato</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "attivita" && (
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-4 bg-card/50 border border-border/30 rounded-2xl hover:bg-secondary/20 transition-colors"
              >
                <img src={item.avatar} alt={item.creator} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{item.creator}</span>
                    <span className="text-muted-foreground"> {item.action}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.time}</p>
                </div>
                {item.type === "live" && (
                  <Link to="/live-discover">
                    <Button size="sm" className="h-7 text-xs bg-destructive hover:bg-destructive/90 px-3 shrink-0">
                      Guarda
                    </Button>
                  </Link>
                )}
                {item.type === "video" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "abbonamenti" && (
          <div className="space-y-4">
            {creators.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-4 bg-card/50 border border-border/30 rounded-2xl"
              >
                <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.category}</p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.planBg} ${c.planColor}`}>
                    Piano {c.plan}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{c.plan === "Pro" ? "€9.99" : "€4.99"}<span className="text-xs font-normal text-muted-foreground">/mese</span></p>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-border/50 mt-1.5">
                    Gestisci
                  </Button>
                </div>
              </motion.div>
            ))}

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
              <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Totale mensile: €29.96</p>
              <p className="text-xs text-muted-foreground">Prossimo rinnovo il 10 maggio 2026</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}