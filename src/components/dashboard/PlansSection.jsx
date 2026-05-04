import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Zap, Check, Mail, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { plansApi, kpiApi } from "@/lib/api";

const CONTACT_EMAIL = "support@menia.io";

const ANALYTICS_TOOLTIP = {
  none:     "Nessuna analytics: solo il KPI base (corsi pubblicati, live).",
  basic:    "Analytics base: visualizzazioni, completamenti, ricavi mensili.",
  advanced: "Analytics avanzate: cohort retention, conversion funnel, breakdown per corso.",
};
const BOOST_TOOLTIP =
  "Boost visibilità: +N punti nel ranking pubblico dei corsi e dei formatori (favorisce la scoperta organica).";

export default function PlansSection() {
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [activePlanMeta, setActivePlanMeta] = useState(null);

  const refresh = () =>
    Promise.all([plansApi.list(), kpiApi.get().catch(() => null)])
      .then(([p, k]) => {
        setPlans(p.plans || []);
        setTestMode(!!p.test_mode_active);
        setActive(k?.plan?.id || null);
        setActivePlanMeta(k?.plan || null);
      });

  useEffect(() => { refresh(); }, []);

  const subscribe = async (plan_id) => {
    setBusy(plan_id);
    setFeedback(null);
    try {
      const r = await kpiApi.subscribePlan(plan_id);
      if (r.payment_link) window.open(r.payment_link, "_blank", "noopener");
    } catch (e) {
      setFeedback({ ok: false, msg: e.message });
    } finally { setBusy(null); }
  };

  const activateTest = async (plan_id) => {
    setBusy(plan_id);
    setFeedback(null);
    try {
      const r = await kpiApi.activatePlanTest(plan_id);
      setActive(r.plan?.id || plan_id);
      setFeedback({ ok: true, msg: `Piano "${r.plan?.name || plan_id}" attivato in modalità test.` });
      setTimeout(refresh, 200);
    } catch (e) {
      setFeedback({ ok: false, msg: e.message });
    } finally { setBusy(null); }
  };

  if (!plans.length) return null;

  const standardPlans = plans.filter((p) => !p.contact_only);
  const masterPlan = plans.find((p) => p.contact_only);
  const isWelcomePlan = activePlanMeta?.external_reference?.startsWith("welcome_gift");
  const welcomeDaysLeft = activePlanMeta?.expires_at
    ? Math.max(0, Math.ceil((new Date(activePlanMeta.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const activePlanInfo = activePlanMeta && plans.find((p) => p.id === activePlanMeta.id);
  const activePriceN = activePlanInfo ? Number(activePlanInfo.price_monthly) : null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">Il tuo piano</h2>
        {testMode && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Zap className="w-3 h-3" /> Test mode
          </span>
        )}
      </div>

      {feedback && (
        <div className={`mb-3 p-2.5 rounded-lg text-xs ${feedback.ok ? "bg-chart-3/10 text-chart-3 border border-chart-3/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
          {feedback.ok && <Check className="w-3 h-3 inline mr-1" />}
          {feedback.msg}
        </div>
      )}

      {activePlanInfo && (
        <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-sm">
          <Crown className="w-4 h-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <strong>Piano attivo: {activePlanInfo.name}</strong>
            {activePriceN > 0 && <span className="text-muted-foreground"> — €{activePriceN.toFixed(2).replace(/\.00$/, "")}/mese</span>}
            {activePlanInfo.contact_only && <span className="text-muted-foreground"> — pacchetto custom</span>}
          </span>
        </div>
      )}

      {isWelcomePlan && welcomeDaysLeft !== null && (
        <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs">
          <span className="text-base">🎁</span>
          <span>
            <strong className="text-primary">Welcome plan attivo</strong> — Starter gratis per altri{" "}
            <strong>{welcomeDaysLeft} giorn{welcomeDaysLeft === 1 ? "o" : "i"}</strong>.
            Allo scadere passerai a Base €4,99/mese, salvo upgrade.
          </span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {standardPlans.map((p, idx) => {
          const isActive = active === p.id;
          const priceN = Number(p.price_monthly);
          // Tier intermedio = "Consigliato": 3 piani standard → indice 1, oppure
          // primo non-active. Aggiunge bordo accent + badge per orientare nuovi creator.
          const isRecommended = !isActive && (
            standardPlans.length === 3 ? idx === 1 :
            idx === Math.floor(standardPlans.length / 2)
          );
          const cardCls = isActive
            ? "border-primary/50 ring-1 ring-primary/30"
            : isRecommended
              ? "border-accent/40 ring-1 ring-accent/20"
              : "border-border/30";
          return (
            <div key={p.id} className={`bg-card border rounded-2xl p-4 flex flex-col relative ${cardCls}`}>
              {isRecommended && (
                <span className="absolute -top-2 left-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                  Consigliato
                </span>
              )}
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-heading font-bold">{p.name}</h3>
                {isActive && <span className="text-[10px] font-bold uppercase text-primary">Attivo</span>}
              </div>
              <p className="font-heading text-2xl font-bold mb-3">
                €{priceN.toFixed(2).replace(/\.00$/, "")}
                <span className="text-xs text-muted-foreground font-normal">/mese</span>
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground flex-1 mb-3">
                <li>{p.max_courses == null ? "Corsi illimitati" : `${p.max_courses} corso/i`}</li>
                <li className="inline-flex items-center gap-1">
                  Analytics: {p.analytics_level}
                  <InfoTooltip text={ANALYTICS_TOOLTIP[p.analytics_level] || ""} />
                </li>
                {p.priority_visibility > 0 && (
                  <li className="inline-flex items-center gap-1">
                    Boost: +{p.priority_visibility}
                    <InfoTooltip text={BOOST_TOOLTIP} />
                  </li>
                )}
              </ul>

              {testMode ? (
                <Button
                  size="sm"
                  variant={isActive ? "outline" : "default"}
                  disabled={busy === p.id || isActive}
                  onClick={() => activateTest(p.id)}
                  className="w-full"
                >
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    isActive ? "Già attivo" : <><Zap className="w-3 h-3 mr-1" /> Attiva (test)</>}
                </Button>
              ) : (
                !isActive && (
                  <Button size="sm" variant="outline" disabled={busy === p.id || (!p.external_payment_link && !p.stripe_price_id)} onClick={() => subscribe(p.id)} className="w-full">
                    {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                      (p.external_payment_link || p.stripe_price_id) ? <>Sottoscrivi <ExternalLink className="w-3 h-3 ml-1" /></> : "Coming soon"}
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>

      {masterPlan && (
        <div className={`bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border rounded-2xl p-4 ${active === masterPlan.id ? "border-primary/50 ring-1 ring-primary/30" : "border-accent/30"}`}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold">Piano {masterPlan.name}</h3>
                {active === masterPlan.id && <span className="text-[10px] font-bold uppercase text-primary">Attivo</span>}
              </div>
              <p className="text-xs text-muted-foreground">Hai tanti corsi da proporre? Contattaci e costruiamo un pacchetto su misura.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a href={`mailto:${CONTACT_EMAIL}?subject=Richiesta%20piano%20Master`}>
                <Button size="sm">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Contattaci
                </Button>
              </a>
              {testMode && active !== masterPlan.id && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === masterPlan.id}
                  onClick={() => activateTest(masterPlan.id)}
                >
                  {busy === masterPlan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    <><Zap className="w-3 h-3 mr-1" /> Attiva (test)</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {testMode && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Modalità beta: puoi attivare qualsiasi piano senza pagamento per testare le feature (analytics, limiti corsi/live, boost visibilità).
        </p>
      )}
    </section>
  );
}
