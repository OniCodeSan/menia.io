import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ChevronLeft, ChevronRight, Check, X, CreditCard } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
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
      const res = await api.getPayouts(params);
      setPayouts(res.payouts);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, status]);

  const handleAction = async (id, action) => {
    let reason = "";
    if (action === "reject") {
      reason = prompt("Motivo del rifiuto:");
      if (!reason) return;
    }
    if (!confirm(`${action === "approve" ? "Approvare" : action === "paid" ? "Segnare come pagato" : "Rifiutare"} il payout?`)) return;
    try {
      await api.payoutAction(id, action, reason);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <h1 className="text-xl font-bold">Compensi ({total})</h1>

      <div className="flex gap-3">
        {["", "pending", "processing", "paid", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setOffset(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${status === s ? "bg-brand text-white" : "bg-surface-hover text-gray-400 hover:text-gray-200"}`}
          >
            {s || "Tutti"}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3 text-right">Token</th>
              <th className="px-4 py-3 text-right">EUR</th>
              <th className="px-4 py-3">IBAN</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="px-4 py-3 text-gray-300">{p.profile?.full_name || p.creator_id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-right font-mono">{p.token_amount}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">€{Number(p.euro_amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                  {p.profile?.payout_method ? `****${JSON.parse(p.profile.payout_method || "{}").iban?.slice(-4) || ""}` : "—"}
                </td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.status === "pending" && (
                      <button onClick={() => handleAction(p.id, "approve")} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Approva">
                        <Check size={14} />
                      </button>
                    )}
                    {p.status === "processing" && (
                      <button onClick={() => handleAction(p.id, "paid")} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Pagato">
                        <CreditCard size={14} />
                      </button>
                    )}
                    {(p.status === "pending" || p.status === "processing") && (
                      <button onClick={() => handleAction(p.id, "reject")} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Rifiuta">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!payouts.length && !loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nessun payout</td></tr>
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
