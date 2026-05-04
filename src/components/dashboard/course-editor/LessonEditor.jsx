import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered, Quote, Heading2, Trash2, Link2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoUploader from "./VideoUploader";
import LessonAttachments from "./LessonAttachments";

export default function LessonEditor({ lesson, onChange, onDelete }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: lesson.body || "",
    onUpdate: ({ editor }) => {
      onChange({ ...lesson, body: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[300px] py-3",
      },
    },
  });

  // Update editor content when switching active lesson
  const lastIdRef = useRef(lesson.id);
  useEffect(() => {
    if (!editor) return;
    if (lastIdRef.current !== lesson.id) {
      editor.commands.setContent(lesson.body || "", false);
      lastIdRef.current = lesson.id;
    }
  }, [lesson.id, lesson.body, editor]);

  if (!lesson) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <Input
            value={lesson.title || ""}
            onChange={(e) => onChange({ ...lesson, title: e.target.value })}
            placeholder="Titolo lezione"
            className="h-11 text-lg font-bold border-0 focus-visible:ring-0 px-0"
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={onDelete}
            title="Elimina lezione (richiede conferma)"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {editor && (
          <div className="border border-border/30 rounded-xl bg-card">
            <Toolbar editor={editor} />
            <div className="px-4">
              <EditorContent editor={editor} />
            </div>
          </div>
        )}

        <MediaPicker lesson={lesson} onChange={onChange} />

        <LessonAttachments
          value={lesson.attachments || []}
          onChange={(attachments) => onChange({ ...lesson, attachments })}
        />

        <label className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!lesson.is_preview}
            onChange={(e) => onChange({ ...lesson, is_preview: e.target.checked })}
            className="w-4 h-4"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">Lezione in anteprima</p>
            <p className="text-xs text-muted-foreground">Visibile gratis a tutti — usa la prima lezione come "esca" per attrarre studenti.</p>
          </div>
        </label>
      </div>
    </div>
  );
}

function MediaPicker({ lesson, onChange }) {
  const [mode, setMode] = useState("upload"); // 'upload' | 'url'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Media (video o immagine)</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`text-[10px] px-2 py-0.5 rounded ${mode === "upload" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload className="w-3 h-3 inline mr-0.5" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`text-[10px] px-2 py-0.5 rounded ${mode === "url" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Link2 className="w-3 h-3 inline mr-0.5" /> URL esterno
          </button>
        </div>
      </div>
      {mode === "upload" ? (
        <VideoUploader
          value={lesson.media_url || ""}
          onChange={(url) => onChange({ ...lesson, media_url: url })}
        />
      ) : (
        <Input
          placeholder="https://... (jpg/png/mp4/webm)"
          value={lesson.media_url || ""}
          onChange={(e) => onChange({ ...lesson, media_url: e.target.value })}
        />
      )}
    </div>
  );
}

function Toolbar({ editor }) {
  const btn = (active, on, Icon, label) => (
    <button
      type="button"
      onClick={on}
      title={label}
      className={`p-2 rounded hover:bg-secondary/50 ${active ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30">
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, "Titolo")}
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold, "Grassetto")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic, "Corsivo")}
      <span className="w-px h-5 bg-border/30 mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List, "Elenco")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, "Numerato")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), Quote, "Citazione")}
    </div>
  );
}
