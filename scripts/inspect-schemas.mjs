import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();

for (const t of ["live_sessions", "posts", "live_chat_messages", "subscriptions", "direct_messages"]) {
  const r = await c.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    ORDER BY ordinal_position`, [t]);
  console.log(`\n=== ${t} ===`);
  r.rows.forEach(col => console.log(`  ${col.column_name.padEnd(28)} ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`));
}

await c.end();
