import { useState } from "react";
import { Loader2, Send, Users, GraduationCap, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";

const TARGETS = [
  { id: "all", label: "Tutti gli utenti", icon: Users, hint: "Studenti + formatori + admin" },
  { id: "fan", label: "Solo studenti", icon: GraduationCap, hint: "role = fan" },
  { id: "creator", label: "Solo formatori", icon: UserCheck, hint: "role = creator" },
  { id: "single", label: "Utente singolo", icon: Send, hint: "Specifica gli ID utente" },
];

export default function AdminMessages() {
  const [target, setTarget] = useState("all");
  const [userIds, setUserIds] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Titolo troppo corto.");
    setErr(null); setResult(null); setBusy(true);
    try {
      const payload = { title: title.trim(), body: body.trim(), type };
      if (target === "single") {
        const ids = userIds.split(/[\s,]+/).filter(Boolean);
        if (ids.length === 0) { setErr("Inserisci almeno un ID utente."); setBusy(false); return; }
        payload.target_user_ids = ids;
      } else {
        payload.target_role = target;
      }
      const r = await adminApi.notifySegment(payload);
      setResult(r);
      setTitle(""); setBody(""); setUserIds("");
    } catch (e) {
      setErr(e?.message || "Errore invio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Messaggi</h1>
        <p className="text-sm text-muted-foreground">Invia notifiche segmentate. Le notifiche compaiono nella campanella utente.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
        <div>
          <Label className="text-xs mb-2 block">Destinatari</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TARGETS.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTarget(id)}
                className={`p-3 border rounded-xl text-left transition-colors ${
                  target === id
                    ? "border-primary bg-primary/10"
                    : "border-border/30 hover:border-border/60"
                }`}
              >
                <Icon className="w-4 h-4 text-primary mb-2" />
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-[11px] text-muted-foreground">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        {target === "single" && (
          <div>
            <Label htmlFor="user-ids" className="text-xs">ID utenti (separati da virgola o spazio)</Label>
            <textarea
              id="user-ids"
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-input border border-border/30 rounded-md text-sm font-mono"
              placeholder="3a8e1234-..., 9b7f5678-..."
            />
          </div>
        )}

        <div>
          <Label htmlFor="title" className="text-xs">Titolo</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </div>

        <div>
          <Label htmlFor="body" className="text-xs">Messaggio (opzionale)</Label>
          <textarea
            id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000}
            className="w-full mt-1 px-3 py-2 bg-input border border-border/30 rounded-md text-sm"
          />
        </div>

        <div>
          <Label htmlFor="type" className="text-xs">Tipo</Label>
          <select
            id="type" value={type} onChange={(e) => setType(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-input border border-border/30 rounded-md text-sm"
          >
            <option value="info">Info</option>
            <option value="announcement">Annuncio</option>
            <option value="alert">Avviso</option>
          </select>
        </div>

        {err && <div className="text-sm text-destructive">{err}</div>}
        {result && (
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            ✓ Inviato a {result.recipients} destinatari ({result.inserted} consegnate)
          </div>
        )}

        <Button type="submit" disabled={busy} className="w-full md:w-auto">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Invia</>}
        </Button>
      </form>
    </div>
  );
}
