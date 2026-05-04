import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Eye, Copy, Check, GraduationCap, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function CourseList({ courses = [], onEdit, onDelete }) {
  if (courses.length === 0) {
    return (
      <section>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Corsi</h2>
        <div className="bg-card border border-border/30 rounded-2xl p-8 text-center">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nessun corso ancora. Crea il primo dal pulsante in alto.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Corsi</h2>
      <div className="space-y-2">
        {courses.map((c) => (
          <CourseItem key={c.id} course={c} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
        ))}
      </div>
    </section>
  );
}

function CourseItem({ course, onEdit, onDelete }) {
  const [students, setStudents] = useState(null);
  const [lessonCount, setLessonCount] = useState(null);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/courses/${course.id}`;

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async (retry = false) => {
      const { count, error, status } = await supabase
        .from("course_access")
        .select("course_id", { count: "exact", head: true })
        .eq("course_id", course.id);
      if (cancelled) return;
      if (status === 503 && !retry) return setTimeout(() => fetchCount(true), 800);
      if (error) return;
      setStudents(count || 0);
    };
    const fetchLessons = async () => {
      const { count } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);
      if (!cancelled) setLessonCount(count || 0);
    };
    fetchCount();
    fetchLessons();
    return () => { cancelled = true; };
  }, [course.id]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg bg-secondary/40 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {course.cover_url
          ? <img src={course.cover_url} alt="" className="w-full h-full object-cover" />
          : <GraduationCap className="w-6 h-6 text-muted-foreground/40" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-bold text-sm truncate">{course.title}</h3>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${course.is_published ? "bg-chart-3/15 text-chart-3" : "bg-secondary/60 text-muted-foreground"}`}>
            {course.is_published ? "Pubblico" : "Bozza"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          {lessonCount !== null && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {lessonCount} lezion{lessonCount === 1 ? "e" : "i"}
            </span>
          )}
          {students !== null && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {students} iscritt{students === 1 ? "o" : "i"}
            </span>
          )}
          {Number(course.price) > 0 && (
            <span className="text-muted-foreground/70" title="Prezzo per vendita diretta (fuori abbonamento)">
              €{Number(course.price).toFixed(2).replace(/\.00$/, "")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={copy} title="Copia link">
          {copied ? <Check className="w-3.5 h-3.5 text-chart-3" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <Link to={`/courses/${course.id}`}>
          <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
        </Link>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}
