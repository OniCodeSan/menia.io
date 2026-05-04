import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Users, GraduationCap, Loader2, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { adminApi } from "@/lib/api";

const TABS = [
  { id: "users", label: "Utenti", icon: Users },
  { id: "access", label: "Accessi", icon: GraduationCap },
];

export default function AdminConsole() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("users");

  useEffect(() => {
    if (!isLoadingAuth && (!user || user.role !== "admin")) navigate("/", { replace: true });
  }, [isLoadingAuth, user, navigate]);

  if (isLoadingAuth || !user) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (user.role !== "admin") return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" /> Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">Gestisci utenti e abilita accessi a corsi/live/abbonamenti.</p>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border/30">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "access" && <AccessTab />}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, handle, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  const filtered = users.filter((u) =>
    !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.full_name?.toLowerCase().includes(q.toLowerCase()) || u.handle?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per email, nome o handle..." className="flex-1" />
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border/30 text-muted-foreground text-xs">
                <th className="py-2">Email</th><th>Nome</th><th>Handle</th><th>Ruolo</th><th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((u) => (
                <tr key={u.id} className="border-b border-border/10">
                  <td className="py-2">{u.email}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.handle || "—"}</td>
                  <td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.role === "admin" ? "bg-destructive/15 text-destructive" :
                      u.role === "creator" ? "bg-primary/15 text-primary" :
                      "bg-secondary/60 text-muted-foreground"
                    }`}>{u.role}</span>
                  </td>
                  <td className="font-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccessTab() {
  const [type, setType] = useState("course"); // course | live | subscription | creator_plan
  const [form, setForm] = useState({ user_id: "", target_id: "", plan_id: "starter", expires_at: "", external_reference: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const grant = async () => {
    setResult(null);
    setSubmitting(true);
    try {
      const body = {
        external_reference: form.external_reference.trim() || undefined,
        source: "external_payment",
      };
      let data;
      if (type === "course") {
        body.user_id = form.user_id.trim();
        body.course_id = form.target_id.trim();
        data = await adminApi.grantCourseAccess(body);
      } else if (type === "live") {
        body.user_id = form.user_id.trim();
        body.live_event_id = form.target_id.trim();
        data = await adminApi.grantLiveAccess(body);
      } else if (type === "subscription") {
        body.user_id = form.user_id.trim();
        body.creator_id = form.target_id.trim();
        if (form.expires_at) body.expires_at = form.expires_at;
        data = await adminApi.grantSubscription(body);
      } else {
        // creator_plan
        body.creator_id = form.user_id.trim();
        body.plan_id = form.plan_id;
        if (form.expires_at) body.expires_at = form.expires_at;
        data = await adminApi.grantCreatorPlan(body);
      }
      setResult({ ok: true, data });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async () => {
    setResult(null);
    setSubmitting(true);
    try {
      const body = {};
      let data;
      if (type === "course") {
        body.user_id = form.user_id.trim();
        body.course_id = form.target_id.trim();
        data = await adminApi.revokeCourseAccess(body);
      } else if (type === "live") {
        body.user_id = form.user_id.trim();
        body.live_event_id = form.target_id.trim();
        data = await adminApi.revokeLiveAccess(body);
      } else if (type === "subscription") {
        body.user_id = form.user_id.trim();
        body.creator_id = form.target_id.trim();
        data = await adminApi.revokeSubscription(body);
      } else {
        body.creator_id = form.user_id.trim();
        data = await adminApi.revokeCreatorPlan(body);
      }
      setResult({ ok: true, data });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const targetLabel = type === "course" ? "Course ID" : type === "live" ? "Live Event ID" : type === "subscription" ? "Creator ID (community)" : null;
  const userLabel = type === "creator_plan" ? "Creator ID" : "User ID (UUID)";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
        <div>
          <Label>Tipo accesso</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {[
              { v: "course", l: "Corso" },
              { v: "live", l: "Live" },
              { v: "subscription", l: "Community" },
              { v: "creator_plan", l: "Piano creator" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  type === opt.v ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground"
                }`}
              >{opt.l}</button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>{userLabel}</Label>
            <Input
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono text-xs"
            />
          </div>
          {targetLabel && (
            <div>
              <Label>{targetLabel}</Label>
              <Input
                value={form.target_id}
                onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                placeholder="UUID"
                className="font-mono text-xs"
              />
            </div>
          )}
          {type === "creator_plan" && (
            <div>
              <Label>Piano</Label>
              <select
                value={form.plan_id}
                onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="free">Base (€4.99)</option>
                <option value="starter">Starter (€19)</option>
                <option value="pro">Grow (€39)</option>
                <option value="elite">Master (contact)</option>
              </select>
            </div>
          )}
        </div>

        {(type === "subscription" || type === "creator_plan") && (
          <div>
            <Label>Scadenza (opzionale, default +30gg)</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>
        )}

        <div>
          <Label>Riferimento pagamento esterno (opzionale)</Label>
          <Input
            value={form.external_reference}
            onChange={(e) => setForm({ ...form, external_reference: e.target.value })}
            placeholder="ID Stripe / Gumroad / nota..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={grant} disabled={submitting || !form.user_id || !form.target_id}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" /> Concedi accesso</>}
          </Button>
          <Button variant="outline" className="text-destructive" onClick={revoke} disabled={submitting || !form.user_id || !form.target_id}>
            <X className="w-4 h-4 mr-1.5" /> Revoca
          </Button>
        </div>

        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.ok ? "bg-chart-3/10 text-chart-3 border border-chart-3/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
            {result.ok ? "OK — accesso aggiornato" : `Errore: ${result.error}`}
            {result.data && <pre className="text-[10px] mt-2 opacity-70 overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>}
          </div>
        )}
      </div>

      <div className="bg-secondary/30 border border-border/30 rounded-2xl p-4 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Flusso pagamento esterno</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Lo studente clicca il link di pagamento sul corso / live / profilo creator</li>
          <li>Paga su Stripe / Gumroad / Lemon Squeezy</li>
          <li>Tu ricevi conferma del pagamento</li>
          <li>Inserisci qui sopra User ID + ID risorsa e clicca <strong>Concedi accesso</strong></li>
        </ol>
      </div>
    </div>
  );
}
