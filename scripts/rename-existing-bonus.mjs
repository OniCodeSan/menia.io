import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({ host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE, ssl: { rejectUnauthorized: false } });
await c.connect();

const r = await c.query(`
  UPDATE token_transactions
  SET description = 'Free Token Message'
  WHERE ref_type = 'invite_code'
    AND description IN ('Bonus invito beta', 'Token message')
  RETURNING id, user_id, amount;
`);

console.log(`Aggiornate ${r.rowCount} transaction(s) precedenti.`);
r.rows.forEach(t => console.log(`  ${t.id} user=${t.user_id.slice(0,8)} amount=${t.amount}`));

await c.end();
