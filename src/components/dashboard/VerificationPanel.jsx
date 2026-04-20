import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, MapPin, CreditCard, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { id: "identity", label: "Identità", icon: User },
  { id: "residence", label: "Residenza", icon: MapPin },
  { id: "payment", label: "Pagamento", icon: CreditCard },
];

function StepIndicator({ currentStep }) {
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                done ? "bg-chart-3/20 border-chart-3/40 text-chart-3" :
                active ? "bg-primary/20 border-primary/40 text-primary" :
                "bg-secondary/50 border-border/30 text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-semibold mt-1 ${active ? "text-primary" : done ? "text-chart-3" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mb-4 transition-all ${done ? "bg-chart-3/40" : "bg-border/30"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function IdentityStep({ data, onChange, onNext }) {
  const [touched, setTouched] = useState(false);
  const isValid = data.firstName && data.lastName && data.birthDate;

  const calcAge = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const age = calcAge(data.birthDate);
  const underage = age !== null && age < 18;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-heading font-bold text-base mb-1">Dati personali</h3>
        <p className="text-xs text-muted-foreground">Necessari per la verifica dell'identità e la conformità legale</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome *</Label>
          <Input
            value={data.firstName}
            onChange={e => onChange({ ...data, firstName: e.target.value })}
            placeholder="Es. Giulia"
            className={`bg-secondary/30 h-10 ${touched && !data.firstName ? "border-destructive" : "border-border/30"}`}
          />
          {touched && !data.firstName && <p className="text-[11px] text-destructive">Campo obbligatorio</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cognome *</Label>
          <Input
            value={data.lastName}
            onChange={e => onChange({ ...data, lastName: e.target.value })}
            placeholder="Es. Rossi"
            className={`bg-secondary/30 h-10 ${touched && !data.lastName ? "border-destructive" : "border-border/30"}`}
          />
          {touched && !data.lastName && <p className="text-[11px] text-destructive">Campo obbligatorio</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Data di nascita *</Label>
        <Input
          type="date"
          value={data.birthDate}
          onChange={e => onChange({ ...data, birthDate: e.target.value })}
          className={`bg-secondary/30 h-10 max-w-xs ${touched && !data.birthDate ? "border-destructive" : "border-border/30"}`}
        />
        {touched && !data.birthDate && <p className="text-[11px] text-destructive">Campo obbligatorio</p>}
        {age !== null && (
          <div className={`flex items-center gap-1.5 text-xs mt-1 ${underage ? "text-destructive" : "text-chart-3"}`}>
            {underage ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {underage
              ? `Età non sufficiente (${age} anni). Devi avere almeno 18 anni.`
              : `Età verificata: ${age} anni ✓`}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Codice Fiscale</Label>
        <Input
          value={data.taxCode}
          onChange={e => onChange({ ...data, taxCode: e.target.value.toUpperCase() })}
          placeholder="Es. RSSGLA90A01H501Z"
          maxLength={16}
          className="bg-secondary/30 border-border/30 h-10 font-mono tracking-wider"
        />
      </div>

      {underage && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            Non puoi iscriverti come creator su Tokaro.fans se non hai ancora compiuto 18 anni.
          </p>
        </div>
      )}

      <Button
        onClick={() => { setTouched(true); if (isValid && !underage) onNext(); }}
        className={`w-full h-10 font-semibold ${isValid && !underage ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground"}`}
      >
        Continua
      </Button>
    </div>
  );
}

function ResidenceStep({ data, onChange, onNext, onBack }) {
  const isValid = data.address && data.city && data.postalCode && data.country;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-heading font-bold text-base mb-1">Residenza</h3>
        <p className="text-xs text-muted-foreground">Indirizzo di residenza per la fatturazione e gli adempimenti fiscali</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Via / Indirizzo *</Label>
        <Input
          value={data.address}
          onChange={e => onChange({ ...data, address: e.target.value })}
          placeholder="Es. Via Roma 1"
          className="bg-secondary/30 border-border/30 h-10"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Città *</Label>
          <Input
            value={data.city}
            onChange={e => onChange({ ...data, city: e.target.value })}
            placeholder="Es. Milano"
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">CAP *</Label>
          <Input
            value={data.postalCode}
            onChange={e => onChange({ ...data, postalCode: e.target.value })}
            placeholder="Es. 20100"
            maxLength={10}
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Paese *</Label>
        <Input
          value={data.country}
          onChange={e => onChange({ ...data, country: e.target.value })}
          placeholder="Es. Italia"
          className="bg-secondary/30 border-border/30 h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Provincia</Label>
        <Input
          value={data.province}
          onChange={e => onChange({ ...data, province: e.target.value })}
          placeholder="Es. MI"
          maxLength={2}
          className="bg-secondary/30 border-border/30 h-10 max-w-24"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-10 border-border/50">Indietro</Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1 h-10 bg-primary hover:bg-primary/90 font-semibold">Continua</Button>
      </div>
    </div>
  );
}

function PaymentStep({ data, onChange, onSubmit, onBack, submitting }) {
  const [showIban, setShowIban] = useState(false);

  const formatIban = (value) => {
    const clean = value.replace(/\s/g, "").toUpperCase();
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
  };

  const isValidIban = (iban) => {
    const clean = iban.replace(/\s/g, "");
    return clean.length >= 15 && clean.length <= 34;
  };

  const isValid = data.iban && isValidIban(data.iban) && data.accountHolder;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-heading font-bold text-base mb-1">Dati bancari</h3>
        <p className="text-xs text-muted-foreground">Utilizziamo questi dati per accreditare i tuoi guadagni mensilmente</p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          I tuoi dati bancari sono protetti con crittografia AES-256. Non li condividiamo con terze parti.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Intestatario conto *</Label>
        <Input
          value={data.accountHolder}
          onChange={e => onChange({ ...data, accountHolder: e.target.value })}
          placeholder="Cognome e nome o ragione sociale"
          className="bg-secondary/30 border-border/30 h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">IBAN *</Label>
        <div className="relative">
          <Input
            value={data.iban}
            onChange={e => onChange({ ...data, iban: formatIban(e.target.value) })}
            placeholder="IT60 X054 2811 1010 0000 0123 456"
            type={showIban ? "text" : "password"}
            className="bg-secondary/30 border-border/30 h-10 font-mono tracking-wider pr-10"
          />
          <button
            type="button"
            onClick={() => setShowIban(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showIban ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {data.iban && !isValidIban(data.iban) && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> IBAN non valido
          </p>
        )}
        {data.iban && isValidIban(data.iban) && (
          <p className="text-xs text-chart-3 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> IBAN valido
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">BIC / SWIFT (opzionale)</Label>
        <Input
          value={data.bic}
          onChange={e => onChange({ ...data, bic: e.target.value.toUpperCase() })}
          placeholder="Es. BNLIITRR"
          className="bg-secondary/30 border-border/30 h-10 font-mono tracking-wider max-w-xs"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-10 border-border/50">Indietro</Button>
        <Button
          onClick={onSubmit}
          disabled={!isValid || submitting}
          className="flex-1 h-10 bg-primary hover:bg-primary/90 glow-primary font-semibold"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : "Salva e verifica"}
        </Button>
      </div>
    </div>
  );
}

export default function VerificationPanel() {
  const [step, setStep] = useState("identity");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [identity, setIdentity] = useState({ firstName: "", lastName: "", birthDate: "", taxCode: "" });
  const [residence, setResidence] = useState({ address: "", city: "", postalCode: "", country: "Italia", province: "" });
  const [payment, setPayment] = useState({ accountHolder: "", iban: "", bic: "" });

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 2000);
  };

  if (done) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 gap-5"
      >
        <div className="w-20 h-20 rounded-full bg-chart-3/10 flex items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-chart-3" />
        </div>
        <div className="text-center">
          <h3 className="font-heading font-bold text-xl">Verifica inviata!</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            I tuoi dati sono stati inviati. La verifica richiede 24–48 ore lavorative.
          </p>
        </div>
        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Riepilogo</p>
          <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {identity.firstName} {identity.lastName}</p>
          <p className="text-sm"><span className="text-muted-foreground">Città:</span> {residence.city}, {residence.country}</p>
          <p className="text-sm"><span className="text-muted-foreground">IBAN:</span> ••••{payment.iban.replace(/\s/g, "").slice(-4)}</p>
        </div>
        <Button variant="outline" onClick={() => { setDone(false); setStep("identity"); }} className="border-border/50">
          Modifica dati
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-2">
      <div className="mb-6">
        <h2 className="font-heading font-bold text-lg">Verifica & Pagamenti</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Completa la verifica per ricevere i pagamenti e pubblicare contenuti per adulti</p>
      </div>

      <div className="bg-card/50 border border-border/30 rounded-2xl p-6">
        <StepIndicator currentStep={step} />

        {step === "identity" && (
          <IdentityStep data={identity} onChange={setIdentity} onNext={() => setStep("residence")} />
        )}
        {step === "residence" && (
          <ResidenceStep data={residence} onChange={setResidence} onNext={() => setStep("payment")} onBack={() => setStep("identity")} />
        )}
        {step === "payment" && (
          <PaymentStep data={payment} onChange={setPayment} onSubmit={handleSubmit} onBack={() => setStep("residence")} submitting={submitting} />
        )}
      </div>
    </motion.div>
  );
}