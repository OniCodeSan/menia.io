import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import LiveSection from "@/components/dashboard/LiveSection";
import LiveEditor from "@/components/dashboard/LiveEditor";

export default function DashboardLives() {
  const { user, data, refresh } = useOutletContext();
  const [editingLive, setEditingLive] = useState(null);

  const openNewLive = () => setEditingLive({
    title: "", description: "", scheduled_at: "",
    price: 0, external_payment_link: "", is_published: false,
  });

  const onDelete = async (e) => {
    if (!confirm(`Eliminare la live "${e.title}"?`)) return;
    await supabase.from("live_events").delete().eq("id", e.id);
    await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }).catch(() => {});
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-12">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Le tue live</h1>
          <p className="text-sm text-muted-foreground mt-1">Programma sessioni live e gestisci quelle in corso.</p>
        </div>
        <Button onClick={openNewLive} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Nuova live
        </Button>
      </header>

      <LiveSection lives={data.lives} onEdit={setEditingLive} onDelete={onDelete} onChanged={refresh} />

      {editingLive && (
        <LiveEditor
          event={editingLive}
          onClose={() => setEditingLive(null)}
          onSaved={() => { setEditingLive(null); refresh(); }}
        />
      )}
    </div>
  );
}
