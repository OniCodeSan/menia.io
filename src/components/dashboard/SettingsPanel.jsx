import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Lock, Save, Banknote, Check, Loader2, Camera, CheckCircle2, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { supabase, hasSupabase } from "@/lib/supabase";
import { PLAN_FEATURES } from "@/lib/plans";
import { createPlanPurchaseIntent, listUserOrders, startCheckout, getOrderById } from "@/lib/paymentOrders";

const SECTIONS = [
  { id: "profile", label: "Profilo", icon: User },
  { id: "payout", label: "Payout", icon: Banknote },
  { id: "notifications", label: "Notifiche", icon: Bell },
  { id: "billing", label: "Pagamenti", icon: CreditCard },
  { id: "security", label: "Sicurezza", icon: Lock },
];

function ProfileSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: "", handle: "", bio: "", category: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            full_name: data.full_name || "",
            handle: data.handle || "",
            bio: data.bio || "",
            category: data.category || "",
          });
        }
      });
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !hasSupabase) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url;
      if (avatarFile) {
        const { storageService } = await import("@/lib/storage");
        const uploaded = await storageService.upload(avatarFile, "avatars");
        if (uploaded?.url) avatar_url = uploaded.url;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          handle: form.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
          bio: form.bio.trim(),
          category: form.category.trim(),
          avatar_url,
        })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((prev) => ({ ...prev, full_name: form.full_name, handle: form.handle, bio: form.bio, avatar_url }));
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Errore: " + (err.message || "riprova"));
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.full_name || "C")}&background=7c3aed&color=fff&size=120`;

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Profilo Creator</h3>
      <div className="flex items-center gap-4">
        <div className="relative group">
          <img
            src={currentAvatar}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <button
            onClick={() => avatarRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <Button variant="outline" size="sm" className="border-border/50" onClick={() => avatarRef.current?.click()}>Cambia foto</Button>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} className="bg-secondary/30 border-border/30 h-10 pl-8" maxLength={30} />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="w-full h-20 bg-secondary/30 border border-border/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={user?.email || ""} disabled className="bg-secondary/20 border-border/20 h-10 text-muted-foreground cursor-not-allowed" />
          <p className="text-[11px] text-muted-foreground">L'email non può essere modificata da qui</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="es. Fitness, Musica, Arte..." className="bg-secondary/30 border-border/30 h-10" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva profilo"}
      </Button>
    </div>
  );
}

const NOTIF_KEYS = ["new_subscriber", "new_donation", "comments", "messages", "weekly_report", "platform_updates"];
const NOTIF_ITEMS = [
  { key: "new_subscriber", label: "Nuovo abbonato", desc: "Ricevi una notifica quando qualcuno si abbona" },
  { key: "new_donation", label: "Nuova donazione", desc: "Ricevi una notifica per ogni donazione ricevuta" },
  { key: "comments", label: "Commenti ai post", desc: "Avvisi per nuovi commenti sui tuoi contenuti" },
  { key: "messages", label: "Messaggi privati", desc: "Notifica per ogni nuovo messaggio ricevuto" },
  { key: "weekly_report", label: "Report settimanale", desc: "Riepilogo performance via email ogni lunedì" },
  { key: "platform_updates", label: "Aggiornamenti piattaforma", desc: "Novità e annunci da Tokaro.fans" },
];
const NOTIF_DEFAULTS = { new_subscriber: true, new_donation: true, comments: false, messages: true, weekly_report: true, platform_updates: false };

function NotificationsSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(NOTIF_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase.from("profiles").select("notification_prefs").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.notification_prefs) setPrefs((prev) => ({ ...prev, ...data.notification_prefs }));
    });
  }, [user]);

  const toggle = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    if (!user || !hasSupabase) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ notification_prefs: next }).eq("id", user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base">Notifiche</h3>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        {saved && !saving && <span className="text-xs text-chart-3 font-medium">Salvato</span>}
      </div>
      <div className="space-y-3">
        {NOTIF_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={!!prefs[item.key]} onCheckedChange={(v) => toggle(item.key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection({ returnOrderId }) {
  const { user, refresh: refreshAuth } = useAuth();
  const currentPlan = user?.plan || "free";
  const currentInfo = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;
  const [buying, setBuying] = useState(null);
  const [result, setResult] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [returnOrder, setReturnOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    listUserOrders(user.id)
      .then((ords) => setPendingOrders(ords.filter((o) => o.order_type === "creator_plan" && o.status === "pending")))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  useEffect(() => {
    if (!returnOrderId || !user) return;
    let cancelled = false;
    let iv = null;
    const poll = async () => {
      const o = await getOrderById(returnOrderId).catch(() => null);
      if (!cancelled && o) {
        setReturnOrder(o);
        if (o.status === "succeeded" || o.status === "failed") {
          if (iv) clearInterval(iv);
          if (o.status === "succeeded") refreshAuth();
        }
      }
    };
    poll();
    iv = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [returnOrderId, user]);

  const handleUpgrade = async (planCode) => {
    if (!user) return;
    setBuying(planCode);
    setResult(null);
    try {
      const order = await createPlanPurchaseIntent(user.id, planCode);
      try {
        const { checkoutUrl } = await startCheckout(order.id);
        window.location.href = checkoutUrl;
        return;
      } catch (gwErr) {
        console.warn("[billing] gateway not available, order stays pending:", gwErr.message);
        setResult({ ok: true, plan: planCode });
        const ords = await listUserOrders(user.id);
        setPendingOrders(ords.filter((o) => o.order_type === "creator_plan" && o.status === "pending"));
      }
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBuying(null);
    }
  };

  const upgradePlans = Object.entries(PLAN_FEATURES).filter(([k, v]) => v.price_eur > 0);

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Piano Creator</h3>

      {returnOrder && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          returnOrder.status === "succeeded" ? "bg-chart-3/10 border-chart-3/30" :
          returnOrder.status === "failed" ? "bg-destructive/10 border-destructive/30" :
          "bg-chart-4/10 border-chart-4/30"
        }`}>
          {returnOrder.status === "succeeded" ? <CheckCircle2 className="w-5 h-5 text-chart-3 shrink-0" /> :
           returnOrder.status === "failed" ? <Clock className="w-5 h-5 text-destructive shrink-0" /> :
           <Clock className="w-5 h-5 text-chart-4 shrink-0" />}
          <div>
            <p className="text-sm font-semibold">
              {returnOrder.status === "succeeded" ? "Piano attivato!" :
               returnOrder.status === "failed" ? "Pagamento non riuscito" :
               "Verifica del pagamento in corso..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {returnOrder.status === "succeeded"
                ? `Il piano ${returnOrder.target_code} è ora attivo.`
                : returnOrder.status === "pending"
                ? "Il pagamento è in attesa di conferma. Il piano verrà attivato a breve."
                : ""}
            </p>
          </div>
        </div>
      )}

      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">Piano attuale: {currentInfo.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentPlan === "free" ? "Nessuna monetizzazione attiva" :
               `€${currentInfo.price_eur}/mese`}
            </p>
          </div>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="bg-chart-4/5 border border-chart-4/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5 text-chart-4">
            <Clock className="w-3.5 h-3.5" />
            Upgrade in attesa di conferma
          </p>
          {pendingOrders.map((o) => (
            <div key={o.id} className="text-xs text-muted-foreground">
              Piano {o.target_code} — €{Number(o.amount_eur).toFixed(2)} — {new Date(o.created_at).toLocaleDateString("it-IT")}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {upgradePlans.map(([code, plan]) => {
          const isCurrent = code === currentPlan;
          const isBuying = buying === code;
          return (
            <div key={code} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isCurrent ? "border-primary/40 bg-primary/5" : "border-border/30 bg-secondary/20"
            }`}>
              <div>
                <p className="text-sm font-semibold">{plan.label}</p>
                <p className="text-xs text-muted-foreground">€{plan.price_eur}/mese</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  {plan.publish_premium_content && <span className="text-[10px] text-muted-foreground">Contenuti premium</span>}
                  {plan.paid_dm && <span className="text-[10px] text-muted-foreground">DM a pagamento</span>}
                  {plan.go_live && <span className="text-[10px] text-muted-foreground">Live streaming{plan.monthly_live_limit != null ? ` (${plan.monthly_live_limit}/mese)` : ""}</span>}
                </div>
              </div>
              {isCurrent ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Attivo
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleUpgrade(code)}
                  disabled={!!buying}
                  className="bg-primary hover:bg-primary/90 text-xs h-8"
                >
                  {isBuying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {isBuying ? "..." : `Attiva €${plan.price_eur}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {result?.ok && (
        <p className="text-xs text-chart-3 text-center font-medium">
          Richiesta di upgrade inviata! Il piano verrà attivato dopo la conferma del pagamento.
        </p>
      )}
      {result && !result.ok && (
        <p className="text-xs text-destructive text-center">{result.error}</p>
      )}
    </div>
  );
}

function SecuritySection() {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    setError("");
    if (!newPw || newPw.length < 6) { setError("La password deve avere almeno 6 caratteri"); return; }
    if (newPw !== confirmPw) { setError("Le password non coincidono"); return; }
    if (!hasSupabase) { setError("Funzionalità non disponibile"); return; }
    setSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPw });
      if (err) throw err;
      setNewPw("");
      setConfirmPw("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Errore nel cambio password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Sicurezza</h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nuova password</Label>
          <Input type="password" placeholder="Minimo 6 caratteri" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Conferma nuova password</Label>
          <Input type="password" placeholder="Ripeti la password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="bg-secondary/30 border-border/30 h-10" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button onClick={handleChangePassword} disabled={saving || !newPw} className="bg-primary hover:bg-primary/90 font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? "Salvataggio..." : saved ? "Password aggiornata!" : "Cambia password"}
      </Button>
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
        <div>
          <p className="text-sm font-medium">Autenticazione a due fattori</p>
          <p className="text-xs text-muted-foreground mt-0.5">Disponibile a breve</p>
        </div>
        <Switch checked={false} disabled />
      </div>
    </div>
  );
}


function PayoutSection() {
  const { user } = useAuth();
  const [form, setForm] = useState({ holder: "", iban: "", bic: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase
      .from("profiles")
      .select("payout_method")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payout_method) {
          setForm({
            holder: data.payout_method.holder || "",
            iban: data.payout_method.iban || "",
            bic: data.payout_method.bic || "",
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !hasSupabase) return;
    setSaving(true);
    try {
      const cleanIban = form.iban.replace(/\s/g, "").toUpperCase();
      const { error } = await supabase
        .from("profiles")
        .update({ payout_method: { holder: form.holder.trim(), iban: cleanIban, bic: form.bic.trim().toUpperCase() } })
        .eq("id", user.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Errore: " + (err.message || "riprova"));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Metodo di Payout</h3>
      <p className="text-xs text-muted-foreground">Inserisci i dati bancari per ricevere i pagamenti. I payout vengono elaborati manualmente entro 5 giorni lavorativi dall'approvazione.</p>

      <div className="bg-chart-4/5 border border-chart-4/20 rounded-xl p-4">
        <p className="text-xs text-chart-4 font-medium">I tuoi dati bancari sono visibili solo a te e al team amministrativo per l'elaborazione dei payout. Non vengono condivisi con terze parti.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Intestatario conto</Label>
          <Input
            value={form.holder}
            onChange={e => setForm(f => ({ ...f, holder: e.target.value }))}
            placeholder="Nome e Cognome / Ragione sociale"
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">IBAN</Label>
          <Input
            value={form.iban}
            onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
            placeholder="IT60X0542811101000000123456"
            className="bg-secondary/30 border-border/30 h-10 font-mono text-sm tracking-wider"
            maxLength={34}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">BIC/SWIFT (opzionale)</Label>
          <Input
            value={form.bic}
            onChange={e => setForm(f => ({ ...f, bic: e.target.value }))}
            placeholder="BPPIITRRXXX"
            className="bg-secondary/30 border-border/30 h-10 font-mono text-sm"
            maxLength={11}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || !form.holder.trim() || !form.iban.trim()} className="bg-primary hover:bg-primary/90 font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva dati bancari"}
      </Button>

      <div className="pt-4 border-t border-border/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Come funzionano i payout</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>1. Dalla sezione Wallet, richiedi un payout indicando quanti token vuoi convertire.</p>
          <p>2. Il team verifica la richiesta e la approva entro 2-3 giorni lavorativi.</p>
          <p>3. Il bonifico viene inviato all'IBAN indicato sopra (2-5 giorni).</p>
          <p>4. Ricevi una email di conferma quando il pagamento è completato.</p>
        </div>
      </div>
    </div>
  );
}

const SECTION_CONTENT = {
  profile: ProfileSection,
  payout: PayoutSection,
  notifications: NotificationsSection,
  billing: BillingSection,
  security: SecuritySection,
};

export default function SettingsPanel({ returnOrderId }) {
  const [activeSection, setActiveSection] = useState(returnOrderId ? "billing" : "profile");
  const ActiveComponent = SECTION_CONTENT[activeSection];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Impostazioni</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gestisci il tuo profilo e le preferenze</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar */}
        <div className="sm:w-48 shrink-0">
          <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible scrollbar-none">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeSection === s.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card/50 border border-border/30 rounded-2xl p-6">
          <ActiveComponent {...(activeSection === "billing" ? { returnOrderId } : {})} />
        </div>
      </div>
    </motion.div>
  );
}