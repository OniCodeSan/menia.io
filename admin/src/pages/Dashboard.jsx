import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Users, Coins, AlertTriangle, ShoppingCart, Banknote, TrendingUp, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const StatCard = ({ icon: Icon, label, value, sub, color = "text-brand" }) => (
  <div className="card flex items-start gap-4">
    <div className={`p-2.5 rounded-lg bg-surface-hover ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [signups, setSignups] = useState([]);
  const [tokenFlow, setTokenFlow] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, s, tf] = await Promise.all([
        api.getDashboard(),
        api.getSignupMetrics(30),
        api.getTokenFlowMetrics(30),
      ]);
      setData(dash);
      setSignups(s);
      setTokenFlow(tf);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  const d = data || {};
  const u = d.users || {};
  const t = d.tokens || {};

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Aggiorna
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Utenti totali" value={u.total || 0} sub={`+${u.last24h || 0} ultime 24h`} />
        <StatCard icon={TrendingUp} label="Creator" value={u.creators || 0} color="text-emerald-400" />
        <StatCard icon={Coins} label="Token circolanti" value={(t.circulating || 0).toLocaleString()} color="text-amber-400" />
        <StatCard icon={Banknote} label="EUR pagati" value={`€${(d.revenue?.totalEuroPaid || 0).toFixed(2)}`} color="text-green-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Ordini pending" value={d.orders?.pending || 0} color="text-yellow-400" />
        <StatCard icon={AlertTriangle} label="Ordini falliti" value={d.orders?.failed || 0} color="text-red-400" />
        <StatCard icon={Banknote} label="Payouts pending" value={d.payouts?.pending || 0} color="text-orange-400" />
        <StatCard icon={AlertTriangle} label="Report pending" value={d.reports?.pending || 0} color="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Registrazioni (30 giorni)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={signups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip contentStyle={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="creator" stackId="a" fill="#893EF5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fan" stackId="a" fill="#198CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Flusso Token (30 giorni)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tokenFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip contentStyle={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="topup" fill="#26D8D8" name="Ricariche" />
              <Bar dataKey="spend" fill="#f59e0b" name="Spesa" />
              <Bar dataKey="payout" fill="#ef4444" name="Payout" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
