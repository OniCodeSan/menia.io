import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();

const r = await c.query(`
  SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as expr
  FROM pg_policy
  WHERE polrelid = 'public.posts'::regclass
  ORDER BY polname;
`);

console.log("Policies on public.posts:\n");
for (const p of r.rows) {
  console.log(`  ${p.polname} (${p.polcmd}):`);
  console.log(`    ${p.expr || "(no qual)"}\n`);
}

await c.end();
