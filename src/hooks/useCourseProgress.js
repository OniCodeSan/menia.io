import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

// Progress tracker per un singolo corso.
// Ritorna:
//   { completedIds: Set<lesson_id>, percent, markComplete, unmarkComplete, loading }
//
// markComplete è idempotent (UNIQUE su user_id+lesson_id evita doppi conteggi).
export function useCourseProgress(courseId, totalLessons) {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !courseId) { setLoading(false); return; }
    let cancelled = false;
    supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .then(({ data }) => {
        if (cancelled) return;
        setCompletedIds(new Set((data || []).map((r) => r.lesson_id)));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, courseId]);

  const markComplete = useCallback(async (lessonId) => {
    if (!user?.id || !courseId || !lessonId) return;
    // Optimistic
    setCompletedIds((prev) => {
      if (prev.has(lessonId)) return prev;
      const next = new Set(prev);
      next.add(lessonId);
      return next;
    });
    const { error } = await supabase
      .from("lesson_completions")
      .upsert({ user_id: user.id, lesson_id: lessonId, course_id: courseId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    if (error && error.code !== "23505") {
      // rollback su errore non-duplicate
      console.warn("[lesson-progress] mark failed", error.message);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  }, [user?.id, courseId]);

  const unmarkComplete = useCallback(async (lessonId) => {
    if (!user?.id || !courseId || !lessonId) return;
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(lessonId);
      return next;
    });
    await supabase
      .from("lesson_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);
  }, [user?.id, courseId]);

  const percent = totalLessons > 0
    ? Math.round((completedIds.size / totalLessons) * 100)
    : 0;

  return { completedIds, percent, markComplete, unmarkComplete, loading };
}

// Progress aggregato per FanDashboard: ritorna { courseId: { completed, total, lastAt } }
// per tutti i corsi a cui l'utente ha accesso. Usato per "Continua da dove eri".
export function useStudentProgress(courseIds) {
  const { user } = useAuth();
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !courseIds?.length) { setLoading(false); return; }
    let cancelled = false;

    Promise.all([
      // Tutte le completion dell'utente sui corsi indicati
      supabase
        .from("lesson_completions")
        .select("course_id, lesson_id, completed_at")
        .eq("user_id", user.id)
        .in("course_id", courseIds)
        .order("completed_at", { ascending: false }),
      // Lessons totali per corso
      supabase
        .from("course_lessons")
        .select("id, course_id")
        .in("course_id", courseIds),
    ]).then(([compRes, lessonRes]) => {
      if (cancelled) return;
      const byCourse = {};
      courseIds.forEach((cid) => {
        byCourse[cid] = { completed: 0, total: 0, lastAt: null };
      });
      (lessonRes.data || []).forEach((l) => {
        if (byCourse[l.course_id]) byCourse[l.course_id].total += 1;
      });
      (compRes.data || []).forEach((c) => {
        if (!byCourse[c.course_id]) return;
        byCourse[c.course_id].completed += 1;
        if (!byCourse[c.course_id].lastAt) {
          byCourse[c.course_id].lastAt = c.completed_at;
        }
      });
      setProgress(byCourse);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.id, JSON.stringify(courseIds)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { progress, loading };
}
