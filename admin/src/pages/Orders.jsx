import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Download, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  succeeded: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (status) params.status = status;
      const res = await api.getOrders(params);
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, status]);

  const handleAction = async (id, action) => {
    if (!confirm(`${action === "confirm" ? "Confermare" : "Annullare"} l'ordine?`)) return;
    try {
      if (action === "confirm") await api.confirmOrder(id);
      else await api.failOrder(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Ordini ({total})</h1>
        <button onClick={() => api.exportCsv("orders")} className="btn-secondary text-sm flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className="input w-auto">
          <option value="">Tutti</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Completati</option>
          <option value="failed">Falliti</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">EUR</th>
              <th className="px-4 py-3 text-right">Token</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="px-4 py-3 text-gray-300">{o.profile?.full_name || o.user_id?.slice(0, 8)}</td>
                <td className="px-4 py-3"><span className="badge bg-brand/20 text-brand">{o.order_type}</span></td>
                <td className="px-4 py-3 text-right font-mono">€{Number(o.amount_eur || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{o.token_amount || "—"}</td>
                <td className="px-4 py-3 text-gray-400">{o.provider || "—"}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[o.status] || "bg-gray-500/20 text-gray-400"}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3">
                  {o.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(o.id, "confirm")} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Conferma">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleAction(o.id, "fail")} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Annulla">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!orders.length && !loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nessun ordine</td></tr>
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
