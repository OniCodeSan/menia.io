import { useEffect, useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { coursesApi, lessonsApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const PRICE_SUGGESTIONS = [9.90, 19.90, 29.90, 49.90];

export default function CourseEditor({ course, onClose, onSaved }) {
  const isNew = !course.id;
  const [form, setForm] = useState({
    title: course.title || "",
    description: course.description || "",
    price: course.price ?? 19.90,
    external_payment_link: course.external_payment_link || "",
    is_published: !!course.is_published,
    cover_url: course.cover_url || "",
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
        price: Number(form.price) || 0,
        external_payment_link: form.external_payment_link.trim() || null,
        is_published: form.is_published,
        cover_url: form.cover_url.trim() || null,
      };
      if (isNew) await coursesApi.create(payload);
      else await coursesApi.update(course.id, payload);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
        <div className="p-5 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card">
          <h2 className="font-heading font-bold">{isNew ? "Nuovo corso" : "Modifica corso"}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label>Titolo</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es: Introduzione al copywriting" />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Cosa imparerà lo studente..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prezzo (€)</Label>
              <Input type="number" min={0} step={0.1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Suggeriti:</span>
                {PRICE_SUGGESTIONS.map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, price: p })}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground">€{p}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Cover URL</Label>
              <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div>
            <Label>Link pagamento esterno</Label>
            <Input value={form.external_payment_link} onChange={(e) => setForm({ ...form, external_payment_link: e.target.value })} placeholder="https://buy.stripe.com/... o Gumroad/Lemon Squeezy" />
            <p className="text-[11px] text-muted-foreground mt-1">Pagamenti gestiti fuori piattaforma. Dopo il pagamento, l'admin abilita l'accesso.</p>
          </div>
          <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
            <div>
              <p className="text-sm font-semibold">Pubblicato</p>
              <p className="text-xs text-muted-foreground">Quando attivo, il corso è visibile a tutti</p>
            </div>
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </div>
          {!isNew && <LessonsManager courseId={course.id} />}
        </div>
      </div>
    </div>
  );
}

function LessonsManager({ courseId }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", media_url: "", is_preview: false });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("course_lessons").select("*").eq("course_id", courseId).order("position", { ascending: true });
    setLessons(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [courseId]);

  const add = async () => {
    if (!form.title.trim()) return;
    try {
      await lessonsApi.create({
        course_id: courseId,
        title: form.title.trim(),
        body: form.body.trim() || null,
        media_url: form.media_url.trim() || null,
        is_preview: form.is_preview,
        position: lessons.length,
      });
      setForm({ title: "", body: "", media_url: "", is_preview: false });
      setAdding(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (l) => {
    if (!confirm(`Eliminare "${l.title}"?`)) return;
    try { await lessonsApi.remove(l.id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="border-t border-border/30 pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold">Lezioni</h3>
        {!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi</Button>}
      </div>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : lessons.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">Nessuna lezione. Suggerimento: la prima lezione dovrebbe essere un'<strong>anteprima gratuita</strong>.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{l.title}</p>
                {l.is_preview && <span className="text-[9px] font-bold uppercase text-chart-3">Anteprima</span>}
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
      {adding && (
        <div className="border border-border/30 rounded-lg p-3 mt-3 space-y-2 bg-secondary/20">
          <Input placeholder="Titolo lezione" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea rows={3} placeholder="Contenuto della lezione" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Input placeholder="Media URL (opzionale)" value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} />
            Lezione in anteprima (gratuita, attira studenti)
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Annulla</Button>
            <Button size="sm" onClick={add} disabled={!form.title.trim()}>Aggiungi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
