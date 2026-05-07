import { useEffect, useState } from "react";
import { Loader2, Cpu, MemoryStick, HardDrive, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { adminApi } from "@/lib/api";

const POLL_MS = 10_000;

function fmtBytes(n) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}
function fmtSec(s) {
  if (!s) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}g ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Bar({ label, pct, accent = "bg-primary", note }) {
  const safePct = Math.max(0, Math.min(100, pct || 0));
  const danger = safePct >= 90;
  const warn = safePct >= 80 && safePct < 90;
  const color = danger ? "bg-destructive" : warn ? "bg-amber-500" : accent;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{safePct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${safePct}%` }} />
      </div>
      {note && <div className="text-[11px] text-muted-foreground mt-1">{note}</div>}
    </div>
  );
}

export default function AdminSystem() {
  const [res, setRes] = useState(null);
  const [load, setLoad] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function tick() {
    try {
      const [r, l, h] = await Promise.allSettled([
        adminApi.systemResources(),
        adminApi.systemLoad(),
        adminApi.health(),
      ]);
      if (r.status === "fulfilled") setRes(r.value);
      else setErr(r.reason?.message || "Errore risorse");
      if (l.status === "fulfilled") setLoad(l.value);
      if (h.status === "fulfilled") setHealth(h.value);
    } catch (e) {
      setErr(e?.message || "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const memPct = res?.memory?.use_pct || 0;
  const diskPct = res?.disk?.use_pct || 0;
  const cores = res?.cpu?.cores || 1;
  const loadPerCore = res?.cpu?.load_per_core_1m || 0;
  const cpuPct = Math.min(100, loadPerCore * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Sistema</h1>
          <p className="text-sm text-muted-foreground">Aggiornamento ogni 10s · {res?.os?.hostname}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Uptime: {fmtSec(res?.os?.uptime_sec)} · Process: {fmtSec(res?.process?.uptime_sec)}
        </div>
      </div>

      {err && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-4 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> {err}
        </div>
      )}

      {res?.alerts?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1">
          <div className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" /> Alert attivi
          </div>
          {res.alerts.map((a, i) => (
            <div key={i} className="text-xs">
              <span className={a.level === "critical" ? "text-destructive font-semibold" : "text-amber-600 dark:text-amber-400"}>{a.level.toUpperCase()}</span>
              {" · "}{a.area}: {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-muted-foreground">CPU load</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <Bar label={`load avg / core (${cores}c)`} pct={cpuPct} note={`1m ${res?.cpu?.load_1m?.toFixed(2)} · 5m ${res?.cpu?.load_5m?.toFixed(2)} · 15m ${res?.cpu?.load_15m?.toFixed(2)}`} />
          <div className="text-[11px] text-muted-foreground mt-3 truncate" title={res?.cpu?.model}>{res?.cpu?.model}</div>
        </div>

        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-muted-foreground">Memory</span>
            <MemoryStick className="w-4 h-4 text-primary" />
          </div>
          <Bar label="RAM" pct={memPct} note={`${fmtBytes(res?.memory?.used_bytes)} / ${fmtBytes(res?.memory?.total_bytes)}`} />
          <div className="text-[11px] text-muted-foreground mt-3">
            Heap node: {fmtBytes(res?.process?.heap_used_bytes)} / {fmtBytes(res?.process?.heap_total_bytes)}
          </div>
        </div>

        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-muted-foreground">Disk</span>
            <HardDrive className="w-4 h-4 text-primary" />
          </div>
          {res?.disk?.error ? (
            <div className="text-xs text-muted-foreground">{res.disk.error}</div>
          ) : (
            <Bar
              label="Disk /"
              pct={diskPct}
              note={`${fmtBytes((res?.disk?.used_kb || 0) * 1024)} / ${fmtBytes((res?.disk?.total_kb || 0) * 1024)}`}
            />
          )}
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Carico API (ultimi 5 min)</h2>
        </div>
        {load?.enabled === false ? (
          <div className="text-xs text-muted-foreground">{load.note}</div>
        ) : load ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <Stat label="req/s" value={load.rps?.toFixed(2)} />
            <Stat label="requests" value={load.requests} />
            <Stat label="p50" value={`${load.p50_ms}ms`} />
            <Stat label="p95" value={`${load.p95_ms}ms`} />
            <Stat label="p99" value={`${load.p99_ms}ms`} />
            <Stat label="err rate" value={`${((load.err_rate || 0) * 100).toFixed(2)}%`} accent={load.err_rate > 0.05 ? "text-destructive" : ""} />
          </div>
        ) : null}
      </div>

      {health && (
        <div className="bg-card border border-border/30 rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold mb-3">Health checks</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(health.checks || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs border border-border/20 rounded-lg p-2">
                {v.status === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                <div>
                  <div className="font-medium">{k}</div>
                  <div className="text-muted-foreground">{v.message || v.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "" }) {
  return (
    <div className="bg-muted/20 rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground uppercase">{label}</div>
      <div className={`font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
