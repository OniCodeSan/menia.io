import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";

// FeaturedCreators — top creator per visibility_score (proxy server-side
// per "qualità di engagement"), arricchiti con i campi vetrina di
// creator_profiles. Niente curatela manuale finché non c'è un campo
// `is_featured` dedicato — il ranking algoritmico è sufficiente per ora.
export default function FeaturedCreators() {
  const [creators, setCreators] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Step 1: top 6 creator per visibility_score
      const { data: kpiRows } = await supabase
        .from("creator_kpi_aggregated")
        .select("creator_id, total_courses, total_students, visibility_score")
        .gt("total_courses", 0)
        .order("visibility_score", { ascending: false })
        .limit(6);

      if (cancelled || !kpiRows?.length) {
        if (!cancelled) setCreators([]);
        return;
      }
      const ids = kpiRows.map((r) => r.creator_id);
      const [profRes, extraRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, handle, avatar_url").in("id", ids),
        supabase.from("creator_profiles").select("user_id, channel_name, profile_image_url, bio").in("user_id", ids),
      ]);
      const byId = {};
      (profRes.data || []).forEach((p) => { byId[p.id] = { ...byId[p.id], profile: p }; });
      (extraRes.data || []).forEach((e) => { byId[e.user_id] = { ...byId[e.user_id], extra: e }; });

      const merged = kpiRows
        .map((k) => {
          const p = byId[k.creator_id]?.profile;
          if (!p) return null;
          const e = byId[k.creator_id]?.extra;
          return {
            id: k.creator_id,
            handle: p.handle || k.creator_id.slice(0, 8),
            name: e?.channel_name || p.full_name || "Creator",
            avatar: e?.profile_image_url || p.avatar_url || null,
            bio: (e?.bio || "").trim(),
            courses: k.total_courses || 0,
            students: k.total_students || 0,
          };
        })
        .filter(Boolean)
        .slice(0, 4);
      if (!cancelled) setCreators(merged);
    })().catch(() => { if (!cancelled) setCreators([]); });
    return () => { cancelled = true; };
  }, []);

  // Filtro qualità: solo formatori con avatar caricato (niente "C" placeholder).
  // Layout adattivo: 1 → card singolo centrato max-w-sm; 2 → 2-col centrato;
  // 3+ → griglia 4-col completa. Coerente con l'hero claim "da chi le usa
  // ogni giorno": almeno un volto va sempre mostrato.
  const real = (creators || []).filter((c) => !!c.avatar);
  if (real.length === 0) return null;

  const gridCls =
    real.length === 1 ? "max-w-sm mx-auto" :
    real.length === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto" :
    "grid sm:grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Formatori</p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              Impara da chi lo fa davvero
            </h2>
          </div>
          <Link
            to="/trainer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Scopri tutti i formatori
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className={gridCls}>
          {real.map((c) => (
            <Link
              key={c.id}
              to={`/trainer/${c.handle}`}
              className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                {c.avatar ? (
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-12 h-12 rounded-full object-cover bg-secondary flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    {c.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-heading font-bold text-sm truncate group-hover:text-primary transition-colors">
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{c.handle}</p>
                </div>
              </div>
              {c.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 flex-1">
                  {c.bio}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {c.courses} cors{c.courses === 1 ? "o" : "i"}
                </span>
                {c.students > 0 && (
                  <span>{c.students} student{c.students === 1 ? "e" : "i"}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
