export default function KPIAdvanced({ kpi, conversion }) {
  if (!kpi) return null;

  return (
    <section>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">KPI avanzati</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Top corso</p>
          {kpi.top_course ? (
            <>
              <p className="font-heading font-bold text-base truncate">{kpi.top_course.title}</p>
              <p className="text-xs text-muted-foreground">{kpi.top_course.accesses} accessi · €{Number(kpi.top_course.price || 0).toFixed(0)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun corso con accessi.</p>
          )}
        </div>
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Conversione media</p>
          <p className="font-heading font-bold text-base">
            {conversion ? `${(conversion.rate * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {conversion?.total_students || 0} accessi su {conversion?.total_views || 0} visite
          </p>
        </div>
      </div>
    </section>
  );
}
