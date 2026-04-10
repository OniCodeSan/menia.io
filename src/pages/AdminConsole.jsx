import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Crown, Heart, DollarSign, TrendingUp, Radio,
  MessageCircle, ShieldCheck, LogOut, Eye, AlertTriangle,
  Activity, FileText, Zap, Lock, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Credenziali admin ─────────────────────────────────────────────────────────
const ADMIN_USER = "superadmin";
const ADMIN_PASS = "Unlockr@2026!";
const SESSION_KEY = "unlockr_admin_session";

// ── Mock data ─────────────────────────────────────────────────────────────────
const STATS = [
  { label: "Utenti totali", value: "1.248", delta: "+34 oggi", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { label: "Creator attivi", value: "87", delta: "+5 questa settimana", icon: Crown, color: "text-chart-4", bg: "bg-chart-4/10" },
  { label: "Fan abbonati", value: "932", delta: "+28 oggi", icon: Heart, color: "text-chart-5", bg: "bg-chart-5/10" },
  { label: "Revenue totale", value: "€42.810", delta: "+€1.240 oggi", icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
  { label: "Live attive ora", value: "6", delta: "3 creator online", icon: Radio, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Messaggi oggi", value: "3.417", delta: "+12% vs ieri", icon: MessageCircle, color: "text-chart-3", bg: "bg-chart-3/10" },
];

const RECENT_USERS = [
  { id: 1, name: "Giulia M.", email: "giulia@example.com", role: "creator", joined: "10 apr 2026", status: "active", revenue: "€1.240" },
  { id: 2, name: "Lorenzo R.", email: "lorenzo@example.com", role: "fan", joined: "10 apr 2026", status: "active", revenue: "€89" },
  { id: 3, name: "Sofia B.", email: "sofia@example.com", role: "creator", joined: "09 apr 2026", status: "active", revenue: "€680" },
  { id: 4, name: "Marco V.", email: "marco@example.com", role: "fan", joined: "09 apr 2026", status: "suspended", revenue: "€0" },
  { id: 5, name: "Alessia T.", email: "alessia@example.com", role: "fan", joined: "08 apr 2026", status: "active", revenue: "€45" },
  { id: 6, name: "Federico N.", email: "federico@example.com", role: "creator", joined: "07 apr 2026", status: "active", revenue: "€390" },
  { id: 7, name: "Martina P.", email: "martina@example.com", role: "fan", joined: "06 apr 2026", status: "active", revenue: "€120" },
  { id: 8, name: "Davide C.", email: "davide@example.com", role: "creator", joined: "05 apr 2026", status: "pending", revenue: "€0" },
];

const LIVE_ACTIVITY = [
  { id: 1, type: "signup", msg: "Nuovo creator registrato: @luca.music", time: "2 min fa", icon: Crown, color: "text-chart-4" },
  { id: 2, type: "sub", msg: "Nuovo abbonamento: Lorenzo → Giulia Fit (Pro)", time: "5 min fa", icon: Heart, color: "text-chart-5" },
  { id: 3, type: "live", msg: "Live avviata: Sofia Travels — 142 spettatori", time: "8 min fa", icon: Radio, color: "text-destructive" },
  { id: 4, type: "payment", msg: "Pagamento ricevuto: €29.99 da Marco V.", time: "12 min fa", icon: DollarSign, color: "text-primary" },
  { id: 5, type: "alert", msg: "Report ricevuto su contenuto #482 — in revisione", time: "18 min fa", icon: AlertTriangle, color: "text-chart-4" },
  { id: 6, type: "signup", msg: "Nuova fan registrata: @alessia.t", time: "22 min fa", icon: Users, color: "text-accent" },
  { id: 7, type: "payment", msg: "Pagamento ricevuto: €9.99 da Giulia M.", time: "30 min fa", icon: DollarSign, color: "text-primary" },
  { id: 8, type: "live", msg: "Live terminata: Marco Chef — durata 1h 23min", time: "45 min fa", icon: Radio, color: "text-muted-foreground" },
];

const ROLE_COLORS = {
  creator: "bg-chart-4/10 text-chart-4 border-chart-4/30",
  fan: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  admin: "bg-primary/10 text-primary border-primary/30",
};

const STATUS_COLORS = {
  active: "bg-chart-3/10 text-chart-3 border-chart-3/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/30",
};

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem(SESSION_KEY, "true");
        onLogin();
      } else {
        setError("Credenziali non valide. Riprova.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 glow-primary">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-xl font-bold">Super Admin Console</h1>
            <p className="text-xs text-muted-foreground mt-1">Accesso riservato — Unlockr</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  placeholder="Username admin"
                  className="bg-secondary/30 border-border/30 h-10 pl-9"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/30 border-border/30 h-10 pl-9"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading || !user || !pass}
              className="w-full h-10 bg-primary hover:bg-primary/90 glow-primary font-semibold mt-2"
            >
              {loading ? "Verifica in corso..." : "Accedi alla console"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main console ──────────────────────────────────────────────────────────────
function Console() {
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  const filteredUsers = RECENT_USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-border/30 bg-card/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm">Super Admin Console</h1>
              <p className="text-[10px] text-muted-foreground">Unlockr — Pannello di controllo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-chart-3 bg-chart-3/10 border border-chart-3/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse" />
              Sistema attivo
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive h-8">
              <LogOut className="w-4 h-4 mr-1.5" />
              Esci
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "users", label: "Utenti", icon: Users },
              { id: "activity", label: "Attività live", icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card/50 border border-border/30 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                    <p className="text-xs text-chart-3 font-medium mt-1">{s.delta}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick stats split */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
                <h3 className="font-heading font-bold text-sm mb-4">Ultimi utenti registrati</h3>
                <div className="space-y-3">
                  {RECENT_USERS.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {u.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
                <h3 className="font-heading font-bold text-sm mb-4">Attività recente</h3>
                <div className="space-y-3">
                  {LIVE_ACTIVITY.slice(0, 5).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">{item.msg}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Cerca per nome, email o ruolo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-secondary/30 border-border/30 h-9 max-w-sm text-sm"
              />
              <span className="text-xs text-muted-foreground">{filteredUsers.length} utenti</span>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/20">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Utente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Ruolo</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Registrato</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Stato</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/20 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-[11px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role]}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{u.joined}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[u.status]}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary hidden md:table-cell">{u.revenue}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-chart-3 bg-chart-3/10 border border-chart-3/20 px-4 py-2.5 rounded-xl w-fit">
              <span className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
              Feed in tempo reale — aggiornamento ogni 30s
            </div>
            {LIVE_ACTIVITY.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-card/50 border border-border/30 rounded-2xl"
                >
                  <div className={`w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.msg}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function AdminConsole() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") setAuthed(true);
  }, []);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Console />;
}