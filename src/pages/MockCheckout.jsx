import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

// MockCheckout — pagina che simula un PSP. Mostra esplicitamente "MODALITÀ TEST"
// così non confonde l'utente reale. Cliccando "Conferma pagamento" chiama il
// webhook fake che attiva la subscription. Quando integri Stripe questa pagina
// scompare (Stripe Checkout fa redirect su URL Stripe vero).
export default function MockCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const successUrl = params.get("success") || "/billing?ok=1";
  const cancelUrl = params.get("cancel") || "/billing?cancel=1";

  // Quando Stripe è attivo (modalità produzione) la mock-checkout non deve
  // essere raggiungibile: il backend redireziona già su Stripe Checkout vero,
  // ma se qualcuno digita l'URL a mano la pagina si traveste da 404 e
  // riporta su /billing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me/subscription", { headers: { "Content-Type": "application/json" } });
        if (cancelled) return;
        // Probe: tenta un checkout fittizio per leggere il mode senza side-effect.
        // billingApi.getMine non espone il mode; usiamo l'header del prossimo
        // checkout call. Più semplice: se l'utente NON è loggato, manda al login;
        // se Stripe è enabled NON mostra la mock UI e redirige.
      } catch {}
    })();
    if (!user) { navigate("/student-login"); return; }
    // Se in produzione Stripe è attivo, non si è qui per caso → cancel-redirect.
    // Heuristica: se l'env espone meta su window (settabile in futuro), oppure
    // controlla un flag dell'API. Per ora redirige sempre se l'utente non
    // è arrivato qui da un mock checkout creato dal backend (param `token`).
    const token = params.get("token");
    if (!token) {
      navigate("/billing?cancel=1", { replace: true });
    }
    return () => { cancelled = true; };
  }, [user, navigate, params]);

  const confirm = async () => {
    if (!user) return;
    setBusy(true);
    setErr("");
    try {
      // Simula un evento PSP "invoice.paid" → attiva subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 86400000);
      const res = await fetch("/api/billing/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `evt_mock_${Date.now()}`,
          type: "invoice.paid",
          data: {
            userId: user.id,
            periodStart: now.toISOString(),
            periodEnd: periodEnd.toISOString(),
            provider: "mock",
            customerId: `cus_mock_${user.id.slice(0, 8)}`,
            subscriptionId: `sub_mock_${user.id.slice(0, 8)}`,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setDone(true);
      setTimeout(() => { window.location.href = successUrl; }, 1500);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-7">
        {/* Banner test mode */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-5 inline-flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-amber-700 dark:text-amber-500">Modalità TEST — nessun pagamento reale</span>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-chart-3 mx-auto mb-3" />
            <h1 className="font-heading text-xl font-bold mb-1">Abbonamento attivato</h1>
            <p className="text-sm text-muted-foreground">Reindirizzamento in corso...</p>
          </div>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold mb-2">Conferma abbonamento</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Stai per attivare l'abbonamento Menia in modalità simulata. In produzione questa
              pagina sarà sostituita da Stripe Checkout.
            </p>

            <div className="bg-secondary/40 rounded-xl p-4 mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm">Menia Premium</span>
                <span className="font-heading text-lg font-bold">€0,99/mese</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Accesso a tutti i corsi pubblicati. Disdici quando vuoi.
              </p>
            </div>

            <Button onClick={confirm} disabled={busy} size="lg" className="w-full mb-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conferma pagamento (test)"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => { window.location.href = cancelUrl; }}
              disabled={busy}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Annulla
            </Button>

            {err && <p className="text-xs text-destructive mt-3 text-center">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}
