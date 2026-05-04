import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

const REASON_COLORS = {
  spam: "bg-yellow-500/20 text-yellow-400",
  harassment: "bg-red-500/20 text-red-400",
  scam: "bg-orange-500/20 text-orange-400",
  inappropriate: "bg-pink-500/20 text-pink-400",
  impersonation: "bg-purple-500/20 text-purple-400",
  other: "bg-gray-500/20 text-gray-400",
};

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-gray-500/20 text-gray-400",
};

export default function Moderation() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (status) params.status = status;
      const res = await api.getReports(params);
      setReports(res.reports);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, status]);

  const handleAction = async (id, action, userAction = null) => {
    const labels = {
      dismiss: "Ignorare il report?",
      resolve: userAction ? `Risolvere e applicare "${userAction}" all'utente?` : "Risolvere senza azione?",
    };
    if (!confirm(labels[action] || "Confermare?")) return;
    try {
      await api.reportAction(id, action, userAction);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <h1 className="text-xl font-bold">Moderazione ({total})</h1>

      <div className="flex gap-3">
        {["pending", "resolved", "dismissed", ""].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setOffset(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${status === s ? "bg-brand text-white" : "bg-surface-hover text-gray-400 hover:text-gray-200"}`}
          >
            {s || "Tutti"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${REASON_COLORS[r.reason] || REASON_COLORS.other}`}>{r.reason}</span>
                  <span className={`badge ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <span className="text-xs text-gray-500">{r.created_at?.slice(0, 16).replace("T", " ")}</span>
                </div>
                <div className="text-sm mb-2">
                  <span className="text-gray-500">Da: </span>
                  <Link to={`/users/${r.reporter_id}`} className="text-brand hover:underline">{r.reporter?.full_name || r.reporter_id?.slice(0, 8)}</Link>
                  <span className="text-gray-600 mx-2">→</span>
                  <span className="text-gray-500">Verso: </span>
                  <Link to={`/users/${r.target_id}`} className="text-red-400 hover:underline">{r.target?.full_name || r.target_id?.slice(0, 8)}</Link>
                  {r.target?.status && r.target.status !== "active" && (
                    <span className="badge bg-red-500/20 text-red-400 ml-2">{r.target.status}</span>
                  )}
                </div>
                {r.description && (
                  <p className="text-sm text-gray-400 bg-surface rounded-lg p-3 whitespace-pre-wrap">{r.description}</p>
                )}
              </div>

              {r.status === "pending" && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => handleAction(r.id, "dismiss")} className="btn-secondary text-xs py-1.5">Ignora</button>
                  <button onClick={() => handleAction(r.id, "resolve")} className="btn-secondary text-xs py-1.5">Risolvi</button>
                  <button onClick={() => handleAction(r.id, "resolve", "warned")} className="btn-secondary text-xs py-1.5 text-yellow-400">Avverti</button>
                  <button onClick={() => handleAction(r.id, "resolve", "suspended")} className="btn-danger text-xs py-1.5">Sospendi</button>
                  <button onClick={() => handleAction(r.id, "resolve", "banned")} className="btn-danger text-xs py-1.5">Banna</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!reports.length && !loading && (
          <div className="card text-center text-gray-500 py-8">Nessun report</div>
        )}
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
