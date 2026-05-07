import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2, Download, AlertCircle } from "lucide-react";
import { uploadApi } from "@/lib/api";

const MAX_BYTES = 25 * 1024 * 1024;

export default function LessonAttachments({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadOne(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadOne(file);
  };

  const uploadOne = async (file) => {
    setErr("");
    if (file.size > MAX_BYTES) {
      setErr(`File troppo grande (${(file.size / 1024 / 1024).toFixed(0)}MB). Max 25MB.`);
      return;
    }
    setBusy(true);
    try {
      const r = await uploadApi.document(file);
      onChange([...value, {
        url: r.url,
        name: file.name || r.name,
        mime: r.mime,
        size: r.size,
      }]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Documenti e dispense
        </label>
        <span className="text-[10px] text-muted-foreground">{value.length}/20</span>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {value.map((a, i) => (
            <li key={i} className="flex items-center gap-2 bg-secondary/30 border border-border/30 rounded-lg p-2.5">
              <FileTypeIcon mime={a.mime} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {labelMime(a.mime)} · {formatSize(a.size)}
                </p>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground p-1"
                title="Apri"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Rimuovi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !busy && value.length < 20 && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          busy ? "opacity-60 cursor-wait" :
          value.length >= 20 ? "opacity-50 cursor-not-allowed" :
          "border-border/40 bg-secondary/20 hover:border-primary/40 cursor-pointer"
        }`}
      >
        {busy ? (
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Upload in corso...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs font-semibold">
              {value.length >= 20 ? "Limite massimo raggiunto" : "Aggiungi documento"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              PDF · DOC/DOCX · XLS/XLSX · PPT/PPTX · ZIP · TXT · CSV — max 25MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,text/plain,text/csv"
          className="hidden"
          onChange={handlePick}
          disabled={busy}
        />
      </div>
      {err && (
        <p className="text-xs text-destructive mt-2 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {err}
        </p>
      )}
    </div>
  );
}

function FileTypeIcon({ mime }) {
  const color =
    mime === "application/pdf" ? "text-red-500" :
    mime?.includes("word") ? "text-blue-500" :
    mime?.includes("sheet") || mime?.includes("excel") ? "text-green-500" :
    mime?.includes("presentation") || mime?.includes("powerpoint") ? "text-orange-500" :
    mime?.includes("zip") ? "text-yellow-500" :
    "text-muted-foreground";
  return (
    <div className={`w-9 h-9 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0 ${color}`}>
      <FileText className="w-4 h-4" />
    </div>
  );
}

function labelMime(mime) {
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
