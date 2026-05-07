import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { setLoading(false); return; }
      const r = await fetch("/api/admin/audit-log?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await r.json().catch(() => ({}));
      setRows(json.entries || json.audit_log || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Ultime 200 azioni admin</p>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nessuna entry.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/20">
                <tr className="text-left">
                  <th className="py-2 px-3">Quando</th>
                  <th className="py-2 px-3">Admin</th>
                  <th className="py-2 px-3">Azione</th>
                  <th className="py-2 px-3">Target</th>
                  <th className="py-2 px-3">IP</th>
                  <th className="py-2 px-3">Dettagli</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/10">
                    <td className="py-2 px-3 text-xs whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString("it-IT") : "—"}</td>
                    <td className="py-2 px-3 font-mono text-[10px]">{r.admin_id?.slice(0, 8)}…</td>
                    <td className="py-2 px-3 font-medium">{r.action}</td>
                    <td className="py-2 px-3 text-xs">{r.target_type}{r.target_id ? ` / ${r.target_id.slice(0, 8)}…` : ""}</td>
                    <td className="py-2 px-3 text-xs font-mono">{r.ip_address || "—"}</td>
                    <td className="py-2 px-3 text-[11px] font-mono truncate max-w-[280px]" title={JSON.stringify(r.metadata)}>{JSON.stringify(r.metadata || {}).slice(0, 60)}</td>
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
