import { Link } from "react-router-dom";
import { Check, Circle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// "Prossimi passi" come step-progression onboarding: gli step sono FISSI e
// canonici, lo stato (done/active/locked) si deriva dai dati reali. Dà senso
// di avanzamento (3/5 completati) invece di mostrare un singolo nudge alla
// volta come prima.
//
// I `suggestions` opportunistici dal server (low_conversion, publish_more)
// non vengono più mostrati qui: erano reminder, non milestone. Se servono
// di nuovo, andranno in una sezione separata "Suggerimenti".
export default function Suggestions({ data, onCreateCourse }) {
  const { user } = useAuth();

  if (!data) return null;
  const courses = data.courses || [];
  const totalStudents = data.kpi?.aggregated?.total_students || 0;
  const totalCourses = courses.length;
  const hasPublished = courses.some((c) => c.is_published);
  const hasPreviewLesson = false; // TODO se serve, query lessons.is_preview
  const hasFullProfile = !!(user?.bio && user?.avatar_url);

  // Sequenza canonica: l'utente avanza linearmente. Il primo step non-done
  // diventa "active" e mostra la CTA. Gli step successivi sono "locked".
  const steps = [
    {
      key: "first_course",
      title: "Pubblica il tuo primo corso",
      desc: "Bastano titolo + descrizione + 1 lezione per partire. Lo puoi sempre rifinire dopo.",
      done: totalCourses > 0,
      cta: { label: "Crea corso", onClick: onCreateCourse },
    },
    {
      key: "publish_draft",
      title: "Attiva la pubblicazione",
      desc: "Un corso in bozza non è visibile a nessuno. Pubblica il primo per farlo apparire nel catalogo.",
      done: hasPublished,
      cta: { label: "Vai ai corsi", to: "/dashboard/courses" },
    },
    {
      key: "complete_profile",
      title: "Completa il profilo pubblico",
      desc: "Aggiungi foto profilo e bio: i corsi senza un volto convertono meno.",
      done: hasFullProfile,
      cta: { label: "Modifica profilo", to: "/dashboard/settings" },
    },
    {
      key: "first_student",
      title: "Porta i primi studenti",
      desc: "Condividi il link del corso sui tuoi canali. Ogni accesso conta per il ranking.",
      done: totalStudents > 0,
      cta: courses[0]
        ? { label: "Copia link corso", to: `/courses/${courses[0].id}` }
        : { label: "Vai ai corsi", to: "/dashboard/courses" },
    },
    {
      key: "second_course",
      title: "Pubblica un secondo corso",
      desc: "I formatori con più corsi attivi performano 3x in conversione media.",
      done: totalCourses >= 2,
      cta: { label: "Crea corso", onClick: onCreateCourse },
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3">
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">Prossimi passi</h2>
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{completed}</strong>/{steps.length} completati
        </span>
      </div>

      {/* Progress bar lineare */}
      <div className="h-1 w-full rounded-full bg-secondary/50 overflow-hidden mb-4">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round((completed / steps.length) * 100)}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          const isLocked = !s.done && i > activeIdx && activeIdx !== -1;
          const tone = s.done
            ? "border-chart-3/30 bg-chart-3/5"
            : isActive
              ? "border-primary/30 bg-primary/5"
              : "border-border/30 bg-card opacity-60";

          return (
            <li key={s.key} className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${tone}`}>
              <span className="flex-shrink-0 mt-0.5">
                {s.done ? (
                  <span className="w-5 h-5 rounded-full bg-chart-3 flex items-center justify-center">
                    <Check className="w-3 h-3 text-background" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <span className="w-5 h-5 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${s.done ? "text-muted-foreground line-through decoration-chart-3/40" : ""}`}>{s.title}</p>
                {!s.done && <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>}
              </div>
              {isActive && s.cta && (
                s.cta.onClick ? (
                  <button onClick={s.cta.onClick} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-1">
                    {s.cta.label} <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <Link to={s.cta.to} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-1">
                    {s.cta.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ol>

      {completed === steps.length && (
        <p className="text-xs text-chart-3 font-semibold mt-3 inline-flex items-center gap-1">
          <Check className="w-3 h-3" /> Hai completato l'onboarding. Buon lavoro!
        </p>
      )}
    </section>
  );
}
