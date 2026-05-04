import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Search, X, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import CourseCard from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

// Login wall: utenti anonimi vedono solo i primi N corsi del catalogo,
// poi un overlay invita al signup. I loggati vedono tutto.
const ANON_PREVIEW_LIMIT = 4;

const SORT_OPTIONS = [
  { id: "ranking", label: "Più popolari" },
  { id: "recent",  label: "Più recenti" },
];

function CourseCardSkeleton() {
  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-secondary/40" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-secondary/60 rounded w-3/4" />
        <div className="h-3 bg-secondary/40 rounded w-full" />
        <div className="h-3 bg-secondary/40 rounded w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-3 w-24 bg-secondary/40 rounded" />
          <div className="h-5 w-16 bg-secondary/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ranking");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/courses?sort=${sort}&limit=50`)
      .then((r) => r.json())
      .then((r) => setCourses(r.courses || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [sort]);

  const filtered = useMemo(() => {
    if (!query.trim()) return courses;
    const q = query.trim().toLowerCase();
    return courses.filter((c) =>
      (c.title || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.creator?.full_name || "").toLowerCase().includes(q)
    );
  }, [courses, query]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <GraduationCap className="w-7 h-7 text-primary" />
        <div>
          <h1 className="font-heading text-2xl font-bold">Corsi</h1>
          <p className="text-sm text-muted-foreground">Formazione e competenze dai formatori Menia</p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un corso per titolo, descrizione o formatore…"
            className="w-full h-11 pl-9 pr-9 rounded-xl bg-secondary/40 border border-border/40 text-sm outline-none focus:border-primary/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Pulisci ricerca"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 px-3 rounded-xl bg-secondary/40 border border-border/40 text-sm outline-none focus:border-primary/50"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : err ? (
        <p className="text-sm text-destructive py-8 text-center">{err}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {query ? `Nessun corso trovato per "${query}".` : "Nessun corso pubblicato."}
          </p>
        </div>
      ) : (
        <>
          {query && (
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} risultat{filtered.length === 1 ? "o" : "i"} per "{query}"
            </p>
          )}
          {(() => {
            // Login wall: anon vede solo ANON_PREVIEW_LIMIT corsi quando non c'è ricerca attiva
            const showWall = !user && !query && filtered.length > ANON_PREVIEW_LIMIT;
            const displayed = showWall ? filtered.slice(0, ANON_PREVIEW_LIMIT) : filtered;
            const hidden = filtered.length - displayed.length;
            return (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayed.map((c, i) => (
                    <CourseCard key={c.id} course={c} index={i} showCreator={true} />
                  ))}
                </div>
                {showWall && (
                  <div className="mt-6 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6 sm:p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 mx-auto mb-3 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-1">Accedi per vedere altri {hidden} cors{hidden === 1 ? "o" : "i"}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                      Crea un account gratuito: anteprima su ogni corso, niente carta richiesta.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/student-login?mode=register">
                        <Button>
                          Inizia gratis <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                      <Link to="/student-login">
                        <Button variant="ghost">Ho già un account</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
