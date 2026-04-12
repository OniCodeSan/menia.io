import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Video, ImageIcon, Lock, Globe, Users, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MediaUploader from "./MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONTENT_TYPES = [
  { id: "post", label: "Post", icon: FileText, color: "text-accent", bg: "bg-accent/10 border-accent/30" },
  { id: "video", label: "Video", icon: Video, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  { id: "photo", label: "Foto", icon: ImageIcon, color: "text-chart-3", bg: "bg-chart-3/10 border-chart-3/30" },
];

const ACCESS_LEVELS = [
  { id: "public", label: "Pubblico", desc: "Visibile a tutti", icon: Globe },
  { id: "subscribers", label: "Abbonati", desc: "Solo chi è abbonato", icon: Users },
  { id: "premium", label: "Premium", desc: "Piano premium richiesto", icon: Lock },
];

export default function PublishContent() {
  const [contentType, setContentType] = useState("post");
  const [access, setAccess] = useState("subscribers");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileReady, setFileReady] = useState(null);
  const [price, setPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handleFileReady = (original, compressed) => {
    setFile(original);
    setFileReady(compressed || original);
  };

  const handlePublish = async () => {
    if (!title.trim()) return;
    setPublishing(true);
    try {
      if (fileReady) {
        await base44.integrations.Core.UploadFile({ file: fileReady });
      }
      setPublishing(false);
      setPublished(true);
      setTimeout(() => {
        setPublished(false);
        setTitle("");
        setDescription("");
        setFile(null);
        setFileReady(null);
        setPrice("");
      }, 2500);
    } catch (err) {
      setPublishing(false);
    }
  };

  if (published) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 gap-4"
      >
        <div className="w-20 h-20 rounded-full bg-chart-3/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-chart-3" />
        </div>
        <h3 className="font-heading font-bold text-xl">Contenuto pubblicato!</h3>
        <p className="text-sm text-muted-foreground">Il tuo contenuto è ora disponibile per i fan</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-heading font-bold text-lg">Pubblica un contenuto</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Carica foto, video o post per i tuoi fan</p>
      </div>

      {/* Content type */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold">Tipo di contenuto</p>
        <div className="grid grid-cols-3 gap-3">
          {CONTENT_TYPES.map(({ id, label, icon: Icon, color, bg }) => (
            <button
              key={id}
              onClick={() => setContentType(id)}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all text-sm font-semibold ${
                contentType === id ? `${bg} ${color}` : "border-border/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-5">
        <p className="text-sm font-semibold mb-4">File</p>
        <MediaUploader contentType={contentType} onFileReady={handleFileReady} />
      </div>

      {/* Details */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold">Dettagli</p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Titolo *</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Es. Allenamento full body 30 min"
            className="bg-secondary/30 border-border/30 h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Descrizione</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrivi il tuo contenuto..."
            className="w-full h-24 bg-secondary/30 border border-border/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Access */}
      <div className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold">Accesso</p>
        <div className="space-y-2">
          {ACCESS_LEVELS.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAccess(id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                access === id ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${access === id ? "bg-primary/10" : "bg-secondary/50"}`}>
                <Icon className={`w-4 h-4 ${access === id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className={`ml-auto w-4 h-4 rounded-full border-2 ${access === id ? "border-primary bg-primary" : "border-border"}`} />
            </button>
          ))}
        </div>

        {access === "premium" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prezzo sblocco singolo (€)</Label>
            <Input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Es. 4.99"
              className="bg-secondary/30 border-border/30 h-10 max-w-xs"
            />
          </div>
        )}
      </div>

      <Button
        onClick={handlePublish}
        disabled={!title.trim() || publishing}
        className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary font-semibold text-sm"
      >
        {publishing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Pubblicazione in corso...</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" />Pubblica ora</>
        )}
      </Button>
    </motion.div>
  );
}