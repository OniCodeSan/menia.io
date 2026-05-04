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

const accounts = [
  {
    email: "fan-test@tokaro.local",
    password: "FanTest!2026",
    role: "fan",
    full_name: "Fan Tester",
    handle: "fan_tester",
    bio: "Account beta tester (fan)",
  },
  {
    email: "creator-test@tokaro.local",
    password: "CreatorTest!2026",
    role: "creator",
    full_name: "Creator Tester",
    handle: "creator_tester",
    bio: "Account beta tester (creator)",
  },
];

for (const acc of accounts) {
  console.log(`\n--- ${acc.role.toUpperCase()}: ${acc.email} ---`);

  const existing = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const dup = existing.data?.users?.find((u) => u.email === acc.email);
  if (dup) {
    console.log(`Auth user already exists (${dup.id}), deleting and recreating for clean state…`);
    await supabase.from("welcome_bonus_log").delete().eq("email", acc.email);
    await supabase.auth.admin.deleteUser(dup.id);
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
    user_metadata: { role: acc.role, full_name: acc.full_name },
  });
  if (createErr) {
    console.error("Create error:", createErr.message);
    continue;
  }
  const userId = created.user.id;
  console.log(`Created auth user ${userId}`);

  const { error: profErr } = await supabase.from("profiles").upsert({
    id: userId,
    email: acc.email,
    full_name: acc.full_name,
    handle: acc.handle,
    bio: acc.bio,
    role: acc.role,
    onboarding_complete: true,
  });
  if (profErr) {
    console.error("Profile error:", profErr.message);
    continue;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan, premium_until")
    .eq("id", userId)
    .single();

  console.log(`Profile saved. role=${profile.role} plan=${profile.plan} premium_until=${profile.premium_until || "—"}`);
}

console.log("\n✓ Done. Test logins:");
for (const a of accounts) {
  console.log(`  ${a.role.padEnd(7)} → ${a.email}  /  ${a.password}`);
}
