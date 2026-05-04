import { useState } from "react";
import { Lock, Loader2, Check, LogIn } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function Paywall({ courseTitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const goToLogin = () => {
    // Salva la pagina corrente per tornarci dopo il login
    try {
      sessionStorage.setItem("menia:return_to", location.pathname + location.search);
    } catch {}
    navigate("/student-login");
  };

  const startCheckout = async () => {
    if (!user) { goToLogin(); return; }
    setErr(""); setBusy(true);
    try {
      const r = await billingApi.startCheckout();
      if (r.url) window.location.href = r.url;
      else throw new Error("URL checkout non disponibile");
    } catch (e) {
      // Se la session JWT è scaduta lato client, il server risponde 401 — manda al login
      if (e.status === 401) {
        goToLogin();
        return;
      }
      setErr(e.message || "Errore avvio checkout");
      setBusy(false);
    }
  };

  return (
    <section className="my-10">
      <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl p-8 text-center shadow-card">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Sblocca tutti i corsi Menia</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {courseTitle
            ? <>Per accedere a <strong>{courseTitle}</strong> e a tutto il catalogo Menia attiva l'abbonamento.</>
            : <>Attiva l'abbonamento per accedere a tutti i corsi della piattaforma.</>}
        </p>
        <div className="bg-secondary/40 rounded-xl p-5 mb-6">
          <p className="font-heading text-3xl font-bold mb-1">€0,99<span className="text-sm font-normal text-muted-foreground">/mese</span></p>
          <ul className="text-sm space-y-1.5 mt-4 text-left max-w-xs mx-auto">
            <Feature>Accesso a tutti i corsi pubblicati</Feature>
            <Feature>Community e aggiornamenti del formatore</Feature>
            <Feature>Disdici quando vuoi</Feature>
          </ul>
        </div>

        {user ? (
          <Button onClick={startCheckout} disabled={busy} size="lg" className="w-full sm:w-auto">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Attiva abbonamento"}
          </Button>
        ) : (
          <>
            <Button onClick={goToLogin} size="lg" className="w-full sm:w-auto">
              <LogIn className="w-4 h-4 mr-1.5" /> Accedi per abbonarti
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Non hai un account?{" "}
              <a href="/student-login?mode=register" className="text-primary hover:underline font-medium">
                Registrati
              </a>
              {" "}— hai 30 giorni di prova gratuita.
            </p>
          </>
        )}

        {err && <p className="text-xs text-destructive mt-3">{err}</p>}
        <p className="text-[11px] text-muted-foreground mt-4">Pagamento sicuro. Niente impegni a lungo termine.</p>
      </div>
    </section>
  );
}

function Feature({ children }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
