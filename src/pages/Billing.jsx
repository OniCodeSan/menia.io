import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Loader2, CreditCard, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import useSubscription from "@/hooks/useSubscription";
import { billingApi } from "@/lib/api";

// /billing serves three modes:
//   ?ok=1     → post-Stripe success feedback
//   ?cancel=1 → post-Stripe cancel feedback
//   bare      → subscription management view
export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ok = params.get("ok") === "1";
  const cancel = params.get("cancel") === "1";

  if (ok || cancel) return <PostCheckoutFeedback ok={ok} user={user} navigate={navigate} />;
  return <Manage user={user} navigate={navigate} />;
}

function PostCheckoutFeedback({ ok, user, navigate }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-card">
        {ok ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-chart-3 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Abbonamento attivato</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Grazie! Il pagamento è stato registrato. L'attivazione potrebbe richiedere qualche secondo
              mentre Stripe ci comunica il risultato — ricarica la pagina se non vedi subito i contenuti sbloccati.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/courses")}>Esplora i corsi</Button>
              <Button variant="outline" onClick={() => navigate(user?.role === "creator" ? "/dashboard" : "/student-dashboard")}>
                Vai alla mia area
              </Button>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Pagamento annullato</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Non è stato addebitato nulla. Puoi riprovare quando vuoi — il tuo account è invariato.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/pricing")}>Torna ai piani</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Manage({ user, navigate }) {
  const { sub, isActive, trialDaysLeft, daysToRenewal, loading, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/student-login", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const startCheckout = async () => {
    setBusy(true); setErr("");
    try {
      const r = await billingApi.startCheckout();
      if (r.url) window.location.href = r.url;
    } catch (e) {
      setErr(e.message || "Impossibile avviare il pagamento.");
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true); setErr("");
    try {
      await billingApi.cancel();
      await refresh();
      setConfirmCancel(false);
    } catch (e) {
      setErr(e.message || "Impossibile annullare l'abbonamento.");
    } finally {
      setBusy(false);
    }
  };

  const status = sub?.status;
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const cancelAt = sub?.cancel_at ? new Date(sub.cancel_at) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Abbonamento</h1>
        <p className="text-sm text-muted-foreground">Gestisci il tuo accesso a Menia</p>
      </div>

      {err && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      <div className="bg-card border border-border/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-lg">Menia Studente</h2>
            {!sub || status === "none" || status === "canceled" ? (
              <p className="text-sm text-muted-foreground mt-1">Nessun abbonamento attivo</p>
            ) : status === "trial" ? (
              <p className="text-sm text-primary mt-1">
                Trial gratuito — {trialDaysLeft ?? 0} giorni rimasti
                {trialEnd && <span className="block text-xs text-muted-foreground mt-0.5">Scade il {trialEnd.toLocaleDateString("it-IT")}</span>}
              </p>
            ) : status === "active" ? (
              <>
                <p className="text-sm text-primary mt-1">Abbonamento attivo — €0,99/mese</p>
                {cancelAt ? (
                  <p className="text-xs text-amber-600 mt-1">Annullamento programmato: l'accesso termina il {cancelAt.toLocaleDateString("it-IT")}</p>
                ) : periodEnd && daysToRenewal != null ? (
                  <p className="text-xs text-muted-foreground mt-0.5">Rinnovo automatico tra {daysToRenewal} giorni ({periodEnd.toLocaleDateString("it-IT")})</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Stato: {status}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          {!isActive ? (
            <Button onClick={startCheckout} disabled={busy} className="flex-1">
              <CreditCard className="w-4 h-4 mr-2" />
              {busy ? "Apertura checkout..." : "Attiva l'abbonamento — €0,99/mese"}
            </Button>
          ) : status === "trial" ? (
            <Button onClick={startCheckout} disabled={busy} className="flex-1">
              <CreditCard className="w-4 h-4 mr-2" />
              {busy ? "Apertura..." : "Passa al piano a pagamento"}
            </Button>
          ) : status === "active" && !cancelAt ? (
            !confirmCancel ? (
              <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={busy} className="flex-1 text-muted-foreground">
                Annulla abbonamento
              </Button>
            ) : (
              <div className="flex-1 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={busy} className="flex-1">
                  <X className="w-4 h-4 mr-2" /> Tieni l'abbonamento
                </Button>
                <Button variant="destructive" onClick={doCancel} disabled={busy} className="flex-1">
                  {busy ? "Annullo..." : "Conferma annullamento"}
                </Button>
              </div>
            )
          ) : null}
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl p-6">
        <h3 className="font-heading font-bold text-sm mb-2">Cosa include Menia Studente</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" /> Accesso a tutti i corsi pubblicati</li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" /> Partecipazione a tutte le live</li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" /> Messaggi diretti con i formatori</li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" /> Cancellazione in qualsiasi momento</li>
        </ul>
      </div>

      <div className="text-center">
        <Link to={user?.role === "creator" ? "/dashboard" : "/student-dashboard"} className="text-xs text-muted-foreground hover:text-foreground">
          ← Torna alla mia area
        </Link>
      </div>
    </div>
  );
}
