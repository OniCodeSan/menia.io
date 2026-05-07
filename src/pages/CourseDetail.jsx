import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  GraduationCap, Loader2, Lock, Play, ExternalLink, CheckCircle2,
  Crown, Users, Target, X, Gift, FileText, Download, Paperclip, User,
  ChevronRight, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { coursesApi, kpiApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { safeLessonHtml } from "@/lib/safeHtml";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { silentReport } from "@/lib/sentry";
import Paywall from "@/components/billing/Paywall";
import SEO from "@/components/shared/SEO";

async function fetchCertificate(courseId) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  try {
    const r = await fetch(`/api/courses/${courseId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 404) return null; // no certificate yet → silent ok
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    silentReport("certificate-fetch")(e);
    return null;
  }
}

export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeLesson, setActiveLesson] = useState(null);
  const [studentCount, setStudentCount] = useState(0);

  // CRITICO: tutti gli hook DEVONO essere chiamati nello stesso ordine ad ogni
  // render — niente hook dopo early return. useCourseProgress accetta courseId
  // null/totalLessons=0 (no-op finché data non è caricato).
  const courseId = data?.course?.id || null;
  const totalLessons = data?.lessons?.length || 0;
  const { completedIds, percent: progressPct, markComplete } = useCourseProgress(
    courseId,
    totalLessons
  );
  const isFullyCompleted = totalLessons > 0 && completedIds.size >= totalLessons;
  const [certificate, setCertificate] = useState(null);
  const [certLoading, setCertLoading] = useState(false);

  // Fetch certificato quando l'utente raggiunge il 100%. Riprova ogni 4s
  // perché il backend lo emette async dopo che il client chiama check-completion.
  useEffect(() => {
    if (!courseId || !isFullyCompleted) { setCertificate(null); return; }
    let cancelled = false;
    setCertLoading(true);
    let attempts = 0;
    const tryFetch = async () => {
      if (cancelled) return;
      const r = await fetchCertificate(courseId);
      if (cancelled) return;
      if (r?.certificate) {
        setCertificate(r);
        setCertLoading(false);
        return;
      }
      attempts++;
      if (attempts < 6) setTimeout(tryFetch, 4000);
      else setCertLoading(false);
    };
    tryFetch();
    return () => { cancelled = true; };
  }, [courseId, isFullyCompleted]);

  useEffect(() => {
    setLoading(true);
    coursesApi.get(id)
      .then((r) => {
        setData(r);
        const firstAccessible = r.lessons?.find((l) => !l.locked);
        if (firstAccessible) setActiveLesson(firstAccessible);
        if (r.course?.creator_id) kpiApi.trackView("course", r.course.creator_id);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Social proof: count enrolled students from `course_access` (one row per
  // granted student) — not visualizations.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const fetchCount = async (retry = false) => {
      const { count, error, status } = await supabase
        .from("course_access")
        .select("course_id", { count: "exact", head: true })
        .eq("course_id", id);
      if (cancelled) return;
      if (status === 503 && !retry) return setTimeout(() => fetchCount(true), 800);
      if (error) return;
      setStudentCount(count || 0);
    };
    fetchCount();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (err || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-destructive">{err || "Corso non trovato"}</p>
        <Link to="/courses" className="text-sm text-primary hover:underline mt-3 inline-block">← Torna ai corsi</Link>
      </div>
    );
  }

  const { course, lessons, creator, has_access, is_owner, access_reason } = data;
  const previewLesson = lessons?.find((l) => l.is_preview && !l.locked);
  // Due tipi di paywall distinti:
  //   - paid: corso a pagamento, serve acquisto via link del formatore
  //   - platform: corso free ma utente senza abbonamento Menia
  const showPaidCoursePaywall = !has_access && !is_owner && access_reason === "paywall_paid";
  const showPlatformPaywall   = !has_access && !is_owner && access_reason === "paywall_platform";
  const landing = course.landing_data || {};
  const outcomes = landing.learning_outcomes || [];
  const targetAudience = landing.target_audience || [];
  const forWhomNot = landing.for_whom_not || [];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      <SEO
        title={course.title}
        description={course.description?.slice(0, 160) || `Corso di ${creator?.channel_name || creator?.full_name || "Menia"}`}
        image={course.cover_url || undefined}
        url={`/courses/${course.id}`}
        type="article"
      />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="pt-5 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" aria-hidden />
        <Link to="/courses" className="hover:text-foreground">Corsi</Link>
        <ChevronRight className="w-3 h-3" aria-hidden />
        <span className="text-foreground font-medium truncate max-w-[60ch]" aria-current="page">{course.title}</span>
      </nav>

      {/* HERO */}
      <section className="pt-4 pb-6">
        {course.cover_url && (
          <div className="rounded-2xl overflow-hidden mb-6 aspect-[21/9] bg-secondary/40">
            <img src={course.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {creator && (
          <Link
            to={`/trainer/${creator.handle || creator.id}`}
            className="inline-flex items-center gap-2.5 mb-3 group"
          >
            {creator.profile_image_url ? (
              <img
                src={creator.profile_image_url}
                alt={creator.channel_name || creator.full_name}
                className="w-9 h-9 rounded-full object-cover bg-secondary/40"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                {(creator.channel_name || creator.full_name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                {creator.full_name || creator.channel_name}
              </p>
              {creator.handle && (
                <p className="text-[11px] text-muted-foreground">@{creator.handle}</p>
              )}
            </div>
          </Link>
        )}
        <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight mb-3">{course.title}</h1>
        {course.description && (
          <p className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed mb-5 max-w-2xl">
            {course.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {Number(course.price) > 0 ? "Incluso nell'abbonamento Menia" : "Gratis"}
          </span>
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <Play className="w-3.5 h-3.5" /> {totalLessons} lezion{totalLessons === 1 ? "e" : "i"}
          </span>
          {studentCount > 0 && (
            <span className="text-sm text-chart-3 inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {studentCount} student{studentCount === 1 ? "e" : "i"}
            </span>
          )}
          {has_access && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-chart-3/15 text-chart-3 border border-chart-3/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hai accesso
            </span>
          )}
          {is_owner && (
            <Link to={`/dashboard/course/${course.id}/edit`}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">
                Tuo corso · modifica
              </span>
            </Link>
          )}
        </div>
        {showPaidCoursePaywall && course.external_payment_link && (
          <a
            href={course.external_payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 glow-primary"
          >
            <Crown className="w-4 h-4" /> Acquista il corso — €{Number(course.price).toFixed(2).replace(/\.00$/, "")}
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {showPaidCoursePaywall && !course.external_payment_link && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-sm">
            <Lock className="w-4 h-4" />
            Corso a pagamento — il formatore non ha ancora configurato il checkout. Contatta il formatore per acquistare.
          </div>
        )}
      </section>

      {showPlatformPaywall && <Paywall courseTitle={course.title} />}

      {/* COSA IMPARERAI */}
      {outcomes.length > 0 && (
        <Section title="Cosa imparerai" icon={Target}>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* PER CHI È / NON È */}
      {(targetAudience.length > 0 || forWhomNot.length > 0) && (
        <Section title="A chi è rivolto">
          <div className="grid sm:grid-cols-2 gap-4">
            {targetAudience.length > 0 && (
              <div className="bg-card border border-border/30 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-chart-3 mb-2">Perfetto se</p>
                <ul className="text-sm space-y-1.5">
                  {targetAudience.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-chart-3 flex-shrink-0 mt-0.5" /> <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {forWhomNot.length > 0 && (
              <div className="bg-card border border-border/30 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Non fa per te se</p>
                <ul className="text-sm space-y-1.5">
                  {forWhomNot.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" /> <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* PREVIEW LEZIONE */}
      {previewLesson && !has_access && !is_owner && (
        <Section title="Guarda una lezione gratuita" icon={Play}>
          <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
            {previewLesson.media_url && (
              <div className="bg-black">
                {/\.(mp4|webm|mov)/i.test(previewLesson.media_url) ? (
                  <video src={previewLesson.media_url} controls className="w-full max-h-[400px] mx-auto" />
                ) : (
                  <img src={previewLesson.media_url} alt="" className="w-full max-h-[400px] object-contain mx-auto" />
                )}
              </div>
            )}
            <div className="p-5 space-y-3">
              <h3 className="font-heading font-bold text-lg">{previewLesson.title}</h3>
              {previewLesson.body && (
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeLessonHtml(previewLesson.body) }} />
              )}
              {showPaidCoursePaywall && course.external_payment_link && (
                <div className="border-t border-border/20 pt-3">
                  <a
                    href={course.external_payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
                  >
                    <Crown className="w-4 h-4" /> Accedi a tutte le {totalLessons} lezioni — €{Number(course.price).toFixed(2).replace(/\.00$/, "")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* OUTLINE LEZIONI */}
      <Section title="Contenuto del corso" icon={GraduationCap}>
        {has_access && lessons?.length > 0 && (
          <div className="mb-3 flex items-center gap-3 text-xs">
            <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
              <div className="h-full bg-chart-3 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              <strong className="text-foreground">{completedIds.size}</strong>/{lessons.length} completate ({progressPct}%)
            </span>
          </div>
        )}

        {/* Banner attestato — appare al 100% completato */}
        {has_access && isFullyCompleted && (
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-300/50 dark:border-amber-700/40 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center text-2xl shrink-0">🎓</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground">
                Hai completato il corso!
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {certificate?.certificate
                  ? `Attestato emesso · ID ${certificate.certificate.certificate_number}`
                  : certLoading
                    ? "Stiamo emettendo il tuo attestato di partecipazione…"
                    : "L'attestato sarà disponibile a breve. Ricarica la pagina tra qualche istante."}
              </div>
            </div>
            {certificate?.download_url && (
              <a
                href={certificate.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica attestato
              </a>
            )}
            {!certificate && certLoading && (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            )}
          </div>
        )}
        <div className="bg-card border border-border/30 rounded-2xl divide-y divide-border/20">
          {lessons?.length ? lessons.map((l, i) => {
            const accessible = !l.locked;
            const isActive = activeLesson?.id === l.id;
            const isDone = completedIds.has(l.id);
            return (
              <button
                key={l.id}
                onClick={() => accessible && setActiveLesson(l)}
                disabled={!accessible}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isActive ? "bg-primary/5" : "hover:bg-secondary/20"
                } ${!accessible ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {isDone ? (
                  <span className="w-8 h-8 rounded-lg bg-chart-3/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-chart-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium truncate">{l.title}</span>
                {l.attachment_count > 0 && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5" title={`${l.attachment_count} materiali`}>
                    <Paperclip className="w-3 h-3" /> {l.attachment_count}
                  </span>
                )}
                {l.is_preview && !has_access && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-chart-3/15 text-chart-3 border border-chart-3/30">
                    Anteprima
                  </span>
                )}
                {accessible ? (
                  <Play className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            );
          }) : (
            <p className="text-sm text-muted-foreground p-4">Nessuna lezione ancora.</p>
          )}
        </div>
      </Section>

      {/* LEZIONE ATTIVA (se has_access) */}
      {has_access && activeLesson && !activeLesson.locked && (
        <Section title={activeLesson.title}>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            {activeLesson.media_url && (
              <div className="mb-4 rounded-xl overflow-hidden bg-black">
                {/\.(mp4|webm|mov)/i.test(activeLesson.media_url) ? (
                  <video src={activeLesson.media_url} controls className="w-full" />
                ) : (
                  <img src={activeLesson.media_url} alt="" className="w-full" />
                )}
              </div>
            )}
            {activeLesson.body && (
              <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeLessonHtml(activeLesson.body) }} />
            )}
            {/* Mark complete CTA — visible solo se non già completata */}
            {!completedIds.has(activeLesson.id) && (
              <div className="mt-5 pt-5 border-t border-border/20 flex justify-end">
                <Button size="sm" onClick={() => markComplete(activeLesson.id)}>
                  <Check className="w-4 h-4 mr-1.5" /> Marca come completata
                </Button>
              </div>
            )}
            {completedIds.has(activeLesson.id) && (
              <div className="mt-5 pt-5 border-t border-border/20 flex items-center gap-2 text-xs text-chart-3">
                <CheckCircle2 className="w-4 h-4" />
                Lezione completata
              </div>
            )}
            {activeLesson.attachments?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 inline-flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Materiali della lezione
                </p>
                <ul className="space-y-2">
                  {activeLesson.attachments.map((a, i) => (
                    <li key={i}>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={a.name}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/40 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {labelDocMime(a.mime)} · {formatSize(a.size)}
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* BONUS */}
      {landing.bonus && (
        <Section title="Bonus inclusi" icon={Gift}>
          <div className="bg-chart-4/5 border border-chart-4/30 rounded-2xl p-5">
            <p className="text-sm whitespace-pre-wrap">{landing.bonus}</p>
          </div>
        </Section>
      )}

      {/* RELATORE */}
      {creator && (
        <Section title="Il relatore" icon={User}>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <Link
              to={`/trainer/${creator.handle || creator.id}`}
              className="flex items-center gap-3 mb-3 group"
            >
              {creator.profile_image_url ? (
                <img
                  src={creator.profile_image_url}
                  alt={creator.channel_name || creator.full_name}
                  className="w-14 h-14 rounded-2xl object-cover bg-secondary/40 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {(creator.channel_name || creator.full_name || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-heading font-bold text-base group-hover:text-primary transition-colors truncate">
                  {creator.full_name || creator.channel_name}
                </p>
                {creator.handle && (
                  <p className="text-xs text-muted-foreground">@{creator.handle}</p>
                )}
              </div>
            </Link>
            {creator.bio ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {creator.bio}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Il relatore non ha ancora aggiunto una bio.
              </p>
            )}
            <Link
              to={`/trainer/${creator.handle || creator.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-3"
            >
              Vai al profilo del relatore →
            </Link>
          </div>
        </Section>
      )}

      {/* PREZZO + CTA FINALE */}
      {showPaidCoursePaywall && course.external_payment_link && (
        <section className="my-10 text-center bg-primary/5 border border-primary/20 rounded-2xl p-8">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Pronto a iniziare?</p>
          <p className="font-heading text-4xl font-bold text-primary mb-4">
            €{Number(course.price).toFixed(2).replace(/\.00$/, "")}
          </p>
          <a
            href={course.external_payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 glow-primary"
          >
            Accedi al corso completo <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-muted-foreground mt-3">Pagamento sicuro tramite il provider del creator</p>
        </section>
      )}
    </div>
  );
}

function labelDocMime(mime) {
  return ({
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "application/zip": "ZIP",
    "application/x-zip-compressed": "ZIP",
    "text/plain": "Testo",
    "text/csv": "CSV",
    "application/json": "JSON",
  }[mime] || "File");
}

function formatSize(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="my-8">
      <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
