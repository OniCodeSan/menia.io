import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const c = new pg.Client({
  host: env.PGHOST, port: +env.PGPORT, user: env.PGUSER,
  password: env.PGPASSWORD, database: env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to remote DB...");
await c.connect();

// --- Pre-flight: capture row counts on tables we'll archive/drop/migrate
console.log("\n=== PRE-FLIGHT (current state) ===");
const preflightTables = [
  "profiles", "subscriptions", "direct_messages",
  "posts", "live_sessions", "live_chat_messages",
  "token_wallets", "token_transactions", "token_packs", "monetization_config",
  "payout_requests", "webhook_events", "financial_logs", "fraud_logs",
  "payment_orders", "content_unlocks", "live_donations",
  "post_likes", "post_comments", "reshares", "comment_replies",
  "invite_codes", "conversation_unlocks", "welcome_bonus_log", "user_behavior_log",
];
for (const t of preflightTables) {
  try {
    const r = await c.query(`SELECT count(*)::int as n FROM public.${t}`);
    console.log(`  ${t.padEnd(30)} ${r.rows[0].n}`);
  } catch (err) {
    console.log(`  ${t.padEnd(30)} (missing)`);
  }
}

// --- Run migration
console.log("\n=== APPLYING MIGRATION ===");
const sql = readFileSync("supabase/t1_refactor_phase1.sql", "utf8");
try {
  await c.query(sql);
  console.log("Migration applied OK.");
} catch (err) {
  console.error("\n✗ MIGRATION FAILED:", err.message);
  console.error(err);
  await c.end();
  process.exit(1);
}

// --- Post-flight: verify final state
console.log("\n=== POST-FLIGHT (final state) ===");

const newTables = [
  "creator_profiles", "courses", "course_lessons", "course_access",
  "live_events", "live_access", "community_posts",
];
console.log("\nNew tables:");
for (const t of newTables) {
  const r = await c.query(`SELECT count(*)::int as n FROM public.${t}`);
  console.log(`  ${t.padEnd(30)} ${r.rows[0].n} rows`);
}

const archivedTables = [
  "_archived_token_transactions", "_archived_payout_requests",
  "_archived_webhook_events", "_archived_financial_logs",
  "_archived_fraud_logs", "_archived_payment_orders",
];
console.log("\nArchived tables:");
for (const t of archivedTables) {
  try {
    const r = await c.query(`SELECT count(*)::int as n FROM public.${t}`);
    console.log(`  ${t.padEnd(30)} ${r.rows[0].n} rows`);
  } catch (err) {
    console.log(`  ${t.padEnd(30)} (missing)`);
  }
}

const droppedTables = [
  "token_wallets", "token_packs", "monetization_config",
  "invite_codes", "conversation_unlocks", "welcome_bonus_log", "user_behavior_log",
  "content_unlocks", "live_donations",
  "posts", "live_sessions", "live_chat_messages",
  "post_likes", "post_comments", "reshares", "comment_replies",
];
console.log("\nDropped tables (should all report missing):");
let leakDetected = false;
for (const t of droppedTables) {
  try {
    await c.query(`SELECT 1 FROM public.${t} LIMIT 1`);
    console.log(`  ✗ ${t.padEnd(30)} STILL EXISTS`);
    leakDetected = true;
  } catch (err) {
    console.log(`  ✓ ${t.padEnd(30)} dropped`);
  }
}

// --- Verify column changes on modified tables
console.log("\nColumn checks on modified tables:");
const colChecks = [
  ["profiles", "plan", false],
  ["profiles", "premium_until", false],
  ["profiles", "payout_method", false],
  ["profiles", "monthly_price", false],
  ["profiles", "yearly_price", false],
  ["subscriptions", "tier", false],
  ["direct_messages", "cost", false],
];
for (const [tbl, col, shouldExist] of colChecks) {
  const r = await c.query(
    `SELECT count(*)::int as n FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [tbl, col]
  );
  const exists = r.rows[0].n > 0;
  const ok = exists === shouldExist;
  console.log(`  ${ok ? "✓" : "✗"} ${tbl}.${col} ${exists ? "EXISTS" : "missing"} (want: ${shouldExist ? "exists" : "missing"})`);
}

// --- Verify dropped functions
console.log("\nFunction checks (should all be missing):");
const droppedFns = [
  "rpc_subscribe", "rpc_unlock_content", "rpc_paid_message", "rpc_donate",
  "rpc_live_access", "rpc_redeem_invite_code", "admin_generate_invite_codes",
  "wallet_spend", "wallet_topup", "wallet_credit_creator", "wallet_request_payout",
  "_log_behavior", "_grant_creator_welcome", "cron_revert_expired_premium",
];
for (const fn of droppedFns) {
  const r = await c.query(
    `SELECT count(*)::int as n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname=$1`,
    [fn]
  );
  const exists = r.rows[0].n > 0;
  console.log(`  ${exists ? "✗" : "✓"} ${fn.padEnd(40)} ${exists ? "STILL EXISTS" : "dropped"}`);
}

// --- RLS policies on new tables
console.log("\nRLS policies on new tables:");
for (const t of newTables) {
  const r = await c.query(
    `SELECT polname FROM pg_policy WHERE polrelid = ('public.' || $1)::regclass ORDER BY polname`,
    [t]
  );
  console.log(`  ${t}:`);
  r.rows.forEach(p => console.log(`    - ${p.polname}`));
}

await c.end();

if (leakDetected) {
  console.log("\n✗ LEAK DETECTED — some dropped tables still exist.");
  process.exit(1);
} else {
  console.log("\n✓ Migration verified clean.");
}
