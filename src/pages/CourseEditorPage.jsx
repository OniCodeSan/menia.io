import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { coursesApi, lessonsApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import useAutosave from "@/hooks/useAutosave";

import CourseSettings      from "@/components/dashboard/course-editor/CourseSettings";
import LessonSidebar       from "@/components/dashboard/course-editor/LessonSidebar";
import LessonEditor        from "@/components/dashboard/course-editor/LessonEditor";
import LessonPreview       from "@/components/dashboard/course-editor/LessonPreview";
import CourseBuilderWizard from "@/components/dashboard/course-editor/CourseBuilderWizard";

export default function CourseEditorPage() {
  const { id } = useParams();
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default payment link salvato sul profilo: se settato, lo auto-popoliamo
  // sui nuovi corsi senza external_payment_link. Se l'utente lo inserisce
  // manualmente sul corso E NON ce l'ha sul profilo, scatta il popup conferma
  // "vuoi salvarlo come default per i prossimi corsi?".
  const [profileDefaultPaymentLink, setProfileDefaultPaymentLink] = useState(null);
  const [savePaymentPrompt, setSavePaymentPrompt] = useState(null); // { link } | null
  const promptedRef = useRef(false);
  const [error, setError] = useState("");
  const [savingState, setSavingState] = useState(null); // 'saving' | 'saved' | 'error' | null
  const [showWizard, setShowWizard] = useState(false);

  // Debounce timers — keyed by what's being saved
  const courseTimerRef = useRef(null);
  const lessonTimersRef = useRef(new Map());

  // ---- Load
  useEffect(() => {
    if (!isLoadingAuth && !user) navigate("/trainer-login", { replace: true });
  }, [isLoadingAuth, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await coursesApi.get(id);
        if (cancelled) return;
        if (r.course.creator_id !== user.id && user.role !== "admin") {
          setError("Questo corso non è di tua proprietà.");
          setLoading(false);
          return;
        }
        // Fetch parallelo del default payment link dal profilo. Se il corso
        // non ha external_payment_link e il profilo sì, auto-popoliamo.
        const { data: profile } = await supabase
          .from("creator_profiles")
          .select("external_payment_link")
          .eq("user_id", user.id)
          .maybeSingle();
        const defaultLink = profile?.external_payment_link || null;
        if (!cancelled) setProfileDefaultPaymentLink(defaultLink);

        const courseToSet = { ...r.course };
        if (!courseToSet.external_payment_link && defaultLink) {
          courseToSet.external_payment_link = defaultLink;
          // Persist the auto-fill (one-time, on load)
          coursesApi.update(id, { external_payment_link: defaultLink }).catch(() => {});
        }
        setCourse(courseToSet);
        setLessons(r.lessons || []);
        if (r.lessons?.length) setActiveLessonId(r.lessons[0].id);

        // Recovery: check if a more recent draft snapshot exists.
        // We compare the draft's course.updated_at with the live one.
        try {
          const d = await coursesApi.getDraft(id);
          if (d.draft && d.created_at) {
            const draftSavedAt = new Date(d.created_at).getTime();
            const liveUpdatedAt = new Date(r.course.updated_at || r.course.created_at).getTime();
            // Prompt only if draft is meaningfully newer than the live record
            if (draftSavedAt > liveUpdatedAt + 1000) {
              const restore = window.confirm(
                "Abbiamo trovato una versione salvata automaticamente più recente del corso (autosave). Vuoi ripristinarla?"
              );
              if (restore) {
                if (d.draft.course) setCourse((c) => ({ ...c, ...d.draft.course }));
                if (Array.isArray(d.draft.lessons)) setLessons(d.draft.lessons);
              }
            }
          }
        } catch (err) {
          console.warn("[draft recovery]", err?.message);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, user]);

  // Snapshot autosave: chiamata SOLO sugli edit utente (vedi updateCourse,
  // updateLesson, reorderLessons). Niente magia su confronto data, niente
  // grace window: se nessuno chiama markDraftDirty(), niente save-draft parte.
  const markDraftDirty = useAutosave(
    { course, lessons },
    async ({ course: c, lessons: ls }) => {
      if (!c?.id) return;
      try {
        await coursesApi.saveDraft(c, ls);
      } catch (err) {
        // Non-blocking — per-field autosave is the primary path
      }
    },
    { delay: 2500, enabled: !!course?.id }
  );

  // ---- Course autosave (debounced 800ms)
  const updateCourse = (next) => {
    // Detect first-time payment link entry: l'utente ha inserito un link
    // sul corso, non ce l'aveva sul profilo, non gliel'abbiamo mai chiesto.
    // Mostra popup chiedendo se salvarlo come default.
    const newLink = (next.external_payment_link || "").trim();
    const oldLink = (course?.external_payment_link || "").trim();
    if (
      newLink &&
      newLink !== oldLink &&
      newLink !== profileDefaultPaymentLink &&
      !profileDefaultPaymentLink &&
      !promptedRef.current &&
      newLink.startsWith("http")
    ) {
      promptedRef.current = true;
      setSavePaymentPrompt({ link: newLink });
    }
    setCourse(next);
    markDraftDirty();
    if (courseTimerRef.current) clearTimeout(courseTimerRef.current);
    courseTimerRef.current = setTimeout(async () => {
      setSavingState("saving");
      try {
        await coursesApi.update(id, {
          title: next.title || "",
          description: next.description || null,
          price: Number(next.price) || 0,
          external_payment_link: next.external_payment_link || null,
          is_published: !!next.is_published,
          cover_url: next.cover_url || null,
          landing_data: next.landing_data || {},
        });
        setSavingState("saved");
        setTimeout(() => setSavingState(null), 1200);
      } catch (e) {
        setSavingState("error");
      }
    }, 800);
  };

  // Apply wizard output: merges generated title/description/landing_data
  // into the live course state, triggers autosave.
  const applyWizard = (gen) => {
    const next = {
      ...course,
      title: gen.title,
      description: gen.description,
      landing_data: { ...(course.landing_data || {}), ...gen.landing_data },
    };
    updateCourse(next);
  };

  // ---- Lesson autosave (per-lesson debounced)
  const scheduleLessonSave = (lesson) => {
    const tm = lessonTimersRef.current;
    if (tm.get(lesson.id)) clearTimeout(tm.get(lesson.id));
    tm.set(lesson.id, setTimeout(async () => {
      setSavingState("saving");
      try {
        await lessonsApi.update(lesson.id, {
          title: lesson.title || "",
          body: lesson.body || null,
          media_url: lesson.media_url || null,
          is_preview: !!lesson.is_preview,
        });
        setSavingState("saved");
        setTimeout(() => setSavingState(null), 1200);
      } catch (e) {
        setSavingState("error");
      }
    }, 700));
  };

  const updateLesson = (updated) => {
    setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    markDraftDirty();
    if (typeof updated.id === "string" && updated.id.startsWith("temp-")) return; // not persisted yet
    scheduleLessonSave(updated);
  };

  // ---- Add lesson
  const addLesson = async () => {
    setSavingState("saving");
    try {
      const r = await lessonsApi.create({
        course_id: id,
        title: "Nuova lezione",
        body: "",
        is_preview: lessons.length === 0,  // first one defaults to preview
        position: lessons.length,
      });
      const newLesson = r.lesson;
      setLessons((prev) => [...prev, newLesson]);
      setActiveLessonId(newLesson.id);
      markDraftDirty();
      setSavingState("saved");
      setTimeout(() => setSavingState(null), 1200);
    } catch (e) {
      setSavingState("error");
      alert(e.message);
    }
  };

  // ---- Delete lesson
  const deleteLesson = async (lesson) => {
    if (!confirm(`Eliminare la lezione "${lesson.title}"?`)) return;
    try {
      await lessonsApi.remove(lesson.id);
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
      if (activeLessonId === lesson.id) {
        const remaining = lessons.filter((l) => l.id !== lesson.id);
        setActiveLessonId(remaining[0]?.id || null);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // ---- Reorder (drag & drop)
  const reorderLessons = async (items) => {
    setLessons(items);
    markDraftDirty();
    // Persist new positions
    setSavingState("saving");
    try {
      await Promise.all(items.map((l, i) =>
        l.position !== i ? lessonsApi.update(l.id, { position: i }) : null
      ).filter(Boolean));
      setSavingState("saved");
      setTimeout(() => setSavingState(null), 1200);
    } catch (e) {
      setSavingState("error");
    }
  };

  if (isLoadingAuth || loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <a href="/dashboard" className="text-primary text-sm hover:underline">← Torna alla dashboard</a>
      </div>
    );
  }
  if (!course) return null;

  const activeLesson = lessons.find((l) => l.id === activeLessonId);

  return (
    <div className="flex flex-col h-screen">
      <CourseSettings
        course={course}
        onChange={updateCourse}
        savingState={savingState}
        onOpenWizard={() => setShowWizard(true)}
      />
      <div className="flex flex-1 min-h-0">
        <LessonSidebar
          lessons={lessons}
          activeLessonId={activeLessonId}
          onSelect={setActiveLessonId}
          onAdd={addLesson}
          onReorder={reorderLessons}
        />
        {activeLesson ? (
          <LessonEditor
            key={activeLesson.id}
            lesson={activeLesson}
            onChange={updateLesson}
            onDelete={() => deleteLesson(activeLesson)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Aggiungi la prima lezione dalla colonna a sinistra
          </div>
        )}
        <LessonPreview lesson={activeLesson} />
      </div>

      {showWizard && (
        <CourseBuilderWizard
          onClose={() => setShowWizard(false)}
          onApply={applyWizard}
        />
      )}

      {savePaymentPrompt && (
        <SavePaymentLinkPrompt
          link={savePaymentPrompt.link}
          onClose={() => setSavePaymentPrompt(null)}
          onConfirm={async () => {
            try {
              await supabase
                .from("creator_profiles")
                .upsert({ user_id: user.id, external_payment_link: savePaymentPrompt.link });
              setProfileDefaultPaymentLink(savePaymentPrompt.link);
            } catch (err) {
              alert("Errore salvataggio link nel profilo: " + (err.message || err));
            } finally {
              setSavePaymentPrompt(null);
            }
          }}
        />
      )}
    </div>
  );
}

function SavePaymentLinkPrompt({ link, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-lg mb-2">Vuoi salvare questo link nel tuo profilo?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Lo useremo come default su tutti i prossimi corsi che pubblichi — niente più re-inserimento manuale.
          Puoi sempre cambiarlo per singolo corso.
        </p>
        <div className="bg-secondary/40 rounded-lg px-3 py-2 mb-4 text-xs font-mono break-all">
          {link}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary text-sm font-semibold"
          >
            No, solo per questo corso
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold"
          >
            Sì, salva nel profilo
          </button>
        </div>
      </div>
    </div>
  );
}
