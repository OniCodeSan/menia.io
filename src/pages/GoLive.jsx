import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Video, VideoOff, Mic, MicOff, Lock, DollarSign, Zap,
  ArrowLeft, Settings, AlertTriangle, Users, Square, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { canCreatorUse } from "@/lib/plans";
import { supabase, hasSupabase } from "@/lib/supabase";
import LiveChat from "../components/live/LiveChat";
import DonationPanel from "../components/live/DonationPanel";
import DonationAlert from "../components/live/DonationAlert";

function useElapsed(running) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (!running) { setSeconds(0); startRef.current = null; return; }
    startRef.current = Date.now();
    const iv = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function GoLive() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Fitness");
  const [subOnly, setSubOnly] = useState(false);
  const [donationsEnabled, setDonationsEnabled] = useState(true);
  const [minDonation, setMinDonation] = useState("2");

  const [mode, setMode] = useState("setup");
  const [isStarting, setIsStarting] = useState(false);
  const [liveId, setLiveId] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);

  const videoRef = useRef(null);
  const broadcastVideoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [permissionState, setPermissionState] = useState("idle");

  const [currentDonation, setCurrentDonation] = useState(null);
  const elapsed = useElapsed(mode === "broadcasting");

  const isCreatorOrAdmin = user?.role === "creator" || user?.role === "admin";
  const canLive = canCreatorUse("go_live", user?.plan);
  const authorized = isLoadingAuth ? null : (isCreatorOrAdmin && canLive);

  const attachStream = useCallback((stream) => {
    const el = mode === "broadcasting" ? broadcastVideoRef.current : videoRef.current;
    if (el) el.srcObject = stream;
  }, [mode]);

  const requestMedia = useCallback(async (video, audio) => {
    setMediaError(null);
    setPermissionState("requesting");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (!video && !audio) {
        [videoRef, broadcastVideoRef].forEach((r) => { if (r.current) r.current.srcObject = null; });
        setCamOn(false);
        setMicOn(false);
        setPermissionState("idle");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      streamRef.current = stream;
      [videoRef, broadcastVideoRef].forEach((r) => { if (r.current) r.current.srcObject = stream; });
      setCamOn(video);
      setMicOn(audio);
      setPermissionState("granted");
    } catch (err) {
      setPermissionState("denied");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMediaError("Permessi camera/microfono negati. Abilita i permessi nelle impostazioni del browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setMediaError("Nessuna camera o microfono trovato sul dispositivo.");
      } else {
        setMediaError("Errore nell'accesso ai dispositivi: " + (err.message || err.name));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (mode === "broadcasting" && streamRef.current && broadcastVideoRef.current) {
      broadcastVideoRef.current.srcObject = streamRef.current;
    }
  }, [mode]);

  // Capture thumbnail + preview clip every 20s during broadcast
  useEffect(() => {
    if (mode !== "broadcasting" || !liveId || !hasSupabase || !camOn) return;
    let stopped = false;

    const captureAndUpload = async () => {
      const videoEl = broadcastVideoRef.current;
      const stream = streamRef.current;
      if (!videoEl || !stream || stopped) return;

      // 1) Thumbnail: canvas snapshot
      try {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 360;
        canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const thumbBlob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.7));
        if (thumbBlob && !stopped) {
          const thumbPath = `live-previews/${liveId}/thumb.jpg`;
          await supabase.storage.from("media").upload(thumbPath, thumbBlob, { cacheControl: "5", upsert: true, contentType: "image/jpeg" });
          const { data: thumbUrl } = supabase.storage.from("media").getPublicUrl(thumbPath);
          if (thumbUrl?.publicUrl) {
            await supabase.from("live_sessions").update({ thumbnail_url: thumbUrl.publicUrl + "?t=" + Date.now() }).eq("id", liveId);
          }
        }
      } catch (e) { console.warn("[GoLive] thumb capture:", e); }

      // 2) Preview clip: 2-second webm via MediaRecorder
      try {
        if (typeof MediaRecorder === "undefined" || stopped) return;
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;
        const previewStream = new MediaStream([videoTrack]);
        const recorder = new MediaRecorder(previewStream, { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 500000 });
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          if (stopped || chunks.length === 0) return;
          const blob = new Blob(chunks, { type: "video/webm" });
          const clipPath = `live-previews/${liveId}/preview.webm`;
          await supabase.storage.from("media").upload(clipPath, blob, { cacheControl: "5", upsert: true, contentType: "video/webm" });
          const { data: clipUrl } = supabase.storage.from("media").getPublicUrl(clipPath);
          if (clipUrl?.publicUrl) {
            await supabase.from("live_sessions").update({ preview_url: clipUrl.publicUrl + "?t=" + Date.now() }).eq("id", liveId);
          }
        };
        recorder.start();
        setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 2000);
      } catch (e) { console.warn("[GoLive] preview capture:", e); }
    };

    // First capture after 3s, then every 20s
    const t1 = setTimeout(captureAndUpload, 3000);
    const iv = setInterval(captureAndUpload, 20000);
    return () => { stopped = true; clearTimeout(t1); clearInterval(iv); };
  }, [mode, liveId, camOn]);

  const toggleCamera = () => {
    if (camOn) {
      if (streamRef.current) streamRef.current.getVideoTracks().forEach((t) => t.stop());
      if (!micOn) {
        streamRef.current = null;
        [videoRef, broadcastVideoRef].forEach((r) => { if (r.current) r.current.srcObject = null; });
        setPermissionState("idle");
      }
      setCamOn(false);
    } else {
      requestMedia(true, micOn);
    }
  };

  const toggleMic = () => {
    if (micOn) {
      if (streamRef.current) streamRef.current.getAudioTracks().forEach((t) => t.stop());
      if (!camOn) {
        streamRef.current = null;
        [videoRef, broadcastVideoRef].forEach((r) => { if (r.current) r.current.srcObject = null; });
        setPermissionState("idle");
      }
      setMicOn(false);
    } else {
      requestMedia(camOn, true);
    }
  };

  const handleStart = async () => {
    if (!title.trim()) return;
    if (!camOn && !micOn) {
      await requestMedia(true, true);
      if (!streamRef.current) return;
    }
    setIsStarting(true);
    try {
      if (hasSupabase && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();
        if (!canCreatorUse("go_live", profile?.plan)) {
          throw new Error("Piano Pro richiesto per le dirette live.");
        }

        const { data, error } = await supabase
          .from("live_sessions")
          .insert({
            creator_id: user.id,
            title: title.trim(),
            category,
            sub_only: subOnly,
            donations_enabled: donationsEnabled,
            min_donation: parseInt(minDonation, 10) || 2,
            status: "live",
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        setLiveId(data.id);
      }
      setMode("broadcasting");
    } catch (err) {
      console.error("[GoLive] start error:", err);
      alert("Errore nell'avvio della live: " + (err.message || "riprova"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (hasSupabase && liveId) {
      await supabase
        .from("live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", liveId)
        .catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamOn(false);
    setMicOn(false);
    setPermissionState("idle");
    setMode("ended");
  };

  const handleNewDonation = useCallback((donation) => {
    setCurrentDonation(donation);
    setTimeout(() => setCurrentDonation(null), 4000);
  }, []);

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold mb-2">{isCreatorOrAdmin && !canLive ? "Piano Pro richiesto" : "Accesso riservato ai Creator"}</h2>
          <p className="text-muted-foreground text-sm max-w-xs">{isCreatorOrAdmin && !canLive ? "Le dirette live sono disponibili con il piano Pro." : "Solo i creator possono avviare una diretta."}</p>
        </div>
      </div>
    );
  }

  // ─── ENDED ──────────────────────────────────────────────────────────
  if (mode === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-chart-3/10 flex items-center justify-center mx-auto">
            <Radio className="w-10 h-10 text-chart-3" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold mb-2">Live terminata</h2>
            <p className="text-sm text-muted-foreground">La tua diretta "{title}" è stata chiusa con successo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/dashboard")} className="bg-primary hover:bg-primary/90 font-semibold">
              Torna alla dashboard
            </Button>
            <Button variant="outline" onClick={() => { setMode("setup"); setTitle(""); }} className="border-border/50">
              Nuova live
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── BROADCASTING ───────────────────────────────────────────────────
  if (mode === "broadcasting") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-xs font-medium">
                <Clock className="w-3 h-3" />
                {elapsed}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-xs font-medium">
                <Users className="w-3 h-3" />
                {viewerCount} spettatori
              </div>
              {totalDonations > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-chart-4/10 text-xs font-semibold text-chart-4 border border-chart-4/30">
                  <Zap className="w-3 h-3" />
                  {totalDonations} T donati
                </div>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="font-semibold"
              onClick={handleStop}
            >
              <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Termina live
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-black aspect-video">
                <video
                  ref={broadcastVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camOn ? "" : "hidden"}`}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                    <VideoOff className="w-12 h-12 text-muted-foreground/40" />
                  </div>
                )}
                <DonationAlert donation={currentDonation} />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant={camOn ? "default" : "outline"}
                  size="sm"
                  onClick={toggleCamera}
                  className={camOn ? "bg-primary hover:bg-primary/90" : "border-border/50"}
                >
                  {camOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                  {camOn ? "Camera ON" : "Camera OFF"}
                </Button>
                <Button
                  variant={micOn ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMic}
                  className={micOn ? "bg-primary hover:bg-primary/90" : "border-border/50"}
                >
                  {micOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                  {micOn ? "Mic ON" : "Mic OFF"}
                </Button>
              </div>

              {/* Stream info */}
              <div className="bg-card/50 border border-border/30 rounded-2xl p-4">
                <h1 className="font-heading font-bold text-base mb-1">{title}</h1>
                <p className="text-sm text-muted-foreground">{category} · {subOnly ? "Solo abbonati" : "Aperta a tutti"}</p>
              </div>
            </div>

            {/* Chat + Donations sidebar */}
            <div className="flex flex-col gap-4">
              <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden flex flex-col" style={{ height: "420px" }}>
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <span className="font-heading font-bold text-sm">Chat live</span>
                  <span className="ml-auto text-xs text-muted-foreground">{viewerCount} online</span>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  <LiveChat liveId={liveId} onNewDonation={(d) => { handleNewDonation(d); setTotalDonations((t) => t + (d.amount || 0)); }} />
                </div>
              </div>

              {donationsEnabled && (
                <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30">
                    <span className="font-heading font-bold text-sm">Donazioni ricevute</span>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-chart-4">{totalDonations}</p>
                    <p className="text-xs text-muted-foreground">Token ricevuti in questa live</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SETUP ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link to="/live-discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Torna ai live
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl font-bold mb-1">Vai in diretta</h1>
          <p className="text-sm text-muted-foreground mb-8">Configura il tuo live stream e inizia a interagire con i tuoi fan</p>

          {/* Camera preview */}
          <div className="relative rounded-2xl overflow-hidden border border-border/30 aspect-video mb-4 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${camOn ? "" : "hidden"}`}
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 bg-secondary/30">
                <Video className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {permissionState === "idle" ? "Attiva camera e microfono per iniziare" : "Camera disattivata"}
                </p>
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-xs font-medium backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${camOn || micOn ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              {camOn && micOn ? "Camera e mic attivi" : camOn ? "Solo camera" : micOn ? "Solo microfono" : "Dispositivi non attivi"}
            </div>
          </div>

          {/* Camera/Mic controls */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Button
              variant={camOn ? "default" : "outline"}
              size="sm"
              onClick={toggleCamera}
              className={camOn ? "bg-primary hover:bg-primary/90" : "border-border/50"}
            >
              {camOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
              {camOn ? "Camera ON" : "Camera OFF"}
            </Button>
            <Button
              variant={micOn ? "default" : "outline"}
              size="sm"
              onClick={toggleMic}
              className={micOn ? "bg-primary hover:bg-primary/90" : "border-border/50"}
            >
              {micOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              {micOn ? "Mic ON" : "Mic OFF"}
            </Button>
            {permissionState === "idle" && (
              <Button
                size="sm"
                className="bg-chart-3 hover:bg-chart-3/90 font-semibold"
                onClick={() => requestMedia(true, true)}
              >
                Attiva dispositivi
              </Button>
            )}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {mediaError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6"
              >
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">{mediaError}</p>
                  <button
                    onClick={() => requestMedia(true, true)}
                    className="text-xs text-destructive/80 hover:text-destructive underline mt-1"
                  >
                    Riprova
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings */}
          <div className="space-y-6">
            <div className="bg-card/50 border border-border/30 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Impostazioni stream
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Titolo del live *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es. Q&A con i miei fan — rispondo a tutto!"
                    className="bg-secondary/30 border-border/30 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Fitness", "Fotografia", "Musica", "Gaming", "Talk", "Arte", "Formazione", "Scienza", "Marketing", "Develop"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          category === cat
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-border/30 text-muted-foreground hover:border-border/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-chart-4" /> Monetizzazione
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-chart-4/15 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Donazioni live</p>
                      <p className="text-xs text-muted-foreground">I fan possono mandarti donazioni</p>
                    </div>
                  </div>
                  <Switch checked={donationsEnabled} onCheckedChange={setDonationsEnabled} />
                </div>

                {donationsEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pl-11"
                  >
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Donazione minima (Token)</Label>
                    <Input
                      value={minDonation}
                      onChange={(e) => setMinDonation(e.target.value)}
                      className="w-32 bg-secondary/30 border-border/30 h-9 text-sm"
                    />
                  </motion.div>
                )}

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Solo abbonati</p>
                      <p className="text-xs text-muted-foreground">Limita il live agli abbonati premium</p>
                    </div>
                  </div>
                  <Switch checked={subOnly} onCheckedChange={setSubOnly} />
                </div>
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={!title.trim() || isStarting}
              className="w-full h-12 bg-destructive hover:bg-destructive/90 font-semibold text-base"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />
                  Avvio in corso...
                </div>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  Inizia il live
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
