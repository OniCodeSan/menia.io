import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, GraduationCap, Users, MessageCircle, Sparkles, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { creatorsApi, communityApi, kpiApi } from "@/lib/api";
import CourseCard from "@/components/courses/CourseCard";
import { useAuth } from "@/lib/AuthContext";

export default function CreatorProfile() {
  const { handle } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const previewAsFan = searchParams.get("preview") === "fan";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    creatorsApi.get(handle)
      .then((r) => {
        setData(r);
        if (r.creator?.id) kpiApi.trackView("profile", r.creator.id);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (err || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm text-destructive">{err || "Creator non trovato"}</p>
        <Link to="/" className="text-sm text-primary hover:underline mt-2 inline-block">← Home</Link>
      </div>
    );
  }
  const { creator, courses, counts } = data;
  const featuredCourse = courses?.[0];
  const restCourses = courses?.slice(1) || [];
  const isRealOwner = user?.id === creator.id;
  const isOwnProfile = isRealOwner && !previewAsFan;

  const exitPreview = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("preview");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {isRealOwner && previewAsFan && (
        <div className="sticky top-14 z-30 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Eye className="w-4 h-4" />
            <span>Stai vedendo il tuo profilo come lo vede un fan. Bottoni di gestione e contenuti riservati nascosti.</span>
          </div>
          <Button size="sm" variant="outline" onClick={exitPreview} className="flex-shrink-0">
            <X className="w-3.5 h-3.5 mr-1" /> Esci
          </Button>
        </div>
      )}

      {/* COVER + AVATAR */}
      <div className="relative">
        <div className="h-44 md:h-56 rounded-b-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-secondary/40 to-accent/20">
          {creator.cover_image_url && (
            <img src={creator.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-4 md:px-6 -mt-12">
          <div className="flex items-end gap-4">
            {creator.profile_image_url ? (
              <img
                src={creator.profile_image_url}
                alt={creator.channel_name}
                className="w-24 h-24 rounded-2xl border-4 border-background object-cover bg-card"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-background bg-primary/15 flex items-center justify-center text-primary font-bold text-3xl">
                {(creator.channel_name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 pb-2 min-w-0">
              <h1 className="font-heading text-2xl md:text-3xl font-bold truncate">{creator.channel_name}</h1>
              <p className="text-xs text-muted-foreground">@{creator.handle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BIO + CTA */}
      <section className="px-4 md:px-6 mt-5 mb-8">
        {creator.bio ? (
          <p className="text-sm md:text-base whitespace-pre-wrap max-w-2xl mb-4 leading-relaxed">{creator.bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic mb-4">
            {isOwnProfile ? "Aggiungi una bio per raccontarti agli studenti." : "Il creator non ha ancora aggiunto una bio."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!isOwnProfile && (
            <Link to="/messages" state={{
              openConversation: { id: creator.id, name: creator.channel_name, avatar: creator.profile_image_url, role: "creator" },
            }}>
              <Button variant="outline">
                <MessageCircle className="w-4 h-4 mr-1.5" /> Scrivi un messaggio
              </Button>
            </Link>
          )}
          {courses?.length > 0 && (
            <a href="#corsi" className="text-sm font-semibold text-primary hover:underline">
              {counts.courses} cors{counts.courses === 1 ? "o" : "i"} ↓
            </a>
          )}
        </div>
      </section>

      {/* CORSI */}
      <section id="corsi" className="px-4 md:px-6 mb-12">
        <div className="flex items-center gap-2 mb-5">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-xl">Corsi</h2>
        </div>

        {!courses?.length ? (
          <EmptyState
            icon={GraduationCap}
            title={isOwnProfile ? "Nessun corso pubblicato" : "Questo creator sta preparando nuovi contenuti"}
            text={isOwnProfile ? "Pubblica il primo corso dalla tua dashboard." : "Torna a trovarlo a breve."}
            cta={isOwnProfile ? { label: "Vai alla dashboard", to: "/dashboard" } : null}
          />
        ) : (
          <>
            {featuredCourse && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                <CourseCard course={featuredCourse} variant="featured" />
              </motion.div>
            )}
            {restCourses.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {restCourses.map((c, i) => (
                  <CourseCard key={c.id} course={c} index={i} showCreator={false} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* COMMUNITY (light) */}
      <section className="px-4 md:px-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-chart-3" />
          <h2 className="font-heading font-bold text-xl">Community</h2>
        </div>
        <CreatorCommunity creatorId={creator.id} isOwner={isOwnProfile} previewAsFan={isRealOwner && previewAsFan} />
      </section>
    </div>
  );
}

function CreatorCommunity({ creatorId, isOwner, previewAsFan = false }) {
  const [data, setData] = useState({ posts: [], is_subscribed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.list(creatorId, { limit: 5 })
      .then(setData)
      .finally(() => setLoading(false));
  }, [creatorId]);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;

  // In fan-preview mode the API still returns subscribers-only posts (the
  // requester is the creator) — filter them out so the preview matches what
  // an unsubscribed fan would actually see.
  const visiblePosts = previewAsFan
    ? (data.posts || []).filter((p) => !p.is_subscribers_only)
    : (data.posts || []);
  const subscribed = previewAsFan ? false : data.is_subscribed;

  if (!subscribed && !isOwner) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <p className="text-sm font-semibold mb-1">Community privata</p>
        <p className="text-xs text-muted-foreground mb-3">
          Alcuni post sono riservati agli iscritti. Per accedere, contatta il creator: una volta concordato l'abbonamento, il team Menia abiliterà l'accesso al tuo account.
        </p>
        <Link to="/messages" className="text-xs font-semibold text-primary hover:underline">Contatta il creator →</Link>
      </div>
    );
  }

  if (visiblePosts.length === 0) {
    return <EmptyState icon={Users} title="Ancora nessun post" text="La community è appena nata." />;
  }

  return (
    <div className="space-y-3">
      {visiblePosts.map((p) => (
        <div key={p.id} className="bg-card border border-border/30 rounded-2xl p-4">
          {p.title && <h3 className="font-heading font-bold mb-1">{p.title}</h3>}
          {p.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{p.body}</p>}
          {p.is_subscribers_only && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-primary">Solo abbonati</span>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, cta }) {
  return (
    <div className="bg-secondary/20 border border-border/20 rounded-2xl p-8 text-center">
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
      <p className="font-heading font-bold mb-1">{title}</p>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {cta && (
        <Link to={cta.to} className="inline-block mt-3">
          <Button size="sm" variant="outline">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> {cta.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
