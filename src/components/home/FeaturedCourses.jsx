import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { coursesApi } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import CourseCard from "@/components/courses/CourseCard";

// Top 3 corsi per ranking (visibility_score + freshness, già ordinato dall'API).
// Nasconde la sezione se non ci sono ancora corsi pubblicati — niente skeleton
// vuoto da landing page MVP.
export default function FeaturedCourses() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    coursesApi.list({ sort: "ranking", limit: 3 })
      .then((r) => setCourses(r.courses || []))
      .catch(() => setCourses([]));
  }, []);

  if (courses === null) {
    return (
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }
  if (courses.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
              {t.featuredCourses?.label || "Corsi in evidenza"}
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              {t.featuredCourses?.title || "Cosa stanno imparando gli altri studenti"}
            </h2>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t.featuredCourses?.cta || "Vedi tutti i corsi"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c, i) => (
            <CourseCard key={c.id} course={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
