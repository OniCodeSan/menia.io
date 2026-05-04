import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// status: 'idle' | 'compressing' | 'uploading' | 'done' | 'error'
// progress: 0..100
// message: string
export default function VideoUploadProgress({ status, progress, message, error }) {
  if (status === "idle") return null;

  const isActive = status === "compressing" || status === "uploading";

  return (
    <div className="w-full bg-card border border-border/30 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-sm flex items-center gap-2 min-w-0">
          {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
          {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-chart-3 flex-shrink-0" />}
          {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
          <span className="truncate">{message}</span>
        </span>
        {isActive && (
          <span className="text-sm text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
        )}
      </div>

      <div className="w-full bg-secondary/40 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            status === "error" ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>

      {status === "done" && (
        <p className="text-chart-3 text-sm mt-2">Video pronto</p>
      )}
      {status === "error" && (
        <p className="text-destructive text-sm mt-2">{error || "Errore durante upload"}</p>
      )}
    </div>
  );
}
