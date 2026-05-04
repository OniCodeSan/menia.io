import { useOutletContext } from "react-router-dom";
import CommunitySection from "@/components/dashboard/CommunitySection";

export default function DashboardCommunity() {
  const { data } = useOutletContext();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-12">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Community</h1>
        <p className="text-sm text-muted-foreground mt-1">Iscritti attivi e post pubblicati.</p>
      </header>
      <CommunitySection stats={data.communityStats} />
    </div>
  );
}
