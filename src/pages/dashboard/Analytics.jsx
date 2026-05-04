import { useOutletContext } from "react-router-dom";
import PerformanceSection from "@/components/dashboard/PerformanceSection";
import KPIAdvanced from "@/components/dashboard/KPIAdvanced";

export default function DashboardAnalytics() {
  const { data } = useOutletContext();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-12">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance, conversioni e metriche avanzate.</p>
      </header>
      <div className="space-y-6">
        <PerformanceSection kpi={data.kpi} conversion={data.conversion} />
        <KPIAdvanced kpi={data.kpi} conversion={data.conversion} />
      </div>
    </div>
  );
}
