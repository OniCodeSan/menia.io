import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, Download, Trash2, Bell, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { openCookieSettings } from "@/components/shared/CookieBanner";

export default function GdprSettings() {
  const { user, isLoadingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [marketing, setMarketing] = useState(false);
  const [deletionPending, setDeletionPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) { navigate("/student-login", { replace: true }); return; }
    loadSettings();
  }, [user, isLoadingAuth]);

  async function loadSettings() {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("marketing_consent, deletion_requested_at")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        setMarketing(!!profile.marketing_consent);
      }

      const { data: delReq } = await supabase
        .from("deletion_requests")
        .select("id, status, scheduled_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"])
        .maybeSingle();
      setDeletionPending(delReq || null);
    } catch {}
    setLoading(false);
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function handleExport() {
    setExporting(true);
    setMsg(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/gdpr/export-request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Errore esportazione");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menia-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: "success", text: "Dati esportati con successo" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    setExporting(false);
  }

  async function handleMarketingToggle() {
    const newVal = !marketing;
    setMarketing(newVal);
    try {
      const token = await getToken();
      await fetch("/api/gdpr/marketing-consent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ consent: newVal }),
      });
    } catch {
      setMarketing(!newVal);
    }
  }

  async function handleDeleteRequest() {
    setDeleting(true);
    setMsg(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/gdpr/delete-request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeletionPending(data.request);
      setShowDeleteConfirm(false);
      setMsg({ type: "success", text: `Account programmato per eliminazione il ${new Date(data.request.scheduled_at).toLocaleDateString("it-IT")}` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    setDeleting(false);
  }

  async function handleCancelDeletion() {
    try {
      const token = await getToken();
      await fetch("/api/gdpr/cancel-deletion", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setDeletionPending(null);
      setMsg({ type: "success", text: "Richiesta di eliminazione annullata" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  if (isLoadingAuth || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Privacy e Dati</h1>
          <p className="text-sm text-muted-foreground">Gestisci i tuoi dati personali e le preferenze privacy</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          msg.type === "success" ? "bg-chart-3/10 border border-chart-3/20 text-chart-3" : "bg-destructive/10 border border-destructive/20 text-destructive"
        }`}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Data Export */}
        <div className="bg-card/40 border border-border/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-heading font-bold text-base">Esporta i tuoi dati</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Scarica una copia di tutti i dati associati al tuo account (profilo, transazioni, consensi). Il file sarà in formato JSON.
              </p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="border-border/50">
            {exporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Esportazione...</> : "Esporta dati"}
          </Button>
        </div>

        {/* Cookie Preferences */}
        <div className="bg-card/40 border border-border/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-chart-4 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-heading font-bold text-base">Preferenze Cookie</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gestisci le tue preferenze sui cookie e il tracciamento analitico.
              </p>
            </div>
          </div>
          <Button onClick={() => openCookieSettings()} variant="outline" className="border-border/50">
            Modifica preferenze cookie
          </Button>
        </div>

        {/* Marketing Consent */}
        <div className="bg-card/40 border border-border/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h2 className="font-heading font-bold text-base">Comunicazioni marketing</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ricevi aggiornamenti su novità, offerte e contenuti consigliati via email.
                </p>
              </div>
            </div>
            <button
              onClick={handleMarketingToggle}
              className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ml-4 ${
                marketing ? "bg-primary/30 justify-end" : "bg-border justify-start"
              }`}
            >
              <div className={`w-5 h-5 rounded-full transition-colors ${marketing ? "bg-primary" : "bg-muted-foreground"}`} />
            </button>
          </div>
        </div>

        {/* Account Deletion */}
        <div className="bg-card/40 border border-destructive/20 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="font-heading font-bold text-base">Elimina account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Richiedi l'eliminazione permanente del tuo account e di tutti i dati associati. L'eliminazione avverrà dopo 30 giorni, durante i quali puoi annullare la richiesta.
              </p>
            </div>
          </div>

          {deletionPending ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Eliminazione programmata per il {new Date(deletionPending.scheduled_at).toLocaleDateString("it-IT")}
              </div>
              <Button onClick={handleCancelDeletion} variant="outline" size="sm" className="border-border/50">
                Annulla eliminazione
              </Button>
            </div>
          ) : showDeleteConfirm ? (
            <div className="space-y-3">
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Motivo (opzionale) — ci aiuta a migliorare"
                rows={2}
                className="w-full bg-secondary/30 border border-border/30 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-destructive placeholder:text-muted-foreground/50"
              />
              <div className="flex gap-2">
                <Button onClick={handleDeleteRequest} disabled={deleting} variant="destructive" size="sm">
                  {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Conferma eliminazione
                </Button>
                <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" size="sm" className="border-border/50">
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              Richiedi eliminazione account
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
