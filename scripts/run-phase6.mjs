import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();
console.log("Applying t1_phase6_videos_bucket.sql...");
try {
  await c.query(readFileSync("supabase/t1_phase6_videos_bucket.sql", "utf8"));
  console.log("Bucket OK.");
} catch (err) {
  console.error("FAIL:", err.message);
  await c.end();
  process.exit(1);
}

const r = await c.query("SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'videos'");
console.log("State:", r.rows[0]);
await c.end();
