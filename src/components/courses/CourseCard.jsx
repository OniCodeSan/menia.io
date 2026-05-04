import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, Play, BookOpen } from "lucide-react";

// Reusable course card. variant="default" (grid item) | "featured" (hero card).
export default function CourseCard({ course, index = 0, variant = "default", showCreator = true }) {
  if (variant === "featured") return <FeaturedCard course={course} showCreator={showCreator} />;
  return <DefaultCard course={course} index={index} showCreator={showCreator} />;
}

function DefaultCard({ course, index, showCreator }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/courses/${course.id}`}
        className="group block bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/40 transition-colors h-full"
      >
        <div className="aspect-[16/9] relative overflow-hidden">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary via-primary/70 to-accent/80 flex items-end p-4 relative transition-transform duration-500 group-hover:scale-105">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-background/15 blur-xl" />
              <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full bg-foreground/10 blur-xl" />
              <p className="relative font-heading text-base font-bold text-background line-clamp-3 leading-tight max-w-[90%]">
                {course.title}
              </p>
            </div>
          )}

          {/* Hover overlay: darken + Play icon + meta-info reveal */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-background/95 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-card">
              <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
            </div>
          </div>

          {/* Meta-info reveal in basso (visibile solo on hover) */}
          {(course.lesson_count != null || course.has_preview) && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-foreground/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-background">
                {course.lesson_count != null && (
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {course.lesson_count} lezion{course.lesson_count === 1 ? "e" : "i"}
                  </span>
                )}
                {course.has_preview && (
                  <span className="inline-flex items-center gap-1 text-chart-3">
                    <Play className="w-3 h-3 fill-current" /> Anteprima
                  </span>
                )}
              </div>
            </div>
          )}

          {course.student_count > 0 && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-chart-3/20 text-chart-3 border border-chart-3/30 backdrop-blur">
              <Users className="w-3 h-3" /> {course.student_count} student{course.student_count === 1 ? "e" : "i"}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-heading font-bold text-base line-clamp-2 leading-snug">{course.title}</h3>
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            {showCreator ? (
              <div className="flex items-center gap-2 text-xs min-w-0">
                {course.creator?.avatar_url ? (
                  <img src={course.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex-shrink-0" />
                )}
                <span className="text-muted-foreground truncate">{course.creator?.full_name || "Creator"}</span>
              </div>
            ) : <span />}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
              {Number(course.price) > 0 ? "Incluso" : "Gratis"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function FeaturedCard({ course }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="block bg-card border-2 border-primary/40 rounded-2xl overflow-hidden hover:border-primary/60 transition-all glow-primary"
    >
      <div className="grid md:grid-cols-[2fr_3fr]">
        <div className="aspect-[16/9] md:aspect-auto bg-secondary/40 relative">
          {course.cover_url ? (
            <img src={course.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[200px]">
              <GraduationCap className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary text-primary-foreground">
            In evidenza
          </span>
        </div>
        <div className="p-6 flex flex-col justify-center space-y-3">
          <h3 className="font-heading font-bold text-2xl leading-tight">{course.title}</h3>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
          )}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {Number(course.price) > 0 ? "Incluso nell'abbonamento Menia" : "Gratis"}
            </span>
            {course.student_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-chart-3">
                <Users className="w-3.5 h-3.5" /> {course.student_count} student{course.student_count === 1 ? "e" : "i"}
              </span>
            )}
          </div>
          <span className="inline-block text-sm font-semibold text-primary">
            Scopri cosa imparerai →
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatPrice(p) {
  return Number(p).toFixed(2).replace(/\.00$/, "");
}
