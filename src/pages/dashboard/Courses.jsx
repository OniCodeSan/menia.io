import { useNavigate, useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { coursesApi } from "@/lib/api";
import CourseList from "@/components/dashboard/CourseList";

export default function DashboardCourses() {
  const { user, data, refresh } = useOutletContext();
  const navigate = useNavigate();

  const onCreate = async () => {
    try {
      const r = await coursesApi.create({ title: "Nuovo corso", price: 19.90, is_published: false });
      navigate(`/dashboard/course/${r.course.id}/edit`);
    } catch (e) {
      alert("Errore: " + e.message);
    }
  };

  const onDelete = async (c) => {
    if (!confirm(`Eliminare "${c.title}"?`)) return;
    await supabase.from("courses").delete().eq("id", c.id);
    await supabase.rpc("compute_creator_kpi", { p_creator_id: user.id }).catch(() => {});
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-12">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">I tuoi corsi</h1>
          <p className="text-sm text-muted-foreground mt-1">Crea, modifica e pubblica i corsi del tuo catalogo.</p>
        </div>
        <Button onClick={onCreate} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Nuovo corso
        </Button>
      </header>

      <CourseList
        courses={data.courses}
        onEdit={(c) => navigate(`/dashboard/course/${c.id}/edit`)}
        onDelete={onDelete}
      />
    </div>
  );
}
