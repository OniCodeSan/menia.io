import { readFileSync } from "fs";
import { spawn } from "child_process";
import { setTimeout as wait } from "timers/promises";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const childEnv = {
  ...process.env,
  SUPABASE_URL: env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_SECRET: "smoke-admin-secret-32-chars-padding-1234567890",
  PORT: "3099",
  PRE_LAUNCH_MODE: "false",
};

const proc = spawn("node", ["index.js"], { env: childEnv, cwd: "server", stdio: ["ignore", "pipe", "pipe"] });
const logs = [];
proc.stdout.on("data", (d) => logs.push("[out] " + d.toString().trim()));
proc.stderr.on("data", (d) => logs.push("[err] " + d.toString().trim()));
proc.on("exit", (code) => logs.push(`[exit] code=${code}`));

// Wait until the server is actually listening (max 8s)
let ready = false;
for (let i = 0; i < 40; i++) {
  await wait(200);
  if (logs.some((l) => l.includes("listening on 127.0.0.1"))) { ready = true; break; }
  // Also try a TCP probe — listening might happen before stdout flushes
  try {
    const r = await fetch("http://127.0.0.1:3099/api/health", { signal: AbortSignal.timeout(150) });
    if (r.status) { ready = true; break; }
  } catch {}
}
if (!ready) {
  console.log("Server failed to listen within 8s. Logs:");
  logs.forEach((l) => console.log("  " + l));
  proc.kill("SIGTERM");
  process.exit(1);
}
console.log("Server listening — running checks...\n");

async function check(method, path, expectStatus) {
  try {
    const r = await fetch(`http://127.0.0.1:3099${path}`, { method });
    const ok = r.status === expectStatus;
    console.log(`${ok ? "✓" : "✗"} ${method} ${path.padEnd(42)} → ${r.status} (expect ${expectStatus})`);
    return ok;
  } catch (err) {
    console.log(`✗ ${method} ${path.padEnd(42)} → ${err.message}`);
    return false;
  }
}

let pass = 0, total = 0;
for (const [m, p, s] of [
  ["GET",  "/api/health",                   200],
  ["GET",  "/api/courses",                  200],
  ["GET",  "/api/live-events",              200],
  ["GET",  "/api/community/00000000-0000-0000-0000-000000000000", 200],
  ["POST", "/api/checkout/start",           410],
  ["GET",  "/api/admin/wallet/x",           410],
  ["GET",  "/api/admin/orders",             410],
  ["GET",  "/api/admin/payouts",            410],
  ["POST", "/api/admin/grant-course-access", 403], // no admin auth provided
]) {
  total++;
  if (await check(m, p, s)) pass++;
}

console.log(`\n${pass}/${total} checks passed`);
console.log("\n--- server logs ---");
logs.slice(-20).forEach(l => console.log(l));

proc.kill("SIGTERM");
process.exit(pass === total ? 0 : 1);
