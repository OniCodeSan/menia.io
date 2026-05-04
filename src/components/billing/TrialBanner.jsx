import { useState } from "react";
import { Sparkles, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/lib/api";
import useSubscription from "@/hooks/useSubscription";
import { useAuth } from "@/lib/AuthContext";

// Banner mostrato a studenti con trial attivo. In normale è informativo;
// negli ultimi 7 giorni cambia colore + copy d'urgenza. Ignorato per
// formatori (hanno il loro flow piani separato) e admin.
const DISMISS_KEY = "menia:trial_banner_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h: ricompare il giorno dopo

export default function TrialBanner() {
  const { user } = useAuth();
  const { trialDaysLeft } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (!at) return false;
      return Date.now() - at < DISMISS_TTL_MS;
    } catch { return false; }
  });

  if (hidden) return null;
  if (!user || user.role !== "fan") return null;
  if (trialDaysLeft == null) return null;

  const urgent = trialDaysLeft <= 7;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setHidden(true);
  };

  const startCheckout = async () => {
    setBusy(true);
    try {
      const r = await billingApi.startCheckout();
      if (r.url) window.location.href = r.url;
    } catch (e) {
      alert(e.message || "Errore avvio checkout");
    } finally {
      setBusy(false);
    }
  };

  const Icon = urgent ? AlertTriangle : Sparkles;
  const tone = urgent
    ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
    : "bg-primary/5 border-primary/20";

  return (
    <div className={`max-w-5xl mx-auto rounded-xl p-3 flex items-center gap-3 my-3 border ${tone}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${urgent ? "text-amber-600" : "text-primary"}`} />
      <div className="flex-1 text-sm">
        {urgent ? (
          <>
            <strong>Il tuo trial scade tra {trialDaysLeft === 1 ? "1 giorno" : `${trialDaysLeft} giorni`}</strong>
            {" — "}attiva l'abbonamento per non perdere l'accesso ai corsi.
          </>
        ) : (
          <>
            <strong>Trial gratuito attivo</strong> — hai {trialDaysLeft} giorni per esplorare il catalogo.
            Attiva ora a €0,99/mese e blocca il prezzo.
          </>
        )}
      </div>
      <Button size="sm" onClick={startCheckout} disabled={busy}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Attiva (€0,99/mese)"}
      </Button>
      <button type="button" onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Chiudi">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
