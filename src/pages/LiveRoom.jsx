import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, Send, Users, Radio, Square, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { liveEventsApi } from "@/lib/api";

// Carica external_api.js di Jitsi una sola volta (cached). L'iframe API
// permette di embedare la stanza dentro la nostra pagina invece di mandare
// l'utente fuori site.
function loadJitsiApi(domain) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", () => reject(new Error("Jitsi API load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "jitsi-external-api";
    s.src = `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Jitsi API load failed"));
    document.body.appendChild(s);
  });
}

// Live chat-room interna.
// - Chat real-time via Supabase Realtime postgres_changes su live_chat_messages
// - Viewer count via Realtime presence (track join/leave automatico, no DB)
// - Niente video: la live è un'esperienza testuale sincrona col formatore
export default function LiveRoom() {
  const { id } = useParams();
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const listRef = useRef(null);

  const isOwner = user?.id && event?.creator_id === user.id;
  const isLive  = event?.status === "live";

  // ---- Jitsi video iframe (montato solo quando live attiva e utente autenticato)
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const [jitsiErr, setJitsiErr] = useState("");
  const [jitsiTk, setJitsiTk] = useState(null);
  const externalLiveUrl = jitsiTk ? `https://${jitsiTk.domain}/${encodeURIComponent(jitsiTk.room)}?jwt=${encodeURIComponent(jitsiTk.token)}#config.prejoinPageEnabled=false` : null;

  useEffect(() => {
    let cancelled = false;
    let api = null;

    async function start() {
      if (!isLive || !user || !event?.id) return;
      try {
        const tk = await liveEventsApi.joinToken(event.id);
        if (cancelled) return;
        setJitsiTk(tk);
        if (!jitsiContainerRef.current) return;
        await loadJitsiApi(tk.domain);
        if (cancelled) return;

        // Cleanup eventuale istanza precedente
        if (jitsiApiRef.current) { try { jitsiApiRef.current.dispose(); } catch {} }
        jitsiContainerRef.current.innerHTML = "";

        api = new window.JitsiMeetExternalAPI(tk.domain, {
          roomName: tk.room,
          parentNode: jitsiContainerRef.current,
          jwt: tk.token,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: user.full_name || user.email || "Utente",
            email: user.email || "",
          },
          configOverwrite: {
            startWithAudioMuted: tk.role !== "moderator",
            startWithVideoMuted: tk.role !== "moderator",
            prejoinPageEnabled: false,
            disableInviteFunctions: true,
            disableProfile: true,
            // Per gli studenti, niente camera/mic prompts
            ...(tk.role !== "moderator" ? {
              startAudioOnly: false,
              readOnlyName: true,
            } : {}),
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: "#0F172A",
            TOOLBAR_BUTTONS: tk.role === "moderator"
              ? [
                  "microphone","camera","desktop","fullscreen","fodeviceselection",
                  "hangup","profile","settings","raisehand","tileview","mute-everyone",
                  "security",
                ]
              : ["fullscreen","fodeviceselection","hangup","raisehand","tileview"],
          },
        });

        jitsiApiRef.current = api;

        api.addListener("readyToClose", () => {
          // Quando l'utente lascia la stanza, riportiamolo alla home della live
          if (jitsiApiRef.current) { try { jitsiApiRef.current.dispose(); } catch {} jitsiApiRef.current = null; }
        });
      } catch (e) {
        if (!cancelled) setJitsiErr(e.message || "Errore caricamento video");
      }
    }
    start();

    return () => {
      cancelled = true;
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch {}
        jitsiApiRef.current = null;
      }
    };
  }, [isLive, user, event?.id]);

  // ---- Initial load: event + creator + chat history
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: ev, error: evErr } = await supabase
          .from("live_events")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (evErr) throw evErr;
        if (!ev) { setErr("Live non trovata"); setLoading(false); return; }
        if (cancelled) return;
        setEvent(ev);

        const [{ data: prof }, { data: extra }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, handle, avatar_url").eq("id", ev.creator_id).maybeSingle(),
          supabase.from("creator_profiles").select("channel_name, profile_image_url").eq("user_id", ev.creator_id).maybeSingle(),
        ]);
        if (cancelled) return;
        setCreator({
          id: prof?.id,
          handle: prof?.handle,
          name: extra?.channel_name || prof?.full_name || "Creator",
          avatar: extra?.profile_image_url || prof?.avatar_url || null,
        });

        // Chat history (RLS filtra per accesso utente)
        const { data: msgs } = await supabase
          .from("live_chat_messages")
          .select("id, user_id, message, type, created_at")
          .eq("live_id", id)
          .order("created_at", { ascending: true })
          .limit(200);
        if (!cancelled) setMessages(msgs || []);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ---- Realtime subscription: new chat messages + event status
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${id}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_events", filter: `id=eq.${id}` },
        (payload) => setEvent(payload.new)
      );

    // Presence (viewer count): trackiamo solo l'utente loggato per evitare
    // di spoofare la count dagli anonimi. Per anonimi conta lo userId 'guest'.
    if (user) {
      channel.on("presence", { event: "sync" }, () => {
        setParticipants(channel.presenceState());
      });
    }

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && user) {
        await channel.track({
          user_id: user.id,
          name: user.full_name || user.email,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const viewerCount = Object.keys(participants).length || 0;

  const send = async () => {
    if (!user) { navigate("/student-login"); return; }
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // Optimistic? No: aspettiamo l'echo via Realtime per mantenere la verità
      // server-side (anti-flood + sanitization).
      await liveEventsApi.chat(id, text);
      setDraft("");
    } catch (e) {
      setErr(e.message);
      setTimeout(() => setErr(""), 3000);
    } finally {
      setSending(false);
    }
  };

  const startLive = useCallback(async () => {
    setActionBusy(true);
    try {
      const r = await liveEventsApi.start(id);
      setEvent(r.event);
    } catch (e) { setErr(e.message); }
    finally { setActionBusy(false); }
  }, [id]);

  const endLive = useCallback(async () => {
    if (!window.confirm(`Terminare la live "${event?.title}"?`)) return;
    setActionBusy(true);
    try {
      const r = await liveEventsApi.end(id);
      setEvent(r.event);
    } catch (e) { setErr(e.message); }
    finally { setActionBusy(false); }
  }, [id, event]);

  if (loading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (err && !event) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm text-destructive mb-3">{err}</p>
        <Link to="/" className="text-sm text-primary hover:underline">← Home</Link>
      </div>
    );
  }
  if (!event) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {creator?.avatar ? (
              <img src={creator.avatar} alt="" className="w-12 h-12 rounded-full object-cover bg-secondary flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                {(creator?.name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg truncate leading-tight">{event.title}</h1>
              {creator && (
                <Link to={`/trainer/${creator.handle || creator.id}`} className="text-xs text-muted-foreground hover:text-primary">
                  con {creator.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/30">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Live
              </span>
            )}
            {!isLive && event.status === "scheduled" && (
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-secondary text-muted-foreground">
                Programmata
              </span>
            )}
            {event.status === "ended" && (
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-muted text-muted-foreground">
                Conclusa
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> {viewerCount}
            </span>
          </div>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl whitespace-pre-wrap">{event.description}</p>
        )}
      </div>

      {/* Owner controls */}
      {isOwner && (
        <div className="mb-4 flex items-center gap-2 bg-card border border-border rounded-xl p-3">
          {!isLive && event.status === "scheduled" && (
            <Button onClick={startLive} disabled={actionBusy} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Radio className="w-4 h-4 mr-1.5" /> Vai live ora</>}
            </Button>
          )}
          {isLive && (
            <Button onClick={endLive} disabled={actionBusy} variant="outline">
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Square className="w-4 h-4 mr-1.5" /> Termina live</>}
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-2">
            {isLive ? "Sei in onda — tutti i messaggi sono pubblici." : "Quando avvii la live, lo studente vedrà la chat aprirsi in tempo reale."}
          </span>
        </div>
      )}

      {/* Status banners */}
      {!isLive && event.status === "scheduled" && (
        <div className="bg-secondary/40 border border-border rounded-xl p-6 text-center mb-4">
          <Radio className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="font-semibold text-sm">La live non è ancora iniziata</p>
          {event.scheduled_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Programmata per {new Date(event.scheduled_at).toLocaleString("it-IT")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Resta su questa pagina: la chat si aprirà non appena {creator?.name || "il formatore"} avvia la live.
          </p>
        </div>
      )}
      {event.status === "ended" && (
        <div className="bg-secondary/40 border border-border rounded-xl p-6 text-center mb-4">
          <p className="font-semibold text-sm">Live conclusa</p>
          {event.ended_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Terminata {new Date(event.ended_at).toLocaleString("it-IT")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            La chat sotto è la cronologia della sessione.
          </p>
        </div>
      )}

      {/* Video pane Jitsi (solo quando live + utente autenticato) */}
      {isLive && user && (
        <div className="mb-4">
          <div className="bg-black rounded-2xl overflow-hidden border border-border relative" style={{ aspectRatio: "16/9" }}>
            <div ref={jitsiContainerRef} className="w-full h-full" />
            {jitsiErr && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 p-4">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-semibold text-destructive">Errore video</p>
                  <p className="text-xs text-muted-foreground mt-1">{jitsiErr}</p>
                </div>
              </div>
            )}
          </div>
          {externalLiveUrl && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Problemi col video?{" "}
              <a href={externalLiveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Apri la live in una nuova finestra ↗
              </a>
            </p>
          )}
        </div>
      )}
      {isLive && !user && (
        <div className="mb-4 bg-secondary/40 border border-border rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold mb-1">Per vedere il video accedi al tuo account</p>
          <Link to="/student-login" className="text-sm text-primary hover:underline">Accedi</Link>
        </div>
      )}

      {/* Chat container */}
      <div className="bg-card border border-border rounded-2xl flex flex-col h-[40vh] min-h-[300px]">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {isLive ? "Sii il primo a scrivere qualcosa." : "Nessun messaggio."}
            </p>
          ) : (
            messages.map((m) => (
              <ChatBubble key={m.id} msg={m} isOwn={m.user_id === user?.id} ownerId={event.creator_id} />
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          {!user ? (
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/student-login" className="text-primary hover:underline">Accedi</Link>
              {" "}per partecipare alla chat.
            </p>
          ) : !isLive ? (
            <p className="text-xs text-muted-foreground text-center">
              {event.status === "ended" ? "Chat in sola lettura — la live è conclusa." : "La chat sarà attiva quando la live inizia."}
            </p>
          ) : (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Scrivi un messaggio..."
                maxLength={500}
                disabled={sending}
              />
              <Button onClick={send} disabled={sending || !draft.trim()} size="icon" aria-label="Invia">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}
          {err && (
            <p className="text-xs text-destructive mt-2 inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {err}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg, isOwn, ownerId }) {
  const isSystem = msg.type === "system";
  const isCreator = msg.user_id === ownerId && !isSystem;

  if (isSystem) {
    return (
      <div className="text-center">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-1">
          {msg.message}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-xl px-3 py-2 ${
        isOwn ? "bg-primary text-primary-foreground"
        : isCreator ? "bg-primary/10 border border-primary/20"
        : "bg-secondary"
      }`}>
        {isCreator && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Formatore</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words leading-snug">{msg.message}</p>
        <p className={`text-[10px] mt-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {new Date(msg.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
