import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { uploadApi } from "@/lib/api";

export default function ProfileEditor({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    channel_name: "",
    bio: "",
    profile_image_url: "",
    cover_image_url: "",
    external_payment_link: "",
    monthly_subscription_price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(null); // 'avatar' | 'cover' | null

  // Load existing profile
  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("creator_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, handle").eq("id", user.id).maybeSingle(),
    ]).then(([cp, p]) => {
      const cpd = cp.data || {};
      setForm({
        channel_name: cpd.channel_name || p.data?.full_name || "",
        bio: cpd.bio || "",
        profile_image_url: cpd.profile_image_url || "",
        cover_image_url: cpd.cover_image_url || "",
        external_payment_link: cpd.external_payment_link || "",
        monthly_subscription_price: cpd.monthly_subscription_price ?? 0,
      });
      setLoading(false);
    });
  }, [user?.id]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      // Upsert creator_profiles
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .upsert({
          user_id: user.id,
          channel_name: form.channel_name.trim() || null,
          bio: form.bio.trim() || null,
          profile_image_url: form.profile_image_url || null,
          cover_image_url: form.cover_image_url || null,
          external_payment_link: form.external_payment_link.trim() || null,
          monthly_subscription_price: Number(form.monthly_subscription_price) || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (cpErr) throw new Error(cpErr.message);

      // Sync profiles.full_name and avatar_url for legacy uses (Navbar, etc.)
      if (form.channel_name?.trim() || form.profile_image_url) {
        await supabase
          .from("profiles")
          .update({
            full_name: form.channel_name.trim() || null,
            avatar_url: form.profile_image_url || null,
            cover_url: form.cover_image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      onSaved?.(form);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImg = async (file, kind) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("Immagine troppo grande (max 5MB)");
      return;
    }
    setUploading(kind);
    setErr("");
    try {
      const r = await uploadApi.image(file);
      if (kind === "avatar") update({ profile_image_url: r.url });
      else update({ cover_image_url: r.url });
    } catch (e) {
      setErr(e.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <Modal onClose={onClose}>
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Modifica profilo creator">
      <div className="space-y-5">
        {/* Cover — collassa a 80px se non impostata, espande a 5/2 quando c'è immagine */}
        <ImageField
          label="Cover (banner)"
          value={form.cover_image_url}
          onChange={(url) => update({ cover_image_url: url })}
          onUpload={(f) => uploadImg(f, "cover")}
          uploading={uploading === "cover"}
          aspect={form.cover_image_url ? "aspect-[5/2]" : "h-20"}
          placeholder="Carica un banner orizzontale"
        />

        {/* Avatar */}
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0">
            <ImageField
              label="Foto profilo"
              value={form.profile_image_url}
              onChange={(url) => update({ profile_image_url: url })}
              onUpload={(f) => uploadImg(f, "avatar")}
              uploading={uploading === "avatar"}
              aspect="aspect-square"
              size="w-24"
              round
              placeholder="Foto"
            />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <Label>Nome canale</Label>
              <Input
                value={form.channel_name}
                onChange={(e) => update({ channel_name: e.target.value })}
                placeholder="Il nome che vedono gli studenti"
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                rows={3}
                value={form.bio}
                onChange={(e) => update({ bio: e.target.value })}
                placeholder="Racconta in 2-3 righe cosa insegni e a chi serve"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{form.bio.length}/500</p>
            </div>
          </div>
        </div>

        {/* Monetization */}
        <div className="border-t border-border/30 pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abbonamento community (opzionale)</p>
          <div className="grid sm:grid-cols-[120px_1fr] gap-3">
            <div>
              <Label>Prezzo €/mese</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.monthly_subscription_price}
                onChange={(e) => update({ monthly_subscription_price: e.target.value })}
              />
            </div>
            <div>
              <Label>Link pagamento esterno</Label>
              <Input
                value={form.external_payment_link}
                onChange={(e) => update({ external_payment_link: e.target.value })}
                placeholder="https://buy.stripe.com/... (Stripe / Gumroad / Lemon Squeezy)"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Funzione in arrivo: l'abbonamento community è in fase di rollout. Salva pure questi dati ora — ti contatteremo quando sarà attivabile sul tuo profilo.
          </p>
        </div>

        {err && (
          <p className="text-sm text-destructive inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {err}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={save} disabled={saving || !form.channel_name?.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------
function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
        {title && (
          <div className="p-5 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card rounded-t-2xl">
            <h2 className="font-heading font-bold">{title}</h2>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange, onUpload, uploading, aspect = "aspect-video", size, round, placeholder }) {
  const inputRef = useRef(null);
  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };
  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div>
      <Label className="block mb-1">{label}</Label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative ${aspect} ${size || "w-full"} ${round ? "rounded-full" : "rounded-xl"} border-2 border-dashed border-border/40 bg-secondary/20 hover:border-primary/40 cursor-pointer overflow-hidden flex items-center justify-center group`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            {!uploading && (
              <button
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                type="button"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Rimuovi"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs font-semibold inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Cambia
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{placeholder}</span>
              </>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handlePick}
          disabled={uploading}
        />
      </div>
      {uploading && <p className="text-[10px] text-muted-foreground mt-1">Upload in corso...</p>}
    </div>
  );
}
