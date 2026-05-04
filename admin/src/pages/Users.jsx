import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-500/20 text-emerald-400",
  warned: "bg-yellow-500/20 text-yellow-400",
  suspended: "bg-orange-500/20 text-orange-400",
  banned: "bg-red-500/20 text-red-400",
};

const ROLE_COLORS = {
  admin: "bg-brand/20 text-brand",
  creator: "bg-emerald-500/20 text-emerald-400",
  fan: "bg-blue-500/20 text-blue-400",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.status = status;
      const res = await api.getUsers(params);
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, role, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Utenti ({total})</h1>
        <button onClick={() => api.exportCsv("users")} className="btn-secondary text-sm flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nome, email, handle..."
              className="input pl-9 w-64"
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Cerca</button>
        </form>

        <select value={role} onChange={(e) => { setRole(e.target.value); setOffset(0); }} className="input w-auto">
          <option value="">Tutti i ruoli</option>
          <option value="fan">Fan</option>
          <option value="creator">Creator</option>
          <option value="admin">Admin</option>
        </select>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className="input w-auto">
          <option value="">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="warned">Avvertito</option>
          <option value="suspended">Sospeso</option>
          <option value="banned">Bannato</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3">Piano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/users/${u.id}`} className="text-brand hover:underline font-medium">
                    {u.full_name || u.handle || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{u.email || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${ROLE_COLORS[u.role] || "bg-gray-500/20 text-gray-400"}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{u.plan || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[u.status] || STATUS_COLORS.active}`}>{u.status || "active"}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!users.length && !loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nessun utente trovato</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{offset + 1}–{Math.min(offset + limit, total)} di {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn-secondary text-xs px-3 py-1.5">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="btn-secondary text-xs px-3 py-1.5">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
