import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { coursesApi } from "@/lib/api";

import QuickActions      from "@/components/dashboard/QuickActions";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import Suggestions       from "@/components/dashboard/Suggestions";
import SegmentBadge      from "@/components/dashboard/SegmentBadge";
import ProfileEditor     from "@/components/dashboard/ProfileEditor";

// /dashboard — Overview page. Le altre sezioni sono sotto /dashboard/courses,
// /dashboard/community, ecc. (vedi App.jsx). DashboardLayout fetcha KPI una
// volta e li passa via Outlet context.
export default function Dashboard() {
  const { user, data, refresh } = useOutletContext();
  const navigate = useNavigate();
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (!user) navigate("/trainer-login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;
  if (user.role !== "creator" && user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <h2 className="font-heading text-xl font-bold mb-2">Accesso riservato ai formatori</h2>
        <Button onClick={() => navigate("/")}>Torna alla home</Button>
      </div>
    );
  }

  const createAndOpenEditor = async () => {
    try {
      const r = await coursesApi.create({
        title: "Nuovo corso",
        price: 19.90,
        is_published: false,
      });
      navigate(`/dashboard/course/${r.course.id}/edit`);
    } catch (e) {
      alert("Errore: " + e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      <QuickActions
        user={user}
        onNewCourse={createAndOpenEditor}
        onEditProfile={() => setEditingProfile(true)}
      />

      <div className="space-y-6 mt-4">
        <DashboardOverview kpi={data.kpi} />
        <SegmentBadge kpi={data.kpi} />
        <Suggestions
          suggestions={data.suggestions}
          onCreateCourse={createAndOpenEditor}
        />
      </div>

      {editingProfile && (
        <ProfileEditor
          user={user}
          onClose={() => setEditingProfile(false)}
          onSaved={() => { setEditingProfile(false); refresh(); }}
        />
      )}
    </div>
  );
}
