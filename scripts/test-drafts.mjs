import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await sb.auth.signInWithPassword({
  email: "creator-test@tokaro.local", password: "CreatorTest!2026",
});
if (error) { console.error(error.message); process.exit(1); }
const token = data.session.access_token;

// Use the existing test course (created earlier)
const courseId = "5a08eeb5-0bef-4df7-9d0e-35bc4d4f04d6";

console.log("=== save-draft x3 (testing versioning) ===");
for (let i = 1; i <= 3; i++) {
  const r = await fetch("http://localhost:5173/api/courses/save-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      course: { id: courseId, title: `Draft v${i}`, description: `Test ${i}` },
      lessons: [{ id: "l-1", title: `Lezione ${i}` }],
    }),
  });
  console.log(`  v${i}:`, r.status, await r.text());
  await new Promise((r) => setTimeout(r, 100));
}

console.log("\n=== get latest draft ===");
const r = await fetch(`http://localhost:5173/api/courses/${courseId}/draft`, {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await r.json();
console.log("  status:", r.status);
console.log("  version:", body.version);
console.log("  course.title:", body.draft?.course?.title);
console.log("  lessons:", body.draft?.lessons?.length);
console.log("  created_at:", body.created_at);
