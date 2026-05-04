import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PLAN_COLORS = {
  free: "bg-gray-500/20 text-gray-400",
  start: "bg-blue-500/20 text-blue-400",
  pro: "bg-brand/20 text-brand",
};

export default function Creators() {
  const [creators, setCreators] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (search) params.search = search;
      if (plan) params.plan = plan;
      const res = await api.getCreators(params);
      setCreators(res.creators);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, plan]);

  const handlePlanChange = async (id, newPlan) => {
    if (!confirm(`Cambiare piano a ${newPlan}?`)) return;
    try {
      await api.setCreatorPlan(id, newPlan);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspend = async (id, suspended) => {
    if (!confirm(suspended ? "Sospendere il creator?" : "Riattivare il creator?")) return;
    try {
      await api.suspendCreator(id, suspended);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <h1 className="text-xl font-bold">Creator ({total})</h1>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setOffset(0); load(); }} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca nome, handle..." className="input pl-9 w-56" />
          </div>
          <button type="submit" className="btn-primary text-sm">Cerca</button>
        </form>
        <select value={plan} onChange={(e) => { setPlan(e.target.value); setOffset(0); }} className="input w-auto">
          <option value="">Tutti i piani</option>
          <option value="free">Free</option>
          <option value="start">Start</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Handle</th>
              <th className="px-4 py-3">Piano</th>
              <th className="px-4 py-3 text-right">Guadagni</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <Link to={`/users/${c.id}`} className="text-brand hover:underline font-medium">{c.full_name || "—"}</Link>
                </td>
                <td className="px-4 py-3 text-gray-400">@{c.handle || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.plan || "free"}
                    onChange={(e) => handlePlanChange(c.id, e.target.value)}
                    className="input w-auto text-xs py-1 px-2"
                  >
                    <option value="free">Free</option>
                    <option value="start">Start</option>
                    <option value="pro">Pro</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">{c.wallet?.total_earned || 0}</td>
                <td className="px-4 py-3 text-right font-mono">{c.wallet?.balance || 0}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.status === "suspended" ? "bg-orange-500/20 text-orange-400" : c.status === "banned" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {c.status || "active"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.status === "suspended" ? (
                    <button onClick={() => handleSuspend(c.id, false)} className="btn-success text-xs py-1 px-2">Riattiva</button>
                  ) : c.status !== "banned" ? (
                    <button onClick={() => handleSuspend(c.id, true)} className="btn-danger text-xs py-1 px-2">Sospendi</button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!creators.length && !loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nessun creator</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{offset + 1}–{Math.min(offset + limit, total)} di {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn-secondary text-xs px-3 py-1.5"><ChevronLeft size={14} /></button>
            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="btn-secondary text-xs px-3 py-1.5"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
