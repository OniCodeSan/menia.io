import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Send, Bell, Globe, User } from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [targetId, setTargetId] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications({ limit: 50 });
      setNotifications(res.notifications);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setMsg("");
    try {
      await api.sendNotification({ title, body, type, targetId: isGlobal ? null : targetId, isGlobal });
      setMsg("Notifica inviata");
      setTitle("");
      setBody("");
      setTargetId("");
      load();
    } catch (err) {
      setMsg(`Errore: ${err.message}`);
    } finally {
      setSending(false);
    }
    setTimeout(() => setMsg(""), 3000);
  };

  const TYPE_COLORS = {
    info: "bg-blue-500/20 text-blue-400",
    warning: "bg-yellow-500/20 text-yellow-400",
    promo: "bg-brand/20 text-brand",
    system: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold">Notifiche</h1>

      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Send size={16} /> Invia notifica</h3>

        {msg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.startsWith("Errore") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="rounded" />
              <Globe size={14} /> Globale (tutti gli utenti)
            </label>
          </div>

          {!isGlobal && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID utente destinatario</label>
              <input value={targetId} onChange={(e) => setTargetId(e.target.value)} className="input max-w-md" placeholder="UUID utente" required />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Titolo</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="promo">Promo</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Corpo (opzionale)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="input min-h-[80px]" rows={3} />
          </div>

          <button type="submit" disabled={sending} className="btn-primary text-sm flex items-center gap-2">
            <Send size={14} /> {sending ? "Invio..." : "Invia"}
          </button>
        </form>
      </div>

      <div className="card p-0">
        <h3 className="text-sm font-medium text-gray-400 px-5 pt-5 pb-3">Notifiche inviate ({total})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-gray-500"><th className="px-4 py-2 text-left">Tipo</th><th className="px-4 py-2 text-left">Dest.</th><th className="px-4 py-2 text-left">Titolo</th><th className="px-4 py-2 text-left">Data</th></tr></thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b border-border/30">
                  <td className="px-4 py-2"><span className={`badge ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`}>{n.type}</span></td>
                  <td className="px-4 py-2 text-gray-400">{n.is_global ? <span className="flex items-center gap-1"><Globe size={12} /> Globale</span> : <span className="flex items-center gap-1"><User size={12} /> {n.target_id?.slice(0, 8)}</span>}</td>
                  <td className="px-4 py-2 text-gray-300">{n.title}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{n.created_at?.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
              {!notifications.length && !loading && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nessuna notifica</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
