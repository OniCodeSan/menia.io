export default function Metric({ label, value, icon: Icon, color }) {
  return (
    <div className="text-center">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />}
      <p className={`font-heading text-xl font-bold ${color || ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
