import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Crown, Heart, Coins, Radio, Activity, TrendingUp,
  LogOut, Loader2, RefreshCw, Wallet, ShieldCheck, ArrowUpRight,
  ArrowDownRight, Banknote, Flag, AlertTriangle, Ban, CheckCircle2, XCircle,
  ShoppingCart, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import AuthGuard from "@/components/shared/AuthGuard";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchUsersOverview,
  fetchSignupTimeseries,
  fetchTokenEconomy,
  fetchTokenFlowTimeseries,
  fetchSpendBreakdown,
  fetchPayoutsOverview,
  fetchEngagement,
  fetchTopCreators,
  fetchTopFans,
  fetchRecentSignups,
  fetchLiveAccessStats,
  fetchPayoutRequests,
  updateCreatorPlan,
} from "@/lib/adminMetrics";
import {
  listAllOrders,
  confirmTokenPurchase,
  confirmPlanPurchase,
  failPaymentOrder,
} from "@/lib/paymentOrders";
import {
  fetchReports,
  fetchReportsOverview,
  updateReportStatus,
  updateUserStatus,
  REPORT_REASONS,
  USER_STATUS,
} from "@/lib/moderation";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtNum = (n) => new Intl.NumberFormat("it-IT").format(n || 0);
const fmtEuro = (n) => `€${new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
const fmtToken = (n) => `${fmtNum(n)} T`;
const shortDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};
const shortDay = (k) => (k ? k.slice(5) : "");

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

// ---------------------------------------------------------------------------
// Card primitives
// ---------------------------------------------------------------------------
const StatCard = ({ icon: Icon, label, value, sub, color = "text-primary", bg = "bg-primary/10" }) => (
  <div className="bg-card/60 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="font-heading font-bold text-xl truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

const PanelCard = ({ title, children, right }) => (
  <div className="bg-card/60 border border-border/30 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-heading font-bold text-sm">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const EmptyState = ({ children }) => (
  <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">{children}</div>
);

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Utenti", icon: Users },
  { id: "moderation", label: "Moderazione", icon: Flag },
  { id: "economy", label: "Economia", icon: Coins },
  { id: "payouts", label: "Payout", icon: Banknote },
  { id: "orders", label: "Ordini", icon: ShoppingCart },
  { id: "engagement", label: "Engagement", icon: TrendingUp },
  { id: "live", label: "Live", icon: Radio },
];

const REPORT_REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.key, r.label]));
const STATUS_META = Object.fromEntries(USER_STATUS.map((s) => [s.key, s]));

const statusBadgeClass = (status) => {
  const tone = STATUS_META[status]?.tone || "ok";
  if (tone === "ok") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (tone === "warn") return "bg-chart-4/10 text-chart-4 border-chart-4/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
};

// ---------------------------------------------------------------------------
// Main component (wrapped by AuthGuard)
// ---------------------------------------------------------------------------
function AdminConsoleInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(/** @type {any} */ ({}));

  const loadAll = async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const [
        usersOverview,
        signupSeries,
        economy,
        tokenFlow,
        spendBreakdown,
        payouts,
        engagement,
        topCreators,
        topFans,
        recentSignups,
        liveStats,
        reportsPending,
        reportsOverview,
        payoutReqs,
        paymentOrders,
      ] = await Promise.all([
        fetchUsersOverview(),
        fetchSignupTimeseries(30),
        fetchTokenEconomy(),
        fetchTokenFlowTimeseries(30),
        fetchSpendBreakdown(),
        fetchPayoutsOverview(),
        fetchEngagement(),
        fetchTopCreators(10),
        fetchTopFans(10),
        fetchRecentSignups(20),
        fetchLiveAccessStats(),
        fetchReports({ status: "pending", limit: 200 }),
        fetchReportsOverview(),
        fetchPayoutRequests(),
        listAllOrders(100).catch(() => []),
      ]);
      setData({
        usersOverview, signupSeries, economy, tokenFlow, spendBreakdown,
        payouts, engagement, topCreators, topFans, recentSignups, liveStats,
        reportsPending, reportsOverview, payoutRequests: payoutReqs, paymentOrders,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const spendPie = useMemo(() => {
    const b = data.spendBreakdown || {};
    const entries = [
      { name: "Live", value: b.live || 0 },
      { name: "Donazioni", value: b.donation || 0 },
      { name: "Abbonamenti", value: b.subscription || 0 },
      { name: "Altro", value: b.other || 0 },
    ].filter((e) => e.value > 0);
    return entries;
  }, [data.spendBreakdown]);

  const payoutPie = useMemo(() => {
    const b = data.payouts?.byStatus || {};
    return [
      { name: "Pending", value: b.pending || 0 },
      { name: "Processing", value: b.processing || 0 },
      { name: "Paid", value: b.paid || 0 },
      { name: "Rejected", value: b.rejected || 0 },
    ].filter((e) => e.value > 0);
  }, [data.payouts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-base sm:text-lg truncate">Admin Console — Tokaro.fans</h1>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => loadAll(false)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => { await logout(); navigate("/"); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {tab === "overview" && <OverviewTab data={data} spendPie={spendPie} />}
          {tab === "users" && <UsersTab data={data} onRefresh={() => loadAll(false)} />}
          {tab === "moderation" && <ModerationTab data={data} reload={() => loadAll(false)} />}
          {tab === "economy" && <EconomyTab data={data} spendPie={spendPie} />}
          {tab === "payouts" && <PayoutsTab data={data} payoutPie={payoutPie} reload={() => loadAll(false)} />}
          {tab === "orders" && <OrdersTab data={data} reload={() => loadAll(false)} />}
          {tab === "engagement" && <EngagementTab data={data} />}
          {tab === "live" && <LiveTab data={data} />}
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ data, spendPie }) {
  const u = data.usersOverview || {};
  const e = data.economy || { tx: {} };
  const eng = data.engagement || {};
  const p = data.payouts || { byStatus: {} };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Utenti totali" value={fmtNum(u.total)} sub={`+${fmtNum(u.last24h)} ultime 24h`} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={Crown} label="Creator" value={fmtNum(u.creators)} sub={`${u.total ? Math.round((u.creators / u.total) * 100) : 0}% della base`} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={Heart} label="Fan" value={fmtNum(u.fans)} sub={`${fmtNum(u.onboarded)} onboarded`} color="text-chart-5" bg="bg-chart-5/10" />
        <StatCard icon={Coins} label="Token circolanti" value={fmtToken(e.circulating)} sub={`Fan ${fmtToken(e.userBalance)} · Creator ${fmtToken(e.creatorBalance)}`} color="text-chart-3" bg="bg-chart-3/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowUpRight} label="Topup totale" value={fmtToken(e.tx?.topup)} color="text-chart-3" bg="bg-chart-3/10" />
        <StatCard icon={ArrowDownRight} label="Spesa totale" value={fmtToken(e.tx?.spend)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={Banknote} label="Payout pagati" value={fmtEuro(p.totalEuroPaid)} sub={`${fmtNum(p.byStatus?.paid)} richieste`} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={TrendingUp} label="Views totali" value={fmtNum(eng.views)} sub={`${fmtNum(eng.likes)} like`} color="text-destructive" bg="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PanelCard title="Signup ultimi 30 giorni">
            <SignupChart series={data.signupSeries || []} />
          </PanelCard>
        </div>
        <PanelCard title="Distribuzione spesa">
          {spendPie.length ? <SpendPie data={spendPie} /> : <EmptyState>Nessuna spesa registrata</EmptyState>}
        </PanelCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------
function UsersTab({ data, onRefresh }) {
  const u = data.usersOverview || {};
  const recent = data.recentSignups || [];
  const [planUpdating, setPlanUpdating] = useState(null);

  const handlePlanChange = async (userId, plan) => {
    setPlanUpdating(userId);
    try {
      await updateCreatorPlan(userId, plan);
      onRefresh?.();
    } catch (err) {
      console.error("[admin] set plan error:", err.message);
    } finally {
      setPlanUpdating(null);
    }
  };

  const planBadgeClass = (plan) => {
    if (plan === "pro") return "bg-primary/20 text-primary border-primary/30";
    if (plan === "start") return "bg-chart-4/20 text-chart-4 border-chart-4/30";
    return "bg-secondary/60 text-muted-foreground border-border/30";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Utenti totali" value={fmtNum(u.total)} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={Crown} label="Creator" value={fmtNum(u.creators)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={Heart} label="Fan" value={fmtNum(u.fans)} color="text-chart-5" bg="bg-chart-5/10" />
        <StatCard icon={ShieldCheck} label="Admin" value={fmtNum(u.admins)} color="text-chart-3" bg="bg-chart-3/10" />
      </div>

      <PanelCard title="Signup ultimi 30 giorni (split per ruolo)">
        <SignupChart series={data.signupSeries || []} splitByRole />
      </PanelCard>

      <PanelCard title="Ultimi registrati">
        {recent.length === 0 ? (
          <EmptyState>Nessun utente registrato</EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">Utente</th>
                  <th className="px-2 py-2">Ruolo</th>
                  <th className="px-2 py-2">Piano</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Onboarded</th>
                  <th className="px-2 py-2">Registrato</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border/20">
                    <td className="px-2 py-2">
                      <div className="font-semibold">{r.full_name || r.email?.split("@")[0] || "—"}</div>
                      <div className="text-muted-foreground text-[11px]">{r.email}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/60 text-[10px] font-semibold capitalize">{r.role}</span>
                    </td>
                    <td className="px-2 py-2">
                      {r.role === "creator" ? (
                        <select
                          value={r.plan || "free"}
                          onChange={(e) => handlePlanChange(r.id, e.target.value)}
                          disabled={planUpdating === r.id}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border cursor-pointer bg-transparent ${planBadgeClass(r.plan || "free")}`}
                        >
                          <option value="free">Free</option>
                          <option value="start">Start</option>
                          <option value="pro">Pro</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${statusBadgeClass(r.status || "active")}`}>
                        {STATUS_META[r.status || "active"]?.label || "Attivo"}
                      </span>
                    </td>
                    <td className="px-2 py-2">{r.onboarding_complete ? "✅" : "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{shortDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Economy Tab
// ---------------------------------------------------------------------------
function EconomyTab({ data, spendPie }) {
  const e = data.economy || { tx: {} };
  const flow = data.tokenFlow || [];
  const creators = data.topCreators || [];
  const fans = data.topFans || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Circolante" value={fmtToken(e.circulating)} color="text-chart-3" bg="bg-chart-3/10" />
        <StatCard icon={Heart} label="Saldo fan" value={fmtToken(e.userBalance)} color="text-chart-5" bg="bg-chart-5/10" />
        <StatCard icon={Crown} label="Saldo creator" value={fmtToken(e.creatorBalance)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={ArrowUpRight} label="Topup totale" value={fmtToken(e.tx?.topup)} color="text-chart-4" bg="bg-chart-4/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PanelCard title="Volume token ultimi 30 giorni">
            <TokenFlowChart data={flow} />
          </PanelCard>
        </div>
        <PanelCard title="Dove spendono i fan">
          {spendPie.length ? <SpendPie data={spendPie} /> : <EmptyState>Nessuna spesa</EmptyState>}
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard title="Top 10 creator per earned">
          <Leaderboard rows={creators} metric="total_earned" format={fmtToken} />
        </PanelCard>
        <PanelCard title="Top 10 fan per spent">
          <Leaderboard rows={fans} metric="total_spent" format={fmtToken} />
        </PanelCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payouts Tab
// ---------------------------------------------------------------------------
function PayoutsTab({ data, payoutPie, reload }) {
  const p = data.payouts || { byStatus: {} };
  const requests = data.payoutRequests || [];
  const [acting, setActing] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleAction = async (payoutId, action) => {
    setActing(payoutId);
    try {
      const res = await fetch("/api/payout-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      reload();
    } catch (e) {
      alert("Errore: " + e.message);
    } finally {
      setActing(null);
    }
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const statusColors = { pending: "text-chart-4 bg-chart-4/10 border-chart-4/20", processing: "text-blue-400 bg-blue-500/10 border-blue-500/20", paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", rejected: "text-destructive bg-destructive/10 border-destructive/20" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="Totale richieste" value={fmtNum(p.total)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={Loader2} label="Pending" value={fmtNum(p.byStatus?.pending)} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={RefreshCw} label="Processing" value={fmtNum(p.byStatus?.processing)} color="text-chart-3" bg="bg-chart-3/10" />
        <StatCard icon={ShieldCheck} label="Pagati" value={fmtEuro(p.totalEuroPaid)} sub={`${fmtNum(p.byStatus?.paid)} richieste`} color="text-chart-5" bg="bg-chart-5/10" />
      </div>

      <PanelCard title="Distribuzione per status">
        {payoutPie.length ? <SpendPie data={payoutPie} /> : <EmptyState>Nessuna richiesta payout</EmptyState>}
      </PanelCard>

      <PanelCard title="Richieste Payout">
        <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
          {["all", "pending", "processing", "paid", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground bg-secondary/30"}`}>
              {f === "all" ? "Tutti" : f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${requests.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState>Nessuna richiesta payout {filter !== "all" && `con stato "${filter}"`}</EmptyState>
        ) : (
          <div className="space-y-2">
            {filtered.map(req => {
              const prof = req.profiles || {};
              const pm = prof.payout_method;
              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-secondary/20 border border-border/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{prof.full_name || "Creator"}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[req.status]}`}>{req.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">@{prof.handle || "—"} · {new Date(req.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    {pm && <p className="text-xs text-muted-foreground mt-1">IBAN: {pm.iban ? `${pm.iban.slice(0,4)}****${pm.iban.slice(-4)}` : "non impostato"} · {pm.holder || ""}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{req.token_amount} T</p>
                    <p className="text-xs text-chart-3 font-semibold">€{Number(req.euro_amount).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {req.status === "pending" && (
                      <>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={acting === req.id} onClick={() => handleAction(req.id, "approve")}>
                          {acting === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" />Approva</>}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" disabled={acting === req.id} onClick={() => handleAction(req.id, "reject")}>
                          <XCircle className="w-3 h-3 mr-1" />Rifiuta
                        </Button>
                      </>
                    )}
                    {req.status === "processing" && (
                      <Button size="sm" className="h-7 text-xs bg-chart-3 hover:bg-chart-3/90 text-black" disabled={acting === req.id} onClick={() => handleAction(req.id, "paid")}>
                        {acting === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Banknote className="w-3 h-3 mr-1" />Segna pagato</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engagement Tab
// ---------------------------------------------------------------------------
function EngagementTab({ data }) {
  const eng = data.engagement || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Views totali" value={fmtNum(eng.views)} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={Heart} label="Like totali" value={fmtNum(eng.likes)} color="text-chart-5" bg="bg-chart-5/10" />
        <StatCard icon={Activity} label="Sessioni tracciate" value={fmtNum(eng.sessions)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={RefreshCw} label="Dwell medio" value={`${fmtNum(eng.avgDwellSec)} s`} color="text-chart-3" bg="bg-chart-3/10" />
      </div>
      {!eng.sessions && (
        <PanelCard title="Nota">
          <p className="text-xs text-muted-foreground">
            I dati di engagement arrivano dalla tabella <code className="font-mono text-[11px]">content_behaviors</code>,
            popolata dall'hook <code className="font-mono text-[11px]">useFeedEngine</code> quando gli utenti interagiscono con il feed.
            Finché non ci sono sessioni reali questi valori restano a zero.
          </p>
        </PanelCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Tab
// ---------------------------------------------------------------------------
function LiveTab({ data }) {
  const l = data.liveStats || { byLive: [] };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Radio} label="Acquisti live totali" value={fmtNum(l.totalPurchases)} color="text-destructive" bg="bg-destructive/10" />
        <StatCard icon={Coins} label="Token spesi in live" value={fmtToken(l.totalTokens)} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={Activity} label="Live con vendite" value={fmtNum(l.byLive.length)} color="text-primary" bg="bg-primary/10" />
      </div>

      <PanelCard title="Vendite per live">
        {l.byLive.length === 0 ? (
          <EmptyState>Nessun acquisto live registrato</EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">Live ID</th>
                  <th className="px-2 py-2 text-right">Acquisti</th>
                  <th className="px-2 py-2 text-right">Token</th>
                </tr>
              </thead>
              <tbody>
                {l.byLive.map((row) => (
                  <tr key={row.liveId} className="border-t border-border/20">
                    <td className="px-2 py-2 font-mono text-[11px]">{row.liveId}</td>
                    <td className="px-2 py-2 text-right">{fmtNum(row.purchases)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{fmtToken(row.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Prossimi step">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Per metriche live più complete (viewership, durata stream, CCU) serve una tabella{" "}
          <code className="font-mono text-[11px]">lives</code> con sessioni reali e pipeline ingest.
          Oggi vediamo solo gli acquisti di accesso tracciati in <code className="font-mono text-[11px]">token_transactions.ref_id</code>.
        </p>
      </PanelCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moderation Tab
// ---------------------------------------------------------------------------
function ModerationTab({ data, reload }) {
  const overview = data.reportsOverview || { pending: 0, resolved: 0, dismissed: 0 };
  const reports = data.reportsPending || [];
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const handleResolve = async (report, action) => {
    setError("");
    setBusyId(report.id);
    try {
      if (action === "warn" || action === "suspend" || action === "ban") {
        const newStatus = action === "warn" ? "warned" : action === "suspend" ? "suspended" : "banned";
        await updateUserStatus(report.target_id, newStatus);
        await updateReportStatus(report.id, { status: "resolved", actionTaken: newStatus });
      } else if (action === "resolve") {
        await updateReportStatus(report.id, { status: "resolved", actionTaken: "none" });
      } else if (action === "dismiss") {
        await updateReportStatus(report.id, { status: "dismissed", actionTaken: null });
      }
      await reload();
    } catch (e) {
      setError(e.message || "Errore azione moderazione");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Flag} label="Report pendenti" value={fmtNum(overview.pending)} color="text-destructive" bg="bg-destructive/10" />
        <StatCard icon={CheckCircle2} label="Risolti" value={fmtNum(overview.resolved)} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={XCircle} label="Dismessi" value={fmtNum(overview.dismissed)} color="text-muted-foreground" bg="bg-secondary/40" />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <PanelCard title={`Coda moderazione (${reports.length})`}>
        {reports.length === 0 ? (
          <EmptyState>Nessun report pendente. Tutto tranquillo.</EmptyState>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const reporter = r.reporter || {};
              const target = r.target || {};
              const targetName = target.full_name || target.email?.split("@")[0] || "—";
              const reporterName = reporter.full_name || reporter.email?.split("@")[0] || "—";
              const busy = busyId === r.id;
              return (
                <div key={r.id} className="border border-border/30 rounded-xl p-4 bg-secondary/20">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                          <Flag className="w-3 h-3" />
                          {REPORT_REASON_LABEL[r.reason] || r.reason}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{shortDate(r.created_at)}</span>
                        {r.context_type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 font-mono">
                            {r.context_type}:{r.context_id}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Segnalato</p>
                          <p className="text-sm font-semibold truncate">{targetName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{target.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/60 text-[10px] font-semibold capitalize">{target.role || "—"}</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${statusBadgeClass(target.status || "active")}`}>
                              {STATUS_META[target.status || "active"]?.label || "Attivo"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Da</p>
                          <p className="text-sm font-semibold truncate">{reporterName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{reporter.email}</p>
                        </div>
                      </div>
                      {r.description && (
                        <div className="mt-3 text-xs text-muted-foreground bg-card/50 rounded-lg p-2 border border-border/30 whitespace-pre-wrap">
                          {r.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => handleResolve(r, "dismiss")} className="border-border/50">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Dismetti
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => handleResolve(r, "resolve")} className="border-border/50">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Risolto senza azione
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => handleResolve(r, "warn")} className="bg-chart-4/80 hover:bg-chart-4 text-background">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Avverti
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => handleResolve(r, "suspend")} className="bg-destructive/80 hover:bg-destructive">
                      <Ban className="w-3.5 h-3.5 mr-1" /> Sospendi
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => handleResolve(r, "ban")} className="bg-destructive hover:bg-destructive/90">
                      <Ban className="w-3.5 h-3.5 mr-1" /> Banna
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
const TooltipDark = /** @type {any} */ (({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
});

function SignupChart({ series, splitByRole = false }) {
  if (!series?.length) return <EmptyState>Nessun dato</EmptyState>;
  const data = series.map((r) => ({ ...r, day: shortDay(r.date) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
        <XAxis dataKey="day" stroke="#888" fontSize={10} />
        <YAxis stroke="#888" fontSize={10} allowDecimals={false} />
        <Tooltip content={<TooltipDark />} />
        {splitByRole ? (
          <>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="fan" stroke="#ec4899" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="creator" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="admin" stroke="#10b981" strokeWidth={2} dot={false} />
          </>
        ) : (
          <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function TokenFlowChart({ data }) {
  if (!data?.length) return <EmptyState>Nessun movimento token</EmptyState>;
  const rows = data.map((r) => ({ ...r, day: shortDay(r.date) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
        <XAxis dataKey="day" stroke="#888" fontSize={10} />
        <YAxis stroke="#888" fontSize={10} />
        <Tooltip content={<TooltipDark />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="topup" fill="#10b981" />
        <Bar dataKey="spend" fill="#8b5cf6" />
        <Bar dataKey="earn" fill="#06b6d4" />
        <Bar dataKey="payout" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SpendPie({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<TooltipDark />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Leaderboard({ rows, metric, format }) {
  if (!rows?.length) return <EmptyState>Nessun dato</EmptyState>;
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => {
        const p = r.profile || {};
        const name = p.full_name || p.handle || p.email?.split("@")[0] || "—";
        return (
          <li key={r.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 transition-colors">
            <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-[10px] font-bold">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
            </div>
            <span className="text-xs font-bold text-primary">{format(r[metric])}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Orders Tab
// ---------------------------------------------------------------------------
function OrdersTab({ data, reload }) {
  const orders = data.paymentOrders || [];
  const [acting, setActing] = useState(null);

  const pending = orders.filter((o) => o.status === "pending");
  const completed = orders.filter((o) => o.status !== "pending");

  const handleConfirm = async (order) => {
    setActing(order.id);
    try {
      if (order.order_type === "token_pack") {
        await confirmTokenPurchase(order.id);
      } else {
        await confirmPlanPurchase(order.id);
      }
      reload?.();
    } catch (e) {
      console.error("[admin] confirm order error:", e.message);
      alert("Errore: " + e.message);
    } finally {
      setActing(null);
    }
  };

  const handleFail = async (order) => {
    setActing(order.id);
    try {
      await failPaymentOrder(order.id);
      reload?.();
    } catch (e) {
      console.error("[admin] fail order error:", e.message);
      alert("Errore: " + e.message);
    } finally {
      setActing(null);
    }
  };

  const orderStatusClass = (s) => {
    if (s === "succeeded") return "bg-chart-3/20 text-chart-3 border-chart-3/30";
    if (s === "failed" || s === "cancelled") return "bg-destructive/20 text-destructive border-destructive/30";
    return "bg-chart-4/20 text-chart-4 border-chart-4/30";
  };

  const OrderRow = ({ o, showActions }) => (
    <tr className="border-t border-border/20">
      <td className="px-2 py-2">
        <div className="font-semibold text-xs">{o.profiles?.full_name || o.profiles?.email?.split("@")[0] || "—"}</div>
        <div className="text-muted-foreground text-[11px]">{o.profiles?.email || ""}</div>
      </td>
      <td className="px-2 py-2">
        <span className="text-[10px] font-semibold">
          {o.order_type === "token_pack" ? `${o.token_amount} Token` : `Piano ${o.target_code}`}
        </span>
      </td>
      <td className="px-2 py-2 font-semibold text-xs">€{Number(o.amount_eur).toFixed(2)}</td>
      <td className="px-2 py-2">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${orderStatusClass(o.status)}`}>
          {o.status === "pending" ? "In attesa" : o.status === "succeeded" ? "Confermato" : o.status}
        </span>
      </td>
      <td className="px-2 py-2 text-muted-foreground text-[11px]">{shortDate(o.created_at)}</td>
      {showActions && (
        <td className="px-2 py-2">
          {o.status === "pending" && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-chart-3 hover:bg-chart-3/10"
                onClick={() => handleConfirm(o)}
                disabled={acting === o.id}
              >
                {acting === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                Conferma
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                onClick={() => handleFail(o)}
                disabled={acting === o.id}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Rifiuta
              </Button>
            </div>
          )}
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="In attesa" value={String(pending.length)} color="text-chart-4" bg="bg-chart-4/10" />
        <StatCard icon={CheckCircle2} label="Confermati" value={String(orders.filter((o) => o.status === "succeeded").length)} color="text-chart-3" bg="bg-chart-3/10" />
        <StatCard icon={ShoppingCart} label="Token pack" value={String(orders.filter((o) => o.order_type === "token_pack").length)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={Crown} label="Piani creator" value={String(orders.filter((o) => o.order_type === "creator_plan").length)} color="text-chart-5" bg="bg-chart-5/10" />
      </div>

      {pending.length > 0 && (
        <PanelCard title={`Ordini in attesa (${pending.length})`}>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">Utente</th>
                  <th className="px-2 py-2">Ordine</th>
                  <th className="px-2 py-2">Importo</th>
                  <th className="px-2 py-2">Stato</th>
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => <OrderRow key={o.id} o={o} showActions />)}
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}

      <PanelCard title="Tutti gli ordini">
        {orders.length === 0 ? (
          <EmptyState>Nessun ordine</EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">Utente</th>
                  <th className="px-2 py-2">Ordine</th>
                  <th className="px-2 py-2">Importo</th>
                  <th className="px-2 py-2">Stato</th>
                  <th className="px-2 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {completed.slice(0, 50).map((o) => <OrderRow key={o.id} o={o} />)}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export wrapped by AuthGuard (solo role='admin')
// ---------------------------------------------------------------------------
export default function AdminConsole() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <AdminConsoleInner />
    </AuthGuard>
  );
}
