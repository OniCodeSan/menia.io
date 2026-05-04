import { Mail, GraduationCap, ShieldAlert, Wrench } from "lucide-react";

const SECTIONS = [
  {
    icon: GraduationCap,
    title: "Domande sui corsi",
    body: "Per domande sul contenuto di un corso o sulle lezioni, contatta direttamente il creator dalla sezione messaggi del suo profilo.",
  },
  {
    icon: Wrench,
    title: "Problemi tecnici",
    body: "Se riscontri bug, errori di accesso o malfunzionamenti, scrivici descrivendo il problema e includendo eventuali screenshot.",
    email: "support@menia.io",
  },
  {
    icon: ShieldAlert,
    title: "Segnalazioni di abuso",
    body: "Per segnalare contenuti che violano la nostra Content Policy, scrivici. Esamineremo la segnalazione entro 72 ore lavorative.",
    email: "abuse@menia.io",
  },
  {
    icon: Mail,
    title: "Contatti generali",
    body: "Per domande commerciali, partnership o altro, scrivici alla casella info.",
    email: "info@menia.io",
  },
];

export default function Support() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-2xl font-bold mb-2">Supporto</h1>
      <p className="text-sm text-muted-foreground mb-6">Siamo qui per aiutarti. Scegli il canale giusto per la tua richiesta.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="bg-card border border-border/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <s.icon className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold">{s.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            {s.email && (
              <a href={`mailto:${s.email}`} className="mt-3 inline-block text-sm text-primary hover:underline">{s.email}</a>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 bg-secondary/30 border border-border/30 rounded-2xl p-5 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Pagamenti e rimborsi:</strong>{" "}
          le transazioni avvengono tramite provider esterni scelti dal creator. Per
          rimborsi o problemi di pagamento, contatta direttamente il creator e
          il provider di pagamento utilizzato (es. Stripe, Gumroad).
        </p>
      </div>
    </div>
  );
}
