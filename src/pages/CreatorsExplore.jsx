import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

// Pagina di esplorazione formatori. Sorgente: stessa pipeline di
// FeaturedCreators ma senza limite, ordinata per visibility_score.
// Si filtra client-side perché il dataset è piccolo nell'MVP.
export default function CreatorsExplore() {
  const [creators, setCreators] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: kpiRows } = await supabase
        .from("creator_kpi_aggregated")
        .select("creator_id, total_courses, total_students, visibility_score")
        .gt("total_courses", 0)
        .order("visibility_score", { ascending: false })
        .limit(60);
      if (cancelled || !kpiRows?.length) {
        if (!cancelled) setCreators([]);
        return;
      }
      const ids = kpiRows.map((r) => r.creator_id);
      const [profRes, extraRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, handle, avatar_url, bio").in("id", ids),
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
            bio: (e?.bio || p.bio || "").trim(),
            courses: k.total_courses || 0,
            students: k.total_students || 0,
          };
        })
        .filter(Boolean);
      if (!cancelled) setCreators(merged);
    })().catch(() => { if (!cancelled) setCreators([]); });
    return () => { cancelled = true; };
  }, []);

  if (creators === null) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = q
    ? creators.filter((c) =>
        (c.name + " " + c.handle + " " + c.bio).toLowerCase().includes(q.toLowerCase())
      )
    : creators;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Formatori</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-3">
          Scopri chi insegna su Menia
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Professionisti che hanno trasformato esperienza diretta in corsi e community.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome, handle o tema..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Nessun formatore trovato.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/trainer/${c.handle}`}
              className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover bg-secondary flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    {c.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-heading font-bold text-sm truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{c.handle}</p>
                </div>
              </div>
              {c.bio && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3 flex-1">{c.bio}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {c.courses} cors{c.courses === 1 ? "o" : "i"}
                </span>
                {c.students > 0 && <span>{c.students} student{c.students === 1 ? "e" : "i"}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
