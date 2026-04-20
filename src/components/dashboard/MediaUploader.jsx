import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImageIcon, Video, FileText, Loader2, CheckCircle2, AlertTriangle, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const MAX_VIDEO_MB = 200;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// Output-format preference: AVIF > WebP > JPEG. Support probes cached per session.
// toDataURL silently falls back to PNG if the encoder isn't supported, so the prefix check is reliable.
// AVIF encoding is 2–3x slower than WebP on mid-range mobile devices, so only opt in when the source
// is large enough for the extra compression gain to matter — below the threshold, WebP's speed wins.
const AVIF_MIN_BYTES = 400 * 1024;
let _supportsAvif = null;
let _supportsWebp = null;
function canEncode(mime) {
  try {
    const probe = document.createElement("canvas");
    probe.width = 2; probe.height = 2;
    return probe.toDataURL(mime).startsWith(`data:${mime}`);
  } catch { return false; }
}
function pickOutputMime(sourceSize) {
  if (_supportsAvif === null) _supportsAvif = canEncode("image/avif");
  if (_supportsWebp === null) _supportsWebp = canEncode("image/webp");
  if (_supportsAvif && sourceSize >= AVIF_MIN_BYTES) return "image/avif";
  if (_supportsWebp) return "image/webp";
  return "image/jpeg";
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close?.() };
    } catch {
      // e.g. HEIC on Chrome → fall through to <img> which lets the OS codec try.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

// Draws `source` at (width, height) and encodes to `mime`. Tries OffscreenCanvas first
// (off main thread), but Safari iOS ships a broken OffscreenCanvas on some versions —
// any failure here falls back to a classic HTMLCanvasElement.
async function encodeResized(source, width, height, mime, quality) {
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const oc = new OffscreenCanvas(width, height);
      const ctx = oc.getContext("2d");
      if (ctx && typeof oc.convertToBlob === "function") {
        ctx.drawImage(source, 0, 0, width, height);
        const blob = await oc.convertToBlob({ type: mime, quality });
        if (blob && blob.size > 0 && blob.type === mime) return blob;
      }
    } catch {
      // fall through
    }
  }
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    c.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("encode failed")),
      mime,
      quality
    );
  });
}

async function compressImage(file, quality, maxPx) {
  const decoded = await decodeImage(file);
  let width = decoded.width;
  let height = decoded.height;
  if (width > maxPx || height > maxPx) {
    const ratio = Math.min(maxPx / width, maxPx / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const mime = pickOutputMime(file.size);
  try {
    const blob = await encodeResized(decoded.source, width, height, mime, quality / 100);
    return { blob, width, height, mime };
  } finally {
    decoded.close();
  }
}

function extensionForMime(mime) {
  if (mime === "image/avif") return ".avif";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/jpeg") return ".jpg";
  return "";
}

function renameForMime(name, mime) {
  const ext = extensionForMime(mime);
  return ext ? name.replace(/\.\w+$/, ext) : name;
}

// Keep the original unless re-encoding saves at least 5% — avoids UI flip-flop on already-optimized files.
const SAVINGS_THRESHOLD = 0.05;
function pickBest(originalFile, compressedBlob, mime) {
  if (compressedBlob.size > originalFile.size * (1 - SAVINGS_THRESHOLD)) {
    return { file: originalFile, size: originalFile.size, reused: true };
  }
  const file = new File([compressedBlob], renameForMime(originalFile.name, mime), { type: mime });
  return { file, size: compressedBlob.size, reused: false };
}

export default function MediaUploader({ contentType, onFileReady }) {
  const inputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const runIdRef = useRef(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(null);
  const [quality, setQuality] = useState(80);
  const [maxPx, setMaxPx] = useState(1600);
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [warning, setWarning] = useState(null);

  const isImage = (f) => f?.type.startsWith("image/");
  const isVideo = (f) => f?.type.startsWith("video/");

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const runCompression = useCallback(async (f, q, px) => {
    // Monotonic run id: if a newer compression starts before this one finishes, drop the stale result.
    const runId = ++runIdRef.current;
    setCompressing(true);
    setDone(false);
    try {
      const { blob, mime } = await compressImage(f, q, px);
      if (runId !== runIdRef.current) return;
      const { file: out, size, reused } = pickBest(f, blob, mime);
      setCompressedSize(size);
      setCompressing(false);
      setDone(true);
      setWarning(reused ? "L'originale è già ottimizzato: carichiamo il file così com'è." : null);
      if (onFileReady) onFileReady(f, reused ? null : out);
    } catch {
      if (runId !== runIdRef.current) return;
      setCompressing(false);
      setDone(false);
      setCompressedSize(null);
      setWarning("Formato non supportato dal browser, carichiamo l'originale.");
      if (onFileReady) onFileReady(f, null);
    }
  }, [onFileReady]);

  const processFile = async (f) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setFile(f);
    setOriginalSize(f.size);
    setCompressedSize(null);
    setDone(false);
    setWarning(null);

    if (isImage(f)) {
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setPreview(url);
      runCompression(f, quality, maxPx);
    } else if (isVideo(f)) {
      setPreview(null);
      const limitBytes = MAX_VIDEO_MB * 1024 * 1024;
      if (f.size > limitBytes) {
        setWarning(`Video molto pesante (${formatBytes(f.size)}). Considera di ridurre la qualità prima del caricamento.`);
      }
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      const objUrl = URL.createObjectURL(f);
      videoEl.src = objUrl;
      videoEl.onloadedmetadata = () => {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        URL.revokeObjectURL(objUrl);
        const ratio = w / h;
        const is16x9 = Math.abs(ratio - 16 / 9) < 0.15;
        const is9x16 = Math.abs(ratio - 9 / 16) < 0.15;
        if (!is16x9 && !is9x16) {
          setWarning("Il video deve essere in formato 16:9 (orizzontale) o 9:16 (verticale). I video quadrati non sono supportati.");
          setFile(f);
          if (onFileReady) onFileReady(null, null);
          return;
        }
        if (onFileReady) onFileReady(f, null);
      };
      videoEl.onerror = () => {
        URL.revokeObjectURL(objUrl);
        if (onFileReady) onFileReady(f, null);
      };
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  const reset = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    runIdRef.current++;
    setFile(null);
    setPreview(null);
    setOriginalSize(0);
    setCompressedSize(null);
    setDone(false);
    setWarning(null);
    if (onFileReady) onFileReady(null, null);
  };

  const acceptAttr =
    contentType === "video" ? "video/*" :
    contentType === "post" ? "image/*,video/*" :
    "image/*,video/*";

  const FileIcon = file ? (isVideo(file) ? Video : ImageIcon) : FileText;

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">Carica contenuto</Label>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragging ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/40 hover:bg-secondary/30"
          }`}
        >
          <input ref={inputRef} type="file" accept={acceptAttr} className="hidden" onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
          <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground/80">Trascina o clicca per caricare</p>
          <p className="text-xs text-muted-foreground mt-1">
            {contentType === "video" ? "Video (max consigliato 200MB)" : "Immagini o video"}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/40 bg-secondary/20 overflow-hidden"
        >
          {/* Preview */}
          {preview && (
            <div className="relative aspect-video bg-black">
              <img src={preview} alt="preview" className="w-full h-full object-contain" />
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* File info row */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">Originale: {formatBytes(originalSize)}</span>
                  {compressedSize && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-[11px] text-chart-3 font-semibold">
                        {formatBytes(compressedSize)} ({Math.round((1 - compressedSize / originalSize) * 100)}% risparmiato)
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={reset} className="p-1.5 hover:text-destructive transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning */}
            <AnimatePresence>
              {warning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 text-xs text-chart-4 bg-chart-4/8 border border-chart-4/25 rounded-lg px-3 py-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {warning}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compression controls — only for images */}
            {isImage(file) && (
              <div className="space-y-3 pt-2 border-t border-border/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Ottimizzazione immagine</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">Qualità</Label>
                    <span className="text-xs font-semibold text-primary">{quality}%</span>
                  </div>
                  <Slider
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                    onValueCommit={([v]) => runCompression(file, v, maxPx)}
                    min={30} max={100} step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Più leggero</span>
                    <span className="text-[10px] text-muted-foreground">Massima qualità</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">Dimensione max lato lungo (px)</Label>
                    <span className="text-xs font-semibold text-primary">{maxPx}px</span>
                  </div>
                  <Slider
                    value={[maxPx]}
                    onValueChange={([v]) => setMaxPx(v)}
                    onValueCommit={([v]) => runCompression(file, quality, v)}
                    min={480} max={3840} step={240}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">480px</span>
                    <span className="text-[10px] text-muted-foreground">4K (3840px)</span>
                  </div>
                </div>

                {compressing ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Ottimizzazione automatica in corso...
                  </div>
                ) : done ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 text-xs text-chart-3 font-semibold bg-chart-3/8 border border-chart-3/25 rounded-lg px-3 py-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Immagine ottimizzata automaticamente!
                  </motion.div>
                ) : null}
              </div>
            )}

            {/* Video info — no client-side compression, just advice */}
            {isVideo(file) && (
              <div className="pt-2 border-t border-border/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Info video</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Dimensione", value: formatBytes(originalSize) },
                    { label: "Tipo", value: file.type.split("/")[1]?.toUpperCase() || "—" },
                  ].map((item) => (
                    <div key={item.label} className="bg-secondary/40 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-xs font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 leading-relaxed">
                  💡 Formato accettato: <span className="font-semibold text-foreground">16:9</span> (orizzontale) o <span className="font-semibold text-foreground">9:16</span> (verticale). Usa H.264/MP4, max 1080p.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}