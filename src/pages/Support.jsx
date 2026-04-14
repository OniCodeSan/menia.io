import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Mail, Clock, ChevronDown, ChevronUp, MessageSquare, Shield, CreditCard, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_ICONS = [MessageSquare, Shield, CreditCard, Scale];
const CONTACT_COLORS = ["text-primary", "text-accent", "text-chart-3", "text-chart-4"];
const CONTACT_BG = ["bg-primary/10", "bg-accent/10", "bg-chart-3/10", "bg-chart-4/10"];

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
  const { t } = useLanguage();
  const s = t.support;

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
        <h1 className="font-heading text-3xl font-bold mb-3">{s.pageTitle}</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">{s.pageSubtitle}</p>
      </div>

      {/* Contact cards */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">{s.centerTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {s.contacts.map((c, i) => (
            <a key={c.email} href={`mailto:${c.email}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/40 hover:border-primary/30 hover:bg-card/70 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${CONTACT_BG[i]} flex items-center justify-center shrink-0`}>
                {(() => { const Icon = CONTACT_ICONS[i]; return <Icon className={`w-5 h-5 ${CONTACT_COLORS[i]}`} />; })()}
              </div>
              <div>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className={`text-xs ${CONTACT_COLORS[i]} group-hover:underline`}>{c.email}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{s.responseTime} <strong>{s.responseTimeValue}</strong> · {s.hours}</span>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-6">{s.faqTitle}</h2>
        <div className="space-y-3">
          {s.faqs.map((item, i) => <FAQItem key={i} item={item} />)}
        </div>
      </div>

      {/* Contact form */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-2">{s.formTitle}</h2>
        <p className="text-muted-foreground text-sm mb-6">{s.formSubtitle}</p>

        {sent ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-8 text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="font-heading font-bold text-lg mb-1">{s.formSuccess}</p>
            <p className="text-sm text-muted-foreground">{s.formSuccessText}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card/30 border border-border/30 rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{s.formName} *</label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mario Rossi" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{s.formEmail} *</label>
                <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mario@email.com" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{s.formType} *</label>
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">{s.formTypeSelect}</option>
                  {s.formTypes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{s.formSubject} *</label>
                <Input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={s.formSubjectPlaceholder} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{s.formMessage} *</label>
              <Textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder={s.formMessagePlaceholder} />
            </div>
            <div className="flex items-start gap-3">
              <input required type="checkbox" id="consent" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                className="mt-1 accent-primary" />
              <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">{s.formConsent}</label>
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 font-semibold">
              <Mail className="w-4 h-4 mr-2" />
              {s.formSubmit}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}