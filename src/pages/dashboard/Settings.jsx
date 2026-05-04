import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { UserCog, AtSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlansSection from "@/components/dashboard/PlansSection";
import ProfileEditor from "@/components/dashboard/ProfileEditor";

export default function DashboardSettings() {
  const { user, refresh } = useOutletContext();
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-12">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground mt-1">Profilo pubblico e piano di abbonamento.</p>
      </header>

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold mb-1">Profilo pubblico</h2>
              <p className="text-sm text-muted-foreground">Nome, handle, bio e foto profilo visibili agli studenti.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
              <UserCog className="w-4 h-4 mr-1.5" /> Modifica profilo
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border/40">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-sm truncate">
                {user?.full_name || <span className="text-muted-foreground italic">Nome non impostato</span>}
              </p>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                {user?.handle || <span className="italic">handle non impostato</span>}
              </p>
            </div>
          </div>
        </section>

        <PlansSection />
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
