import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

const ACTION_COLORS = {
  wallet_adjust: "bg-amber-500/20 text-amber-400",
  user_status_change: "bg-red-500/20 text-red-400",
  user_role_change: "bg-brand/20 text-brand",
  user_force_logout: "bg-orange-500/20 text-orange-400",
  user_reset_password: "bg-blue-500/20 text-blue-400",
  order_confirm: "bg-emerald-500/20 text-emerald-400",
  order_fail: "bg-red-500/20 text-red-400",
  payout_approve: "bg-blue-500/20 text-blue-400",
  payout_reject: "bg-red-500/20 text-red-400",
  payout_paid: "bg-emerald-500/20 text-emerald-400",
  report_dismiss: "bg-gray-500/20 text-gray-400",
  report_resolve: "bg-emerald-500/20 text-emerald-400",
  creator_plan_change: "bg-brand/20 text-brand",
  creator_suspend: "bg-orange-500/20 text-orange-400",
  creator_unsuspend: "bg-emerald-500/20 text-emerald-400",
  config_update: "bg-blue-500/20 text-blue-400",
  notification_send: "bg-purple-500/20 text-purple-400",
  export_csv: "bg-gray-500/20 text-gray-400",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (action) params.action = action;
      const res = await api.getAuditLog(params);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, action]);

  const ACTIONS = [...new Set(Object.keys(ACTION_COLORS))].sort();

  return (
    <div className="space-y-4 max-w-7xl">
      <h1 className="text-xl font-bold">Audit Log ({total})</h1>

      <div className="flex gap-3">
        <select value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }} className="input w-auto">
          <option value="">Tutte le azioni</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Azione</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Dettagli</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{l.created_at?.slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-3 text-gray-300">{l.admin?.full_name || l.admin_id?.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${ACTION_COLORS[l.action] || "bg-gray-500/20 text-gray-400"}`}>
                    {l.action?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                  {l.target_type && <span className="text-gray-500">{l.target_type}: </span>}
                  {l.target_id?.slice(0, 8) || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                  {l.details && Object.keys(l.details).length > 0
                    ? Object.entries(l.details).map(([k, v]) => `${k}=${v}`).join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono">{l.ip_address || "—"}</td>
              </tr>
            ))}
            {!logs.length && !loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nessun log</td></tr>
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
