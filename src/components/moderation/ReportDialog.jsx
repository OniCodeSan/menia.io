import { useState } from "react";
import { Flag, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { REPORT_REASONS, submitReport } from "@/lib/moderation";

export default function ReportDialog({
  open,
  onOpenChange,
  targetId,
  targetRole = "creator",
  targetName = "",
  contextType = null,
  contextId = null,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setReason("spam");
    setDescription("");
    setError("");
    setSuccess(false);
    setSubmitting(false);
  };

  const close = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!user) {
      navigate("/fan-login");
      return;
    }
    setSubmitting(true);
    try {
      await submitReport({
        reporterId: user.id,
        targetId,
        targetRole,
        reason,
        description,
        contextType,
        contextId,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Errore nell'invio del report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="bg-card/95 backdrop-blur-md border-border/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Flag className="w-5 h-5 text-destructive" />
            Segnala {targetName || "utente"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Aiutaci a tenere Tokaro.fans sicura. I report sono anonimi e gestiti dal team moderazione.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="font-heading font-semibold">Report inviato</p>
              <p className="text-xs text-muted-foreground mt-1">
                Il team moderazione revisionerà la segnalazione il prima possibile.
              </p>
            </div>
            <Button onClick={() => close(false)} className="mt-2">Chiudi</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo</Label>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.key}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.key
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/40 hover:border-border/60 hover:bg-secondary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.key}
                      checked={reason === r.key}
                      onChange={() => setReason(r.key)}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-desc" className="text-sm font-medium">
                Dettagli <span className="text-muted-foreground text-xs font-normal">(opzionale)</span>
              </Label>
              <Textarea
                id="report-desc"
                placeholder="Aggiungi contesto utile (max 500 caratteri)"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={3}
                className="bg-secondary/40 border-border/50 resize-none"
              />
              <p className="text-[11px] text-muted-foreground text-right">{description.length}/500</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)} className="border-border/50">
                Annulla
              </Button>
              <Button type="submit" disabled={submitting} className="bg-destructive hover:bg-destructive/90">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" /> Invia segnalazione
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
