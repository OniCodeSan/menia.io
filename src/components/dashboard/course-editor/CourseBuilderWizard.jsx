import { useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  {
    key: "promise",
    label: "Cosa imparerà chi compra il corso?",
    hint: "La promessa core. Una frase breve.",
    placeholder: "Es: trovare clienti su Instagram",
    multiline: false,
    required: true,
  },
  {
    key: "result",
    label: "Che risultato concreto otterranno?",
    hint: "Specifico, misurabile se possibile.",
    placeholder: "Es: i primi 3 clienti in 30 giorni",
    multiline: false,
    required: true,
  },
  {
    key: "target",
    label: "Per chi è questo corso?",
    hint: "Chi è il tuo studente ideale (più gruppi separati da virgola).",
    placeholder: "Es: freelance, creator, principianti",
    multiline: false,
    required: true,
  },
  {
    key: "problem",
    label: "Qual è il problema che risolve?",
    hint: "Il punto di dolore. Cosa NON riescono a fare oggi.",
    placeholder: "Es: non sanno da dove iniziare e perdono mesi",
    multiline: true,
    required: true,
  },
  {
    key: "content",
    label: "Cosa contiene il corso?",
    hint: "Una frase che descrive struttura e tipologia (lezioni, esempi, ecc).",
    placeholder: "Es: 10 lezioni con strategia, esempi reali e template pratici",
    multiline: true,
    required: true,
  },
  {
    key: "bonus",
    label: "C'è qualcosa in più? (opzionale)",
    hint: "Bonus, checklist, template, accesso community...",
    placeholder: "Es: checklist post-corso + 1 call di gruppo al mese",
    multiline: true,
    required: false,
  },
];

function generate(form) {
  const promise = form.promise.trim();
  const result = form.result.trim();
  const target = form.target.trim();
  const problem = form.problem.trim();
  const content = form.content.trim();
  const bonus = form.bonus.trim();

  // Title: "<Promise> anche se <problem-condensed>"
  const problemShort = problem.replace(/\.+$/, "").split(/[,.]/)[0].trim();
  const title = `Impara a ${promise.toLowerCase()}${problemShort ? ` anche se ${problemShort.toLowerCase()}` : ""}`;

  // Description: structured but human
  const description = [
    `Questo corso ti aiuta a ${result.toLowerCase()}.`,
    target ? `\nÈ pensato per ${target.toLowerCase()}.` : "",
    content ? `\n\nCosa contiene:\n${content}` : "",
    bonus ? `\n\n✨ Bonus inclusi: ${bonus}` : "",
  ].filter(Boolean).join("");

  // Learning outcomes: parse content into bullet items if user separated with newlines or commas
  const learning_outcomes = (content.split(/\n|·|•/).map((s) => s.trim()).filter(Boolean).slice(0, 6)).map((s) =>
    s.replace(/^[-*\d.)\s]+/, "")
  );

  // Target audience: split by comma
  const target_audience = target.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 6);

  // FAQ minima
  const faq = [
    {
      q: "Come accedo dopo il pagamento?",
      a: "Riceverai accesso al corso completo subito dopo la conferma del pagamento. In alcuni casi può richiedere fino a 24 ore.",
    },
    {
      q: "Posso rivedere le lezioni più volte?",
      a: "Sì, l'accesso è continuo: puoi rivedere e rivisitare ogni lezione quando vuoi.",
    },
  ];

  return {
    title: capitalize(title),
    description,
    landing_data: {
      learning_outcomes: learning_outcomes.length > 0 ? learning_outcomes : [
        `Capire come ${promise.toLowerCase()}`,
        `Ottenere ${result.toLowerCase()}`,
      ],
      target_audience,
      bonus: bonus || undefined,
      faq,
    },
  };
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export default function CourseBuilderWizard({ initial = {}, onApply, onClose }) {
  const [form, setForm] = useState({
    promise: initial.promise || "",
    result: initial.result || "",
    target: initial.target || "",
    problem: initial.problem || "",
    content: initial.content || "",
    bonus: initial.bonus || "",
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [generated, setGenerated] = useState(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const canNext = !step.required || form[step.key].trim().length > 0;

  const next = () => {
    if (isLast) {
      const g = generate(form);
      setGenerated(g);
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  if (generated) {
    return (
      <Modal onClose={onClose} title="Anteprima pagina corso">
        <div className="space-y-4">
          <div className="bg-card border border-border/30 rounded-xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Titolo generato</p>
            <h3 className="font-heading font-bold text-xl mb-3">{generated.title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Descrizione</p>
            <p className="text-sm whitespace-pre-wrap mb-3">{generated.description}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Cosa imparerai</p>
            <ul className="text-sm space-y-1 mb-3">
              {generated.landing_data.learning_outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-chart-3 flex-shrink-0 mt-0.5" /> <span>{o}</span></li>
              ))}
            </ul>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Per chi è</p>
            <p className="text-sm">{generated.landing_data.target_audience.join(" · ")}</p>
            {generated.landing_data.bonus && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mt-3 mb-1">Bonus</p>
                <p className="text-sm">{generated.landing_data.bonus}</p>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Puoi modificare tutto a mano dall'editor del corso dopo aver applicato.
          </p>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setGenerated(null)}>← Indietro al wizard</Button>
            <Button onClick={() => { onApply(generated); onClose(); }}>
              Applica al corso
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Costruisci la tua pagina corso">
      <div className="space-y-5">
        {/* Progress */}
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-secondary/40"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Passo {stepIdx + 1} di {STEPS.length}
        </p>

        <div>
          <Label className="text-base font-heading font-bold">{step.label}</Label>
          <p className="text-xs text-muted-foreground mb-3">{step.hint}</p>
          {step.multiline ? (
            <Textarea
              rows={3}
              value={form[step.key]}
              onChange={(e) => setForm({ ...form, [step.key]: e.target.value })}
              placeholder={step.placeholder}
              autoFocus
            />
          ) : (
            <Input
              value={form[step.key]}
              onChange={(e) => setForm({ ...form, [step.key]: e.target.value })}
              placeholder={step.placeholder}
              autoFocus
            />
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={back} disabled={stepIdx === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
          </Button>
          <Button onClick={next} disabled={!canNext}>
            {isLast ? <><Sparkles className="w-4 h-4 mr-1" /> Genera pagina</> : <>Avanti <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
        <div className="p-5 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card rounded-t-2xl">
          <h2 className="font-heading font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> {title}
          </h2>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
