// node scripts/voices.mjs  -> lists the account's voices (name, id, category, labels, description); the key is read from .env and never printed
import fs from "node:fs";
const key = /^ELEVENLABS_API_KEY=(.+)$/m.exec(fs.readFileSync(new URL("../.env", import.meta.url), "utf8"))?.[1]?.trim();
if (!key) throw new Error("no ELEVENLABS_API_KEY");
let all = [], next = null;
for (let i = 0; i < 10; i++) {
  const url = new URL("https://api.elevenlabs.io/v2/voices");
  url.searchParams.set("page_size", "100");
  if (next) url.searchParams.set("next_page_token", next);
  const r = await fetch(url, { headers: { "xi-api-key": key } });
  if (!r.ok) { console.error(r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  const j = await r.json();
  all = all.concat(j.voices);
  if (!j.has_more) break;
  next = j.next_page_token;
}
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/voices.json", JSON.stringify(all, null, 1));
for (const v of all) {
  console.log(`${v.name} | ${v.voice_id} | ${v.category} | ${JSON.stringify(v.labels ?? {})} | ${(v.description ?? "").slice(0, 140)}`);
}
console.log("total", all.length);
