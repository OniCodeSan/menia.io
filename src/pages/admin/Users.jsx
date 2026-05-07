import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    setLoading(true);
    adminApi.listUsers({ limit: 200, ...(role && { role }) })
      .then((r) => setUsers(r.users || []))
      .finally(() => setLoading(false));
  }, [role]);

  const filtered = useMemo(() => users.filter((u) =>
    !q ||
    u.email?.toLowerCase().includes(q.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    u.handle?.toLowerCase().includes(q.toLowerCase())
  ), [users, q]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Utenti</h1>
        <p className="text-sm text-muted-foreground">{users.length} utenti caricati</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per email, nome, handle…" />
        </div>
        <div className="flex gap-1">
          {[
            { v: "", l: "Tutti" },
            { v: "fan", l: "Studenti" },
            { v: "creator", l: "Formatori" },
            { v: "admin", l: "Admin" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setRole(o.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                role === o.v ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
              }`}
            >{o.l}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/20">
                <tr className="text-left">
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3">Handle</th>
                  <th className="py-2 px-3">Ruolo</th>
                  <th className="py-2 px-3">Stato</th>
                  <th className="py-2 px-3">Iscritto</th>
                  <th className="py-2 px-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((u) => (
                  <tr key={u.id} className="border-t border-border/10">
                    <td className="py-2 px-3 truncate max-w-[220px]" title={u.email}>{u.email}</td>
                    <td className="py-2 px-3">{u.full_name || "—"}</td>
                    <td className="py-2 px-3">{u.handle || "—"}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === "admin" ? "bg-destructive/15 text-destructive" :
                        u.role === "creator" ? "bg-primary/15 text-primary" :
                        "bg-secondary/60 text-muted-foreground"
                      }`}>{u.role}</span>
                    </td>
                    <td className="py-2 px-3 text-xs">{u.status || "active"}</td>
                    <td className="py-2 px-3 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : "—"}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
