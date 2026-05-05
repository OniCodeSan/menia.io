import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ExternalLink, Loader2, Sparkles, TrendingUp, Award, Crown, Zap, Mail, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { plansApi, kpiApi, billingApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import useSubscription from "@/hooks/useSubscription";

const PLAN_META = {
  free:    { icon: Sparkles,    accent: "text-muted-foreground", cta: "Inizia ora" },
  starter: { icon: TrendingUp,  accent: "text-chart-3",          cta: "Sblocca più contenuti" },
  pro:     { icon: Award,       accent: "text-primary",          cta: "Cresci davvero",       featured: true },
  elite:   { icon: Crown,       accent: "text-accent",           cta: "Contattaci" },
};

const PLAN_TAGLINES = {
  free:    "Per partire con il primo corso",
  starter: "Per chi sta iniziando a vendere",
  pro:     "Per chi vende con costanza",
  elite:   "Hai tanti corsi da proporre? Parliamone",
};

const FAQS = [
  { q: "Come ricevo i pagamenti?", a: "Direttamente tramite il tuo provider di pagamento (Stripe Payment Link, Gumroad, Lemon Squeezy o altro). Menia non incassa per tuo conto." },
  { q: "Menia trattiene commissioni sui miei guadagni?", a: "No. I pagamenti sono gestiti dal tuo provider esterno e arrivano direttamente a te. Tu paghi solo la quota mensile del piano scelto." },
  { q: "Posso cambiare piano in qualsiasi momento?", a: "Sì. Puoi fare upgrade quando vuoi e il nuovo piano si attiva immediatamente. Per il downgrade, il piano corrente rimane attivo fino a scadenza." },
  { q: "Cosa succede se supero i limiti del piano?", a: "Vedrai un avviso di upgrade quando provi a creare contenuti oltre i limiti. I contenuti già pubblicati restano attivi." },
  { q: "Cos'è il piano Master?", a: "Master è il nostro piano dedicato ai creator con un catalogo ampio o esigenze particolari (volumi alti, supporto dedicato, integrazioni custom). Scrivici e definiamo insieme il pacchetto giusto." },
];

const CONTACT_EMAIL = "support@menia.io";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(null);
  const [studentBusy, setStudentBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { sub, isActive: hasStudentSub, trialDaysLeft, daysToRenewal } = useSubscription();

  const startStudentCheckout = async () => {
    if (!user) {
      try { sessionStorage.setItem("menia:return_to", "/pricing"); } catch {}
      navigate("/student-login");
      return;
    }
    setStudentBusy(true);
    try {
      const r = await billingApi.startCheckout();
      if (r.url) window.location.href = r.url;
    } catch (e) {
      alert(e.message || "Errore avvio checkout");
    } finally {
      setStudentBusy(false);
    }
  };

  const refresh = () =>
    Promise.all([
      plansApi.list().catch(() => ({ plans: [] })),
      user ? kpiApi.get().catch(() => null) : Promise.resolve(null),
    ]).then(([p, k]) => {
      setPlans(p.plans || []);
      setTestMode(!!p.test_mode_active);
      setActivePlan(k?.plan?.id || null);
      setLoading(false);
    });

  useEffect(() => { refresh(); }, [user]);

  const subscribe = async (plan) => {
    if (!user) {
      navigate("/trainer-portal");
      return;
    }
    if (plan.id === "free") {
      navigate("/dashboard");
      return;
    }
    setBusy(plan.id);
    try {
      if (testMode) {
        const r = await kpiApi.activatePlanTest(plan.id);
        setActivePlan(r.plan?.id || plan.id);
        setTimeout(refresh, 200);
      } else {
        const r = await kpiApi.subscribePlan(plan.id);
        if (r.url) {
          // Stripe checkout: redirect (same tab — abbiamo metadata return URLs)
          window.location.href = r.url;
        } else if (r.payment_link) {
          // Legacy fallback: external_payment_link
          window.open(r.payment_link, "_blank", "noopener");
        }
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const activateTest = async (planId) => {
    if (!user) {
      navigate("/trainer-portal");
      return;
    }
    setBusy(planId);
    try {
      const r = await kpiApi.activatePlanTest(planId);
      setActivePlan(r.plan?.id || planId);
      setTimeout(refresh, 200);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const standardPlans = plans.filter((p) => !p.contact_only);
  const masterPlan = plans.find((p) => p.contact_only);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {testMode && user && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-500 inline-flex items-center gap-2 w-full">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Modalità beta attiva:</strong> puoi attivare qualsiasi piano senza pagamento per testare le feature. In produzione passerà dal link di pagamento esterno.
          </span>
        </div>
      )}

      {!user && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3 text-sm">
          <span className="text-2xl">🎁</span>
          <div className="flex-1">
            <p className="font-semibold text-primary">1 mese di Starter gratis per i nuovi formatori</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Iscriviti come formatore e ricevi il piano Starter (corsi, analytics base, boost visibilità) gratuito per 30 giorni. Niente carta richiesta.
            </p>
          </div>
          <Link to="/trainer-portal" className="hidden sm:inline-flex">
            <Button size="sm">Iniziare</Button>
          </Link>
        </div>
      )}

      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4 leading-tight">
          Trasforma le tue competenze<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            in entrate reali
          </span>
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto mb-6">
          Crea corsi, vendi accessi e gestisci la tua community. Senza complicazioni tecniche.
        </p>
        <Link to={user ? "/dashboard" : "/trainer-portal"}>
          <Button size="lg" className="px-8">Inizia ora</Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-3">Pubblica il primo corso in pochi minuti</p>
      </section>

      {/* Piano Studente — accesso a tutti i corsi */}
      <section className="max-w-2xl mx-auto mb-12">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Per gli studenti</span>
          <h2 className="font-heading text-2xl font-bold mt-1">Sblocca tutto il catalogo</h2>
          <p className="text-sm text-muted-foreground">Un solo abbonamento, accesso a tutti i corsi pubblicati su Menia.</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-heading text-3xl font-bold">€0,99</span>
              <span className="text-sm text-muted-foreground">/mese</span>
              {hasStudentSub && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-chart-3/20 text-chart-3 border border-chart-3/30">
                  {sub?.status === "trial" ? `Trial — ${trialDaysLeft}gg` : "Attivo"}
                </span>
              )}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mt-2">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> Accesso a tutti i corsi pubblicati</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> Community e aggiornamenti del formatore</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> Disdici quando vuoi</li>
            </ul>
          </div>
          <div className="flex-shrink-0">
            {hasStudentSub && sub?.status === "active" ? (
              <Button variant="outline" size="lg" disabled>
                Già attivo · rinnovo in {daysToRenewal}gg
              </Button>
            ) : (
              <Button size="lg" onClick={startStudentCheckout} disabled={studentBusy}>
                {studentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : (sub?.status === "trial" ? "Attiva ora" : "Abbonati")}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Separatore visivo */}
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Per i formatori</span>
        <h2 className="font-heading text-2xl font-bold mt-1">Pubblica e vendi corsi</h2>
        <p className="text-sm text-muted-foreground">Scegli il piano in base al volume di contenuti.</p>
      </div>

      {/* Plans grid — 3 piani standard */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {standardPlans.map((p) => {
          const meta = PLAN_META[p.id] || PLAN_META.free;
          const Icon = meta.icon;
          const isActive = activePlan === p.id;
          const priceN = Number(p.price_monthly);
          return (
            <div
              key={p.id}
              className={`relative bg-card border rounded-2xl p-5 flex flex-col ${
                meta.featured ? "border-primary/50 ring-2 ring-primary/20 shadow-lg" : "border-border/30"
              }`}
            >
              {meta.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  Più scelto
                </span>
              )}
              {isActive && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-chart-3/20 text-chart-3 border border-chart-3/30">
                  Attivo
                </span>
              )}

              <Icon className={`w-6 h-6 ${meta.accent} mb-2`} />
              <h2 className="font-heading text-2xl font-bold">{p.name}</h2>
              <p className="text-xs text-muted-foreground mb-4">{PLAN_TAGLINES[p.id]}</p>

              <p className="font-heading text-4xl font-bold mb-1">
                €{priceN.toFixed(2).replace(/\.00$/, "")}
                <span className="text-sm text-muted-foreground font-normal">/mese</span>
              </p>

              <ul className="text-sm space-y-2 my-5 flex-1">
                <Feature ok>{p.max_courses == null ? "Corsi illimitati" : `${p.max_courses} cors${p.max_courses === 1 ? "o" : "i"}`}</Feature>
                <Feature ok>Analytics {labelAnalytics(p.analytics_level)}</Feature>
                <Feature ok>Supporto {labelSupport(p.support_level)}</Feature>
                {p.priority_visibility > 0 && <Feature ok>Boost visibilità +{p.priority_visibility}</Feature>}
                <Feature ok>Pagamenti senza commissioni</Feature>
              </ul>

              {isActive ? (
                <Button variant="outline" disabled>Piano attivo</Button>
              ) : testMode ? (
                <Button
                  variant={meta.featured ? "default" : "outline"}
                  disabled={busy === p.id}
                  onClick={() => activateTest(p.id)}
                >
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    <><Zap className="w-3.5 h-3.5 mr-1" /> Attiva (test)</>}
                </Button>
              ) : (
                <Button
                  variant={meta.featured ? "default" : "outline"}
                  disabled={busy === p.id || (!p.external_payment_link && !p.stripe_price_id)}
                  onClick={() => subscribe(p)}
                >
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    (p.stripe_price_id || p.external_payment_link)
                      ? <>{meta.cta} {p.external_payment_link && !p.stripe_price_id && <ExternalLink className="w-3.5 h-3.5 ml-1" />}</>
                      : "Coming soon"}
                </Button>
              )}
            </div>
          );
        })}
      </section>

      {/* Master — contact-only */}
      {masterPlan && (
        <section className="mb-12">
          <div className="relative bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border border-accent/30 rounded-2xl p-6 md:p-8 overflow-hidden">
            <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-accent" />
                  <h2 className="font-heading text-xl md:text-2xl font-bold">Piano {masterPlan.name}</h2>
                  {activePlan === masterPlan.id && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-chart-3/20 text-chart-3 border border-chart-3/30">
                      Attivo
                    </span>
                  )}
                </div>
                <p className="text-sm md:text-base text-muted-foreground mb-3">
                  Hai tanti corsi da proporre, esigenze custom o un'audience importante? Costruiamo insieme un pacchetto su misura.
                </p>
                <ul className="text-xs md:text-sm space-y-1 text-muted-foreground">
                  <li>· Corsi illimitati</li>
                  <li>· Analytics complete + funnel di conversione</li>
                  <li>· Supporto prioritario dedicato</li>
                  <li>· Boost visibilità massimo nel ranking</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <a href={`mailto:${CONTACT_EMAIL}?subject=Richiesta%20piano%20Master`}>
                  <Button size="lg" className="w-full">
                    <Mail className="w-4 h-4 mr-1.5" /> Contattaci
                  </Button>
                </a>
                {testMode && activePlan !== masterPlan.id && (
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
        </section>
      )}

      {/* When does it make sense to upgrade? */}
      <section className="mb-12">
        <h2 className="font-heading text-2xl font-bold text-center mb-6">
          Quando ha senso passare a un piano superiore?
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <UpgradeCard plan="Starter" lines={["Hai più di 1 corso", "Vuoi iniziare a vendere seriamente"]} />
          <UpgradeCard plan="Grow" lines={["Stai già vendendo", "Vuoi dati per migliorare le conversioni"]} />
          <UpgradeCard plan="Master" lines={["Hai un catalogo ampio", "Vuoi un pacchetto su misura"]} />
        </div>
      </section>

      {/* Value */}
      <section className="bg-card border border-border/30 rounded-2xl p-8 mb-12">
        <h2 className="font-heading text-xl font-bold mb-4">Cosa puoi fare con Menia</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <ValueLine>Vendere corsi con link diretto al tuo provider di pagamento</ValueLine>
          <ValueLine>Gestire accessi senza complessità tecnica</ValueLine>
          <ValueLine>Costruire una community con post riservati agli abbonati</ValueLine>
          <ValueLine>Caricare video con compressione automatica</ValueLine>
          <ValueLine>Analytics chiari per capire cosa funziona</ValueLine>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="font-heading text-2xl font-bold text-center mb-6">Domande frequenti</h2>
        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQS.map((f, i) => (
            <details key={i} className="bg-card border border-border/30 rounded-2xl p-4 group">
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                <span>{f.q}</span>
                <span className="text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center bg-primary/5 border border-primary/20 rounded-2xl p-8">
        <h2 className="font-heading text-xl md:text-2xl font-bold mb-3">
          Inizia gratis e pubblica il tuo primo corso oggi
        </h2>
        <Link to={user ? "/dashboard" : "/trainer-portal"}>
          <Button size="lg" className="px-8">Inizia gratis</Button>
        </Link>
      </section>
    </div>
  );
}

function Feature({ ok, children }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ok ? "text-chart-3" : "text-muted-foreground/40"}`} />
      <span>{children}</span>
    </li>
  );
}

function UpgradeCard({ plan, lines }) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Passa a {plan}</p>
      <ul className="text-sm space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-chart-3 flex-shrink-0 mt-0.5" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueLine({ children }) {
  return (
    <p className="flex items-start gap-2">
      <Check className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function labelAnalytics(level) {
  return { none: "base", basic: "intermedie", advanced: "avanzate", full: "complete" }[level] || level;
}
function labelSupport(level) {
  return { community: "community", email: "via email", priority: "prioritario" }[level] || level;
}
