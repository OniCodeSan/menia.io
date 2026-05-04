import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import useSubscription from "@/hooks/useSubscription";

export default function FanDashboard() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { sub, isActive, trialDaysLeft, daysToRenewal, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (!isLoadingAuth && !user) navigate("/student-login", { replace: true });
  }, [isLoadingAuth, user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase.from("course_access").select("course_id, courses(*)").eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setCourses((data || []).map((r) => r.courses).filter(Boolean));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (isLoadingAuth || !user) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const subBadge = isActive
    ? sub?.status === "trial"
      ? { label: `Trial gratuito — ${trialDaysLeft ?? 0} giorni rimasti`, sublabel: "Hai accesso a tutti i corsi pubblicati" }
      : { label: "Abbonamento attivo", sublabel: daysToRenewal != null ? `Rinnovo tra ${daysToRenewal} giorni` : "Hai accesso completo alla piattaforma" }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Il mio account</h1>
        <p className="text-sm text-muted-foreground">I tuoi corsi e abbonamento</p>
      </div>

      <Section
        title="I miei corsi"
        icon={GraduationCap}
        empty={
          <EmptyWithCta
            msg={isActive
              ? "Con il tuo abbonamento Menia hai accesso a tutti i corsi pubblicati."
              : "Nessun corso ancora."}
            href="/courses"
            cta={isActive ? "Sfoglia i corsi" : "Esplora i corsi"}
          />
        }
      >
        {courses.map((c) => (
          <Link key={c.id} to={`/courses/${c.id}`} className="bg-card border border-border/30 rounded-2xl p-4 hover:border-primary/40 transition-colors">
            <h3 className="font-heading font-bold text-sm">{c.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
          </Link>
        ))}
      </Section>

      <section>
        <h2 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Abbonamento
        </h2>
        {subLoading ? (
          <div className="bg-card border border-border/30 rounded-2xl p-4 h-20 animate-pulse" />
        ) : subBadge ? (
          <div className="bg-card border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm">Menia Studente</p>
              <p className="text-xs text-primary mt-0.5">{subBadge.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{subBadge.sublabel}</p>
            </div>
            <Link to="/billing" className="shrink-0 text-xs text-primary hover:underline inline-flex items-center gap-1">
              Gestisci <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <EmptyWithCta msg="Nessun abbonamento attivo." href="/pricing" cta="Attiva l'abbonamento — €0,99/mese" />
        )}
      </section>
    </div>
  );
}

function Section({ title, icon: Icon, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section>
      <h2 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" /> {title}
      </h2>
      {items.length === 0 ? empty : <div className="grid sm:grid-cols-2 gap-3">{children}</div>}
    </section>
  );
}

function EmptyWithCta({ msg, href, cta }) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{msg}</p>
      <Link to={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        {cta} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
