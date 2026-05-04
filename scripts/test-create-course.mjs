import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n").filter(l => l.trim() && !l.startsWith("#"))
  .reduce((a, l) => { const [k, ...v] = l.split("="); a[k.trim()] = v.join("=").trim(); return a; }, {});

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await sb.auth.signInWithPassword({
  email: "creator-test@tokaro.local",
  password: "CreatorTest!2026",
});
if (error) { console.error("login failed:", error.message); process.exit(1); }
const token = data.session.access_token;
console.log("logged in as", data.user.email, "id:", data.user.id);

const r = await fetch("http://localhost:5173/api/courses", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ title: "Nuovo corso", price: 19.90, is_published: false }),
});
console.log("status:", r.status);
const body = await r.text();
console.log("body:", body);
