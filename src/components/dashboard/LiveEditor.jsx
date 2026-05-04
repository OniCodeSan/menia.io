import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { liveEventsApi } from "@/lib/api";

const PRICE_SUGGESTIONS = [0, 9.90, 19.90, 29.90];

export default function LiveEditor({ event, onClose, onSaved }) {
  const isNew = !event.id;
  const [form, setForm] = useState({
    title: event.title || "",
    description: event.description || "",
    scheduled_at: event.scheduled_at ? new Date(event.scheduled_at).toISOString().slice(0, 16) : "",
    duration_minutes: event.duration_minutes || 60,
    price: event.price ?? 0,
    external_payment_link: event.external_payment_link || "",
    is_published: !!event.is_published,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        duration_minutes: Number(form.duration_minutes) || null,
        price: Number(form.price) || 0,
        external_payment_link: form.external_payment_link.trim() || null,
        is_published: form.is_published,
      };
      if (isNew) await liveEventsApi.create(payload);
      else await liveEventsApi.update(event.id, payload);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
        <div className="p-5 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card">
          <h2 className="font-heading font-bold">{isNew ? "Nuova live" : "Modifica live"}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label>Titolo</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es: Workshop SEO avanzato" />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e ora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div>
              <Label>Durata (min)</Label>
              <Input type="number" min={15} max={720} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prezzo (€)</Label>
              <Input type="number" min={0} step={0.1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Suggeriti:</span>
                {PRICE_SUGGESTIONS.map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, price: p })}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground">
                    {p === 0 ? "Gratis" : `€${p}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <div className="bg-secondary/30 rounded-xl p-3 flex items-center justify-between gap-3 w-full">
                <div>
                  <p className="text-sm font-semibold">Pubblicata</p>
                  <p className="text-[10px] text-muted-foreground">Visibile a tutti</p>
                </div>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </div>
          </div>
          {Number(form.price) > 0 && (
            <div>
              <Label>Link pagamento esterno</Label>
              <Input value={form.external_payment_link} onChange={(e) => setForm({ ...form, external_payment_link: e.target.value })} placeholder="https://buy.stripe.com/..." />
            </div>
          )}
          <div className="bg-secondary/40 border border-border/50 rounded-xl p-3">
            <p className="text-xs">
              <strong>Live in chat real-time</strong> — la live si svolge nella chat-room interna di
              Menia. Quando clicchi "Avvia live" dalla dashboard, gli iscritti vedranno la chat
              aprirsi: nessun link esterno, nessun software da installare.
            </p>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
