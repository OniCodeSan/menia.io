import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .reduce((acc, l) => {
    const [k, ...v] = l.split("=");
    acc[k.trim()] = v.join("=").trim();
    return acc;
  }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check for admin accounts
const { data: admins } = await supabase
  .from("profiles")
  .select("email, full_name")
  .eq("role", "admin");

console.log(`Admins on this project: ${admins?.length || 0}`);
admins?.forEach((a) => console.log(`  - ${a.email} (${a.full_name || "unnamed"})`));

// Generate a few test invite codes directly (bypassing the admin RPC since we may not have an admin)
// 5 codes, 50 tokens each
const codes = [];
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode() {
  let c = "";
  for (let i = 0; i < 8; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
  return c;
}

for (let i = 0; i < 5; i++) codes.push({ code: genCode(), tokens_amount: 50, notes: "Beta seed" });

const { data: inserted, error } = await supabase
  .from("invite_codes")
  .upsert(codes, { onConflict: "code" })
  .select();

if (error) {
  console.error("\nFailed to insert invite codes:", error.message);
  process.exit(1);
}

console.log("\n✓ 5 invite codes ready (each = 50 tokens):");
inserted.forEach((c) => console.log(`  ${c.code}`));
