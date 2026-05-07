import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";

const TYPES = [
  { v: "course", l: "Corso" },
  { v: "live", l: "Live" },
  { v: "subscription", l: "Community" },
  { v: "creator_plan", l: "Piano creator" },
];

export default function AdminAccess() {
  const [type, setType] = useState("course");
  const [form, setForm] = useState({ user_id: "", target_id: "", plan_id: "starter", expires_at: "", external_reference: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const userLabel = type === "creator_plan" ? "Creator ID" : "User ID";
  const targetLabel = type === "course" ? "Course ID" : type === "live" ? "Live Event ID" : type === "subscription" ? "Creator ID (community)" : null;

  async function call(action) {
    setBusy(true); setResult(null);
    try {
      const body = action === "grant"
        ? { source: "external_payment", external_reference: form.external_reference.trim() || undefined }
        : {};
      let data;
      if (type === "course") {
        body.user_id = form.user_id.trim(); body.course_id = form.target_id.trim();
        data = action === "grant" ? await adminApi.grantCourseAccess(body) : await adminApi.revokeCourseAccess(body);
      } else if (type === "live") {
        body.user_id = form.user_id.trim(); body.live_event_id = form.target_id.trim();
        data = action === "grant" ? await adminApi.grantLiveAccess(body) : await adminApi.revokeLiveAccess(body);
      } else if (type === "subscription") {
        body.user_id = form.user_id.trim(); body.creator_id = form.target_id.trim();
        if (form.expires_at && action === "grant") body.expires_at = form.expires_at;
        data = action === "grant" ? await adminApi.grantSubscription(body) : await adminApi.revokeSubscription(body);
      } else {
        body.creator_id = form.user_id.trim();
        if (action === "grant") {
          body.plan_id = form.plan_id;
          if (form.expires_at) body.expires_at = form.expires_at;
        }
        data = action === "grant" ? await adminApi.grantCreatorPlan(body) : await adminApi.revokeCreatorPlan(body);
      }
      setResult({ ok: true, data });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Accessi</h1>
        <p className="text-sm text-muted-foreground">Concedi o revoca accessi a corsi, live, community e piani creator.</p>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
        <div>
          <Label>Tipo</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {TYPES.map((o) => (
              <button
                key={o.v} onClick={() => setType(o.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  type === o.v ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
                }`}
              >{o.l}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>{userLabel}</Label>
            <Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="font-mono text-xs" placeholder="UUID" />
          </div>
          {targetLabel && (
            <div>
              <Label>{targetLabel}</Label>
              <Input value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })} className="font-mono text-xs" placeholder="UUID" />
            </div>
          )}
          {type === "creator_plan" && (
            <div>
              <Label>Piano</Label>
              <select
                value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="free">Base</option>
                <option value="starter">Starter</option>
                <option value="pro">Grow</option>
                <option value="elite">Master</option>
              </select>
            </div>
          )}
          {(type === "subscription" || type === "creator_plan") && (
            <div>
              <Label>Scadenza (opzionale)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          )}
        </div>

        <div>
          <Label>Riferimento esterno (opzionale)</Label>
          <Input value={form.external_reference} onChange={(e) => setForm({ ...form, external_reference: e.target.value })} placeholder="Stripe / Gumroad / nota" />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => call("grant")} disabled={busy || !form.user_id || (targetLabel && !form.target_id)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" /> Concedi</>}
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => call("revoke")} disabled={busy || !form.user_id || (targetLabel && !form.target_id)}>
            <X className="w-4 h-4 mr-1.5" /> Revoca
          </Button>
        </div>

        {result && (
          <div className={`text-sm rounded-lg p-3 ${result.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            {result.ok ? "✓ Operazione completata" : `✗ ${result.error}`}
          </div>
        )}
      </div>
    </div>
  );
}
