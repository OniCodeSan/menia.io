import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Ban, UserCog, LogOut, KeyRound, Coins } from "lucide-react";

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUser(id);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const action = async (fn, msg) => {
    if (!confirm(msg)) return;
    try {
      await fn();
      setActionMsg("Operazione completata");
      load();
    } catch (err) {
      setActionMsg(`Errore: ${err.message}`);
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-gray-500">Utente non trovato</p>;

  const p = data.profile || {};
  const userWallet = data.wallets?.find((w) => w.wallet_type === "user");
  const creatorWallet = data.wallets?.find((w) => w.wallet_type === "creator");

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/users" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={16} /> Torna alla lista
      </Link>

      {actionMsg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${actionMsg.startsWith("Errore") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          {actionMsg}
        </div>
      )}

      <div className="card">
        <div className="flex items-start gap-4">
          {p.avatar_url ? (
            <img src={p.avatar_url} className="w-16 h-16 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xl font-bold">
              {(p.full_name || "?")[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{p.full_name || "—"}</h1>
            <p className="text-gray-400 text-sm">{data.email || p.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="badge bg-brand/20 text-brand">{p.role}</span>
              <span className="badge bg-surface-hover text-gray-300">{p.plan || "free"}</span>
              <span className={`badge ${p.status === "banned" ? "bg-red-500/20 text-red-400" : p.status === "suspended" ? "bg-orange-500/20 text-orange-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {p.status || "active"}
              </span>
              {p.handle && <span className="text-gray-500">@{p.handle}</span>}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Registrato: {p.created_at?.slice(0, 10)} · Ultimo login: {data.lastSignIn?.slice(0, 10) || "—"} · MFA: {data.mfa ? "Si" : "No"}
            </p>
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><Coins size={16} /> Wallet Fan</h3>
          {userWallet ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold">{userWallet.balance}</p><p className="text-xs text-gray-500">Saldo</p></div>
              <div><p className="text-xl font-bold text-emerald-400">{userWallet.total_earned}</p><p className="text-xs text-gray-500">Guadagnati</p></div>
              <div><p className="text-xl font-bold text-amber-400">{userWallet.total_spent}</p><p className="text-xs text-gray-500">Spesi</p></div>
            </div>
          ) : <p className="text-sm text-gray-500">Nessun wallet</p>}
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><Coins size={16} /> Wallet Creator</h3>
          {creatorWallet ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold">{creatorWallet.balance}</p><p className="text-xs text-gray-500">Saldo</p></div>
              <div><p className="text-xl font-bold text-emerald-400">{creatorWallet.total_earned}</p><p className="text-xs text-gray-500">Guadagnati</p></div>
              <div><p className="text-xl font-bold text-amber-400">{creatorWallet.total_spent}</p><p className="text-xs text-gray-500">Spesi</p></div>
            </div>
          ) : <p className="text-sm text-gray-500">Nessun wallet</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Azioni</h3>
        <div className="flex flex-wrap gap-2">
          <select
            defaultValue={p.role}
            onChange={(e) => action(() => api.setUserRole(id, e.target.value), `Cambiare ruolo a ${e.target.value}?`)}
            className="input w-auto text-sm"
          >
            <option value="fan">Fan</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>

          <select
            defaultValue={p.status || "active"}
            onChange={(e) => action(() => api.setUserStatus(id, e.target.value), `Cambiare status a ${e.target.value}?`)}
            className="input w-auto text-sm"
          >
            <option value="active">Attivo</option>
            <option value="warned">Avvertito</option>
            <option value="suspended">Sospeso</option>
            <option value="banned">Bannato</option>
          </select>

          <button onClick={() => action(() => api.resetPassword(id), "Inviare email reset password?")} className="btn-secondary text-sm flex items-center gap-2">
            <KeyRound size={14} /> Reset Password
          </button>

          <button onClick={() => action(() => api.forceLogout(id), "Forzare logout?")} className="btn-danger text-sm flex items-center gap-2">
            <LogOut size={14} /> Forza Logout
          </button>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Ultime transazioni</h3>
        {data.transactions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-gray-500"><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Wallet</th><th className="px-3 py-2 text-right">Importo</th><th className="px-3 py-2 text-left">Descrizione</th><th className="px-3 py-2 text-left">Data</th></tr></thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/30">
                    <td className="px-3 py-2"><span className={`badge ${tx.type === "topup" ? "bg-emerald-500/20 text-emerald-400" : tx.type === "spend" ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/20 text-gray-400"}`}>{tx.type}</span></td>
                    <td className="px-3 py-2 text-gray-400">{tx.wallet_type}</td>
                    <td className={`px-3 py-2 text-right font-mono ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>{tx.amount > 0 ? "+" : ""}{tx.amount}</td>
                    <td className="px-3 py-2 text-gray-400 truncate max-w-[200px]">{tx.description || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{tx.created_at?.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-500">Nessuna transazione</p>}
      </div>

      {/* Reports */}
      {data.reports?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-red-400 mb-3">Segnalazioni ricevute ({data.reports.length})</h3>
          <div className="space-y-2">
            {data.reports.map((r) => (
              <div key={r.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="badge bg-red-500/20 text-red-400">{r.reason}</span>
                  <span className="text-xs text-gray-500">{r.created_at?.slice(0, 10)}</span>
                </div>
                {r.description && <p className="text-gray-400 text-xs mt-1">{r.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
