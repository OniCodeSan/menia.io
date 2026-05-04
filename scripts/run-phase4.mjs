import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();
console.log("Applying t1_phase4_kpi_segments_plans.sql...");
try {
  await c.query(readFileSync("supabase/t1_phase4_kpi_segments_plans.sql", "utf8"));
  console.log("Migration OK.");
} catch (err) {
  console.error("FAIL:", err.message);
  await c.end();
  process.exit(1);
}

// Initial KPI computation for all creators
console.log("\nRunning compute_creator_kpi for all creators...");
const r = await c.query("SELECT cron_recompute_all_kpi() as n");
console.log(`  Computed ${r.rows[0].n} creators.`);

// Verify
const t = await c.query(`
  SELECT
    (SELECT count(*) FROM creator_plans) AS plans,
    (SELECT count(*) FROM creator_kpi_aggregated) AS aggregated,
    (SELECT count(*) FROM creator_segments) AS segments
`);
console.log("\nState after migration:");
console.log("  creator_plans rows:", t.rows[0].plans);
console.log("  creator_kpi_aggregated rows:", t.rows[0].aggregated);
console.log("  creator_segments rows:", t.rows[0].segments);

await c.end();
