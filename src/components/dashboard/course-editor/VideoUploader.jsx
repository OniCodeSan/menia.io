import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { uploadApi } from "@/lib/api";
import VideoDropzone from "./VideoDropzone";
import VideoUploadProgress from "./VideoUploadProgress";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB

// Microcopy as per product spec — non-technical, reassuring.
const MSG = {
  load_engine: "Preparazione...",
  compress:    "Ottimizziamo il video per renderlo più veloce",
  upload:      "Caricamento in corso… non chiudere la pagina",
  done:        "Video pronto",
};

export default function VideoUploader({ value, onChange }) {
  // status: 'idle' | 'compressing' | 'uploading' | 'done' | 'error'
  const [status, setStatus]     = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setError("");
  };

  const handleFile = async (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setStatus("error");
      setMessage("File non supportato");
      setError("Il file selezionato non è un video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setMessage("File troppo grande");
      setError(`Massimo 200MB (il tuo è ${(file.size / 1024 / 1024).toFixed(0)}MB).`);
      return;
    }

    try {
      // Phase 1: ffmpeg.wasm load + compression → maps to 0..60
      setStatus("compressing");
      setMessage(MSG.compress);
      setProgress(2);

      const { compressVideo } = await import("@/lib/videoCompress");

      const compressed = await compressVideo(file, ({ phase, progress: p }) => {
        if (phase === "load_engine") {
          // 0..10% during engine load
          setProgress(Math.max(2, p * 10));
        } else if (phase === "read_file") {
          // 10..15
          setProgress(10 + p * 5);
        } else if (phase === "compress") {
          // 15..55 — main compression
          setProgress(15 + p * 40);
        } else if (phase === "finalize") {
          // 55..60
          setProgress(60);
        }
      });

      // Phase 2: upload → maps to 60..100
      setStatus("uploading");
      setMessage(MSG.upload);
      setProgress(60);

      const result = await uploadApi.video(
        new File([compressed], `${Date.now()}.mp4`, { type: "video/mp4" }),
        (pct) => setProgress(60 + pct * 40),
      );

      setProgress(100);
      setStatus("done");
      setMessage(MSG.done);
      onChange(result.url);

      // Auto-hide progress after 1.5s
      setTimeout(() => reset(), 1500);
    } catch (e) {
      console.error("[VideoUploader]", e);
      setStatus("error");
      setMessage("Errore");
      setError(e?.message || "Errore durante upload");
    }
  };

  const remove = () => onChange("");

  // ── Already uploaded: show preview + remove ───────────────────────────────
  if (value && status === "idle") {
    return (
      <div className="space-y-2">
        <div className="relative bg-card border border-border/30 rounded-xl overflow-hidden">
          <video src={value} controls className="w-full max-h-64 bg-black" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
            title="Rimuovi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-chart-3" />
          Video caricato
        </p>
      </div>
    );
  }

  // ── Active upload: dropzone disabled + progress ───────────────────────────
  const busy = status === "compressing" || status === "uploading";

  return (
    <div className="space-y-3">
      {!busy && status !== "done" && (
        <VideoDropzone onFile={handleFile} disabled={busy} />
      )}
      <VideoUploadProgress
        status={status}
        progress={progress}
        message={message}
        error={error}
      />
      {status === "error" && (
        <button
          onClick={reset}
          className="text-xs text-primary hover:underline"
        >
          ← Riprova con un altro file
        </button>
      )}
    </div>
  );
}
