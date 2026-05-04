import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();
const sql = readFileSync("supabase/posts_gating_fix.sql", "utf8");
await c.query(sql);

const r = await c.query(`SELECT polname FROM pg_policy WHERE polrelid = 'public.posts'::regclass AND polcmd = 'r' ORDER BY polname;`);
console.log("Active SELECT policies on posts:");
r.rows.forEach(p => console.log("  - " + p.polname));
await c.end();
