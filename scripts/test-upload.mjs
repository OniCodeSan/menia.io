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
if (error) { console.error(error.message); process.exit(1); }

// Build a minimal fake video blob (not a real MP4, but tests the auth + flow)
const fakeMp4 = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
  0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
]);
const blob = new Blob([fakeMp4], { type: "video/mp4" });
const fd = new FormData();
fd.append("file", blob, "test.mp4");

const r = await fetch("http://localhost:5173/api/upload/video", {
  method: "POST",
  headers: { Authorization: `Bearer ${data.session.access_token}` },
  body: fd,
});
console.log("status:", r.status);
console.log("body:", await r.text());
