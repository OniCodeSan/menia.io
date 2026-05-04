import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .reduce((acc, l) => {
    const [k, ...v] = l.split("=");
    acc[k.trim()] = v.join("=").trim();
    return acc;
  }, {});

const sql = readFileSync("supabase/beta_launch.sql", "utf8");

const client = new pg.Client({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected. Applying beta_launch.sql...");
try {
  await client.query(sql);
  console.log("Migration applied successfully.");
} catch (err) {
  console.error("Migration FAILED:", err.message);
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
