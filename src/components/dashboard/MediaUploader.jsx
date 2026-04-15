import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImageIcon, Video, FileText, Loader2, CheckCircle2, AlertTriangle, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 200;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function compressImage(file, quality, maxPx) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve({ blob, width, height });
        },
        "image/jpeg",
        quality / 100
      );
    };
    img.src = url;
  });
}

export default function MediaUploader({ contentType, onFileReady }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(null);
  const [quality, setQuality] = useState(80);
  const [maxPx, setMaxPx] = useState(1920);
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [warning, setWarning] = useState(null);

  const isImage = (f) => f?.type.startsWith("image/");
  const isVideo = (f) => f?.type.startsWith("video/");

  const processFile = async (f) => {
    setFile(f);
    setOriginalSize(f.size);
    setCompressedSize(null);
    setDone(false);
    setWarning(null);

    if (isImage(f)) {
      const url = URL.createObjectURL(f);
      setPreview(url);
      // Auto-compress immediately
      setCompressing(true);
      const { blob, width, height } = await compressImage(f, quality, maxPx);
      setCompressedSize(blob.size);
      setCompressing(false);
      setDone(true);
      const compressed = new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      if (onFileReady) onFileReady(f, compressed);
    } else if (isVideo(f)) {
      setPreview(null);
      const limitBytes = MAX_VIDEO_MB * 1024 * 1024;
      if (f.size > limitBytes) {
        setWarning(`Video molto pesante (${formatBytes(f.size)}). Considera di ridurre la qualità prima del caricamento.`);
      }
      if (onFileReady) onFileReady(f, null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  const handleCompress = async () => {
    if (!file || !isImage(file)) return;
    setCompressing(true);
    const { blob, width, height } = await compressImage(file, quality, maxPx);
    setCompressedSize(blob.size);
    setCompressing(false);
    setDone(true);
    setWarning(null);
    const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    if (onFileReady) onFileReady(file, compressed);
  };

  const reset = () => {
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
                    onValueChange={async ([v]) => { setQuality(v); setDone(false); setCompressing(true); const { blob } = await compressImage(file, v, maxPx); setCompressedSize(blob.size); setCompressing(false); setDone(true); const c = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }); if (onFileReady) onFileReady(file, c); }}
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
                    onValueChange={async ([v]) => { setMaxPx(v); setDone(false); setCompressing(true); const { blob } = await compressImage(file, quality, v); setCompressedSize(blob.size); setCompressing(false); setDone(true); const c = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }); if (onFileReady) onFileReady(file, c); }}
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
                  💡 Per video pesanti, usa <span className="font-semibold text-foreground">H.264/MP4</span> con risoluzione max 1080p prima di caricare. La piattaforma ottimizza automaticamente lo streaming.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}