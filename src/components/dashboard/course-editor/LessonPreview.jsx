import { Eye } from "lucide-react";
import { safeLessonHtml } from "@/lib/safeHtml";

export default function LessonPreview({ lesson }) {
  if (!lesson) return null;
  const isVideo = /\.(mp4|webm|mov)/i.test(lesson.media_url || "");

  return (
    <aside className="w-96 bg-secondary/20 border-l border-border/30 overflow-y-auto hidden lg:block">
      <div className="p-4 border-b border-border/30 flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anteprima studente</p>
      </div>
      <div className="p-4 space-y-3">
        <h2 className="font-heading font-bold text-lg">{lesson.title || "Senza titolo"}</h2>
        {lesson.media_url && (
          <div className="rounded-xl overflow-hidden bg-card">
            {isVideo ? (
              <video src={lesson.media_url} controls className="w-full" />
            ) : (
              <img src={lesson.media_url} alt="" className="w-full" />
            )}
          </div>
        )}
        {lesson.body ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: safeLessonHtml(lesson.body) }}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">Nessun contenuto.</p>
        )}
        {lesson.is_preview && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-chart-3/15 text-chart-3 border border-chart-3/30">Anteprima gratuita</span>
        )}
      </div>
    </aside>
  );
}
