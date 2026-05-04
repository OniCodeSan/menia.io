import { useCallback, useRef, useState } from "react";
import { Upload, Film } from "lucide-react";

export default function VideoDropzone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile, disabled]);

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}
        ${dragActive ? "border-primary bg-primary/10" : "border-border/40 bg-secondary/20"}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dragActive ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
          {dragActive ? <Film className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
        </div>
        <p className="font-semibold text-sm">
          {dragActive ? "Rilascia qui per caricare" : "Trascina qui il video oppure clicca per scegliere"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          MP4 / WebM / MOV · max 200MB · ottimizzato a 720p in automatico
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handlePick}
        disabled={disabled}
      />
    </div>
  );
}
