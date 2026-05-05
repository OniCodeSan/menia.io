import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// Conversion-layer block: invita lo studente a guardare una lezione preview
// gratuita di un corso reale, prima di richiedere il signup. Atterra sul
// CourseDetail con la preview lesson già evidenziata.
export default function FreeTrialBlock() {
  const [course, setCourse] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Cerca un corso pubblicato che abbia almeno una lezione is_preview=true.
      // Step 1: trova course_id con preview lesson; step 2: fetch course details.
      // (Niente embedded join: la FK courses↔course_lessons non si chiama "lessons"
      //  e PostgREST farebbe 400.)
      const { data: previewRows } = await supabase
        .from("course_lessons")
        .select("course_id")
        .eq("is_preview", true)
        .limit(20);
      const courseIds = [...new Set((previewRows || []).map((r) => r.course_id))];
      if (!courseIds.length) return;
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, cover_url, creator_id")
        .in("id", courseIds)
        .eq("is_published", true)
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setCourse(data);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-10 grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Prova gratis</p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight mb-3">
              Guarda una lezione completa prima di iscriverti
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
              Capisci subito se il metodo del formatore fa per te. Nessuna registrazione richiesta:
              clicca, guarda, decidi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={course ? `/courses/${course.id}` : "/courses"}>
                <Button size="lg" className="group">
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Guarda gratis ora
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="ghost">
                  Vedi tutti i corsi
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/30">
            {course?.cover_url ? (
              <img src={course.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              // Niente rettangolo grigio: gradient brand + pattern decorativo +
              // titolo overlay. Il blocco trasmette "questo è un corso reale"
              // anche senza cover image caricata.
              <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-end p-6">
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/20 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-background">
                  Corso reale
                </div>
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-background/10 blur-2xl" />
                <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-foreground/10 blur-2xl" />
                <h3 className="relative font-heading text-xl sm:text-2xl font-bold text-background leading-tight max-w-[80%]">
                  {course?.title || "Anteprima del corso"}
                </h3>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-background/95 backdrop-blur flex items-center justify-center shadow-card">
                <Play className="w-7 h-7 text-primary fill-current ml-0.5" />
              </div>
            </div>
            {course?.title && course?.cover_url && (
              <div className="absolute bottom-3 left-3 right-3 bg-background/90 backdrop-blur rounded-lg px-3 py-2 pointer-events-none">
                <p className="text-xs font-semibold truncate">{course.title}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
