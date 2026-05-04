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

async function check(name) {
  const { error } = await supabase.from(name).select("*").limit(1);
  if (error) {
    if (error.code === "PGRST205" || /does not exist|relation/i.test(error.message)) {
      return { name, exists: false };
    }
    return { name, exists: true, warn: error.message };
  }
  return { name, exists: true };
}

const results = await Promise.all([
  check("invite_codes"),
  check("conversation_unlocks"),
  check("welcome_bonus_log"),
  check("user_behavior_log"),
]);

let missing = 0;
for (const r of results) {
  console.log(`${r.exists ? "✓" : "✗"} ${r.name}${r.warn ? "  (" + r.warn + ")" : ""}`);
  if (!r.exists) missing++;
}

if (missing > 0) {
  console.log(`\nMigrazione NON applicata. Esegui supabase/beta_launch.sql nel SQL Editor.`);
  process.exit(1);
} else {
  console.log("\nMigrazione applicata, tabelle beta presenti.");
}
