import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, User, Lock, CreditCard, Shield, LogOut, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/lib/auth";

export default function StudentSettings() {
  const { user, isLoadingAuth, refresh, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoadingAuth) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!user) {
    navigate("/student-login", { replace: true });
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Gestisci il tuo account Menia</p>
      </div>

      <ProfileSection user={user} onSaved={refresh} />
      <PasswordSection />

      <div className="bg-card border border-border/30 rounded-2xl divide-y divide-border/30">
        <SettingsLink to="/billing" icon={CreditCard} title="Abbonamento" desc="Stato del piano, rinnovo, annullamento" />
        <SettingsLink to="/privacy-settings" icon={Shield} title="Privacy e dati" desc="Esporta o elimina i tuoi dati (GDPR)" />
      </div>

      <LogoutSection onLogout={async () => { await logout(); navigate("/", { replace: true }); }} />
    </div>
  );
}

function SettingsLink({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}

function ProfileSection({ user, onSaved }) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr(""); setOk(false); setSaving(true);
    try {
      await authService.updateMe({ full_name: fullName.trim() });
      await onSaved?.();
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErr(e.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-sm">Profilo</h2>
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-xs">Nome</Label>
        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Il tuo nome" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Email</Label>
        <Input value={user.email} disabled className="opacity-70" />
        <p className="text-[11px] text-muted-foreground">L'email non è modificabile. Per cambiarla contatta il supporto.</p>
      </div>
      {err && <Alert tone="error" msg={err} />}
      {ok && <Alert tone="success" msg="Profilo aggiornato." />}
      <Button onClick={save} disabled={saving || !fullName.trim() || fullName.trim() === user.full_name}>
        {saving ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </section>
  );
}

function PasswordSection() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr(""); setOk(false);
    if (pw.length < 8) { setErr("La password deve avere almeno 8 caratteri"); return; }
    if (pw !== pw2) { setErr("Le password non coincidono"); return; }
    setSaving(true);
    try {
      await authService.updatePassword(pw);
      setOk(true); setPw(""); setPw2("");
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErr(e.message || "Errore nel cambio password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-sm">Password</h2>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new_pw" className="text-xs">Nuova password</Label>
        <Input id="new_pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Almeno 8 caratteri" autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new_pw2" className="text-xs">Conferma password</Label>
        <Input id="new_pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Ripeti la password" autoComplete="new-password" />
      </div>
      {err && <Alert tone="error" msg={err} />}
      {ok && <Alert tone="success" msg="Password aggiornata." />}
      <Button onClick={save} disabled={saving || !pw || !pw2}>
        {saving ? "Aggiornamento..." : "Aggiorna password"}
      </Button>
    </section>
  );
}

function LogoutSection({ onLogout }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirm) {
    return (
      <div className="text-center pt-4">
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" /> Esci dall'account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-destructive/30 rounded-2xl p-5 space-y-3">
      <p className="text-sm font-semibold">Vuoi davvero uscire?</p>
      <p className="text-xs text-muted-foreground">Dovrai accedere di nuovo per usare i contenuti del tuo abbonamento.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy} className="flex-1">Annulla</Button>
        <Button
          variant="destructive"
          onClick={async () => { setBusy(true); try { await onLogout(); } finally { setBusy(false); } }}
          disabled={busy}
          className="flex-1"
        >
          {busy ? "Disconnessione..." : "Conferma"}
        </Button>
      </div>
    </div>
  );
}

function Alert({ tone, msg }) {
  const cn = tone === "success"
    ? "bg-chart-3/10 border-chart-3/20 text-chart-3"
    : "bg-destructive/10 border-destructive/20 text-destructive";
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cn}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}
