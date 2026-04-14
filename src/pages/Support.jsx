import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Mail, Clock, ChevronDown, ChevronUp, MessageSquare, Shield, CreditCard, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FAQ_IT = [
  { q: "Cos'è Tokaro.fans?", a: "Tokaro.fans è una piattaforma che permette ai creator di condividere contenuti esclusivi e monetizzare attraverso un sistema di token, abbonamenti e donazioni, mantenendo il pieno controllo dei propri guadagni." },
  { q: "Come posso registrarmi?", a: "Per registrarti, clicca su \"Iscriviti\" nella homepage e segui la procedura guidata. I creator dovranno completare anche la verifica dell'identità (KYC) prima di poter ricevere pagamenti." },
  { q: "Chi può utilizzare Tokaro?", a: "La piattaforma è riservata a utenti che abbiano compiuto almeno 18 anni. Durante la registrazione potrebbe essere richiesta una verifica dell'età." },
  { q: "Quanto costa per un creator utilizzare Tokaro?", a: "Il costo mensile dipende dal numero di follower del creator, con una soglia gratuita fino a 100 follower e un periodo di prova gratuito di 30 giorni per gli altri utenti. Le tariffe sono indicate nei Termini e Condizioni." },
  { q: "Come funziona il sistema di token?", a: "I fan acquistano token da utilizzare per accedere ai contenuti dei creator. Tokaro applica una commissione del 10% sul cambio tra valuta reale e token. I token non sono una criptovaluta e possono essere utilizzati esclusivamente all'interno della piattaforma." },
  { q: "I token sono rimborsabili?", a: "Salvo quanto previsto dalla normativa vigente, i token acquistati non sono rimborsabili e non possono essere convertiti nuovamente in denaro dai fan." },
  { q: "Come vengono pagati i creator?", a: "I creator ricevono il 100% del valore dei token spesi dai fan. I pagamenti vengono effettuati periodicamente e sono soggetti al completamento delle verifiche KYC/AML e alle eventuali commissioni di prelievo." },
  { q: "Cosa succede se un creator non paga la fee mensile?", a: "In caso di mancato pagamento, l'account del creator può essere sospeso. Tuttavia, i fondi maturati rimangono di proprietà del creator e potranno essere prelevati una volta regolarizzata la posizione, come specificato nei Termini e Condizioni." },
  { q: "Posso cancellare il mio account?", a: "Sì, è possibile richiedere la cancellazione del proprio account in qualsiasi momento contattando il supporto. Eventuali fondi residui saranno gestiti secondo quanto previsto dai Termini e Condizioni." },
  { q: "È possibile migrare contenuti da altre piattaforme?", a: "Sì, purché il creator sia titolare dei diritti sui contenuti e la migrazione avvenga nel rispetto dei termini di servizio delle piattaforme di origine." },
  { q: "Come posso segnalare un contenuto inappropriato?", a: "Puoi segnalare contenuti che violano le nostre policy inviando un'email a support@tokaro.fans con una descrizione dettagliata e il link al contenuto." },
  { q: "Tokaro è sicuro?", a: "Sì, utilizziamo sistemi di sicurezza avanzati per proteggere i dati personali e le transazioni economiche, nel rispetto del Regolamento (UE) 2016/679 (GDPR)." },
  { q: "Quali metodi di pagamento sono accettati?", a: "Tokaro supporta i principali metodi di pagamento, come carte di credito/debito e altri sistemi digitali gestiti da provider certificati (es. Stripe)." },
  { q: "Quanto tempo richiede la verifica dell'identità (KYC)?", a: "La verifica KYC richiede generalmente da poche ore fino a 2–3 giorni lavorativi, a seconda della completezza delle informazioni fornite." },
  { q: "Come posso recuperare la password?", a: "Clicca su \"Password dimenticata?\" nella pagina di login e segui le istruzioni per reimpostarla tramite email." },
];

const FAQ_EN = [
  { q: "What is Tokaro.fans?", a: "Tokaro.fans is a platform that allows creators to share exclusive content and monetize through a token system, subscriptions, and donations, while keeping full control of their earnings." },
  { q: "How do I sign up?", a: "To register, click \"Sign Up\" on the homepage and follow the guided process. Creators must also complete identity verification (KYC) before receiving payments." },
  { q: "Who can use Tokaro?", a: "The platform is reserved for users aged 18 and over. Age verification may be required during registration." },
  { q: "How much does it cost for a creator to use Tokaro?", a: "The monthly cost depends on the creator's follower count, with a free tier for up to 100 followers and a free 30-day trial for others. Rates are clearly stated in the Terms and Conditions." },
  { q: "How does the token system work?", a: "Fans purchase tokens to access creator content. Tokaro applies a 10% fee on the exchange from real currency to tokens. Tokens are not a cryptocurrency and can only be used within the platform." },
  { q: "Are tokens refundable?", a: "Unless required by applicable law, purchased tokens are non-refundable and cannot be converted back into money by fans." },
  { q: "How are creators paid?", a: "Creators receive 100% of the value of tokens spent by fans. Payments are made periodically and are subject to KYC/AML verification and any applicable withdrawal fees." },
  { q: "What happens if a creator doesn't pay the monthly fee?", a: "In case of non-payment, the creator's account may be suspended. However, earned funds remain the creator's property and can be withdrawn once the situation is resolved, as specified in the Terms and Conditions." },
  { q: "Can I delete my account?", a: "Yes, you can request account deletion at any time by contacting support. Any remaining funds will be handled in accordance with the Terms and Conditions." },
  { q: "Can I migrate content from other platforms?", a: "Yes, as long as the creator holds the rights to the content and the migration complies with the source platforms' terms of service." },
  { q: "How do I report inappropriate content?", a: "You can report content that violates our policies by emailing support@tokaro.fans with a detailed description and a link to the content." },
  { q: "Is Tokaro secure?", a: "Yes, we use advanced security systems to protect personal data and financial transactions, in compliance with Regulation (EU) 2016/679 (GDPR)." },
  { q: "What payment methods are accepted?", a: "Tokaro supports major payment methods including credit/debit cards and other digital systems managed by certified providers (e.g. Stripe)." },
  { q: "How long does KYC verification take?", a: "KYC verification generally takes from a few hours to 2–3 business days, depending on the completeness of the information provided." },
  { q: "How can I recover my password?", a: "Click \"Forgot password?\" on the login page and follow the instructions to reset it via email." },
];

const FAQ_BY_LANG = { it: FAQ_IT, en: FAQ_EN, fr: FAQ_EN, de: FAQ_EN, es: FAQ_EN, ru: FAQ_EN };

const CONTACT_CARDS = [
  { icon: MessageSquare, label: "Supporto Generale", email: "support@tokaro.fans", color: "text-primary", bg: "bg-primary/10" },
  { icon: Shield, label: "Supporto Creator", email: "creators@tokaro.fans", color: "text-accent", bg: "bg-accent/10" },
  { icon: CreditCard, label: "Pagamenti & Fatturazione", email: "billing@tokaro.fans", color: "text-chart-3", bg: "bg-chart-3/10" },
  { icon: Scale, label: "Segnalazioni Legali", email: "legal@tokaro.fans", color: "text-chart-4", bg: "bg-chart-4/10" },
];

const REQUEST_TYPES = ["Supporto generale", "Pagamenti", "Creator", "Segnalazione", "Altro"];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="font-medium text-sm">{item.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/20 pt-3 bg-secondary/10">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { language } = useLanguage();
  const faqs = FAQ_BY_LANG[language] || FAQ_EN;

  const [form, setForm] = useState({ name: "", email: "", type: "", subject: "", message: "", consent: false });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      {/* Hero */}
      <div>
        <h1 className="font-heading text-3xl font-bold mb-3">Supporto – Tokaro.fans</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Benvenuto nella sezione di supporto. Qui trovi risposte rapide alle domande più frequenti e i contatti per ricevere assistenza.
          Il nostro obiettivo è offrirti un'esperienza semplice, sicura e trasparente.
        </p>
      </div>

      {/* Contact cards */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Centro Assistenza</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {CONTACT_CARDS.map((c) => (
            <a key={c.email} href={`mailto:${c.email}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/40 hover:border-primary/30 hover:bg-card/70 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className={`text-xs ${c.color} group-hover:underline`}>{c.email}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Tempo medio di risposta: <strong>24–48 ore lavorative</strong> · Lun–Ven 9:00–18:00 CET</span>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">Domande Frequenti (FAQ)</h2>
        <div className="space-y-3">
          {faqs.map((item, i) => <FAQItem key={i} item={item} />)}
        </div>
      </div>

      {/* Contact form */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-2">Modulo di Contatto</h2>
        <p className="text-muted-foreground text-sm mb-6">Non hai trovato risposta? Scrivici direttamente.</p>

        {sent ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-8 text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="font-heading font-bold text-lg mb-1">Messaggio inviato!</p>
            <p className="text-sm text-muted-foreground">Ti risponderemo entro 24–48 ore lavorative.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card/30 border border-border/30 rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nome e Cognome *</label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mario Rossi" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email *</label>
                <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mario@email.com" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tipo di richiesta *</label>
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Seleziona...</option>
                  {REQUEST_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Oggetto *</label>
                <Input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Oggetto della richiesta" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Messaggio *</label>
              <Textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Descrivi la tua richiesta nel dettaglio..." />
            </div>
            <div className="flex items-start gap-3">
              <input required type="checkbox" id="consent" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                className="mt-1 accent-primary" />
              <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">
                Acconsento al trattamento dei dati personali ai sensi del Regolamento (UE) 2016/679 (GDPR) *
              </label>
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 font-semibold">
              <Mail className="w-4 h-4 mr-2" />
              Invia messaggio
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}