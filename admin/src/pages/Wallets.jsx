import { useState } from "react";
import { api } from "../lib/api";
import { Search, Plus, Minus, Download } from "lucide-react";

export default function Wallets() {
  const [userId, setUserId] = useState("");
  const [wallets, setWallets] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState("user");
  const [adjusting, setAdjusting] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const [w, t] = await Promise.all([
        api.getWallet(userId.trim()),
        api.getTransactions(userId.trim(), { limit: 50 }),
      ]);
      setWallets(w.wallets);
      setTransactions(t.transactions);
    } catch (err) {
      setMsg(err.message);
      setWallets(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const adjust = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    const amount = Number(adjustAmount);
    if (!amount) return;
    if (!adjustReason.trim()) { setMsg("Motivo obbligatorio"); return; }
    if (!confirm(`${amount > 0 ? "Accreditare" : "Rimuovere"} ${Math.abs(amount)} token?`)) return;

    setAdjusting(true);
    setMsg("");
    try {
      const res = await api.adjustWallet(userId.trim(), amount, adjustReason.trim(), adjustType);
      setMsg(`Operazione completata. Nuovo saldo: ${res.newBalance}`);
      setAdjustAmount("");
      setAdjustReason("");
      // Reload
      const [w, t] = await Promise.all([
        api.getWallet(userId.trim()),
        api.getTransactions(userId.trim(), { limit: 50 }),
      ]);
      setWallets(w.wallets);
      setTransactions(t.transactions);
    } catch (err) {
      setMsg(`Errore: ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gestione Wallet</h1>
        <button onClick={() => api.exportCsv("transactions")} className="btn-secondary text-sm flex items-center gap-2">
          <Download size={14} /> Export Transazioni
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="ID utente (UUID)"
            className="input pl-9"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary text-sm">Cerca</button>
      </form>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.startsWith("Errore") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          {msg}
        </div>
      )}

      {wallets && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {wallets.map((w) => (
              <div key={w.id} className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-3 capitalize">{w.wallet_type} Wallet</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-bold">{w.balance}</p><p className="text-xs text-gray-500">Saldo</p></div>
                  <div><p className="text-2xl font-bold text-emerald-400">{w.total_earned}</p><p className="text-xs text-gray-500">Guadagnati</p></div>
                  <div><p className="text-2xl font-bold text-amber-400">{w.total_spent}</p><p className="text-xs text-gray-500">Spesi</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Operazione manuale</h3>
            <form onSubmit={adjust} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Wallet</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} className="input w-auto">
                  <option value="user">User</option>
                  <option value="creator">Creator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Token (negativo per rimuovere)</label>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="input w-32" placeholder="es. 100" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Motivo</label>
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="input" placeholder="Motivo obbligatorio" />
              </div>
              <button type="submit" disabled={adjusting} className="btn-primary text-sm">
                {adjusting ? "..." : "Esegui"}
              </button>
            </form>
          </div>

          <div className="card p-0">
            <h3 className="text-sm font-medium text-gray-400 px-5 pt-5 pb-3">Transazioni recenti</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-gray-500"><th className="px-4 py-2 text-left">Tipo</th><th className="px-4 py-2 text-left">Wallet</th><th className="px-4 py-2 text-right">Importo</th><th className="px-4 py-2 text-left">Descrizione</th><th className="px-4 py-2 text-left">Data</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/30">
                      <td className="px-4 py-2"><span className={`badge ${tx.type === "topup" ? "bg-emerald-500/20 text-emerald-400" : tx.type === "spend" ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/20 text-gray-400"}`}>{tx.type}</span></td>
                      <td className="px-4 py-2 text-gray-400">{tx.wallet_type}</td>
                      <td className={`px-4 py-2 text-right font-mono ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>{tx.amount > 0 ? "+" : ""}{tx.amount}</td>
                      <td className="px-4 py-2 text-gray-400 truncate max-w-[250px]">{tx.description || "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{tx.created_at?.slice(0, 16).replace("T", " ")}</td>
                    </tr>
                  ))}
                  {!transactions.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nessuna transazione</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
