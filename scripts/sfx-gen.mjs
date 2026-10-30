// node scripts/sfx-gen.mjs sfx <name> <seconds> "<prompt>"   -> scratch/sfx-raw/<name>.mp3  (ElevenLabs sound-generation)
// node scripts/sfx-gen.mjs music <name> <seconds> "<prompt>" -> scratch/sfx-raw/<name>.mp3  (ElevenLabs music)
// The key is read from .env and never printed.
import fs from "node:fs";
const [kind, name, secs, ...p] = process.argv.slice(2);
const key = /^ELEVENLABS_API_KEY=(.+)$/m.exec(fs.readFileSync(new URL("../.env", import.meta.url), "utf8").replace(/\0/g, ""))?.[1]?.trim();
if (!key) throw new Error("no ELEVENLABS_API_KEY in .env");
const prompt = p.join(" ");
const req = kind === "music"
  ? ["https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", { prompt, music_length_ms: Math.round(Number(secs) * 1000), force_instrumental: true }]
  : ["https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", { text: prompt, duration_seconds: Number(secs), prompt_influence: 0.6 }];
const res = await fetch(req[0], { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify(req[1]) });
if (!res.ok) { console.error(res.status, (await res.text()).slice(0, 400)); process.exit(1); }
fs.mkdirSync(new URL("../scratch/sfx-raw/", import.meta.url), { recursive: true });
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(new URL(`../scratch/sfx-raw/${name}.mp3`, import.meta.url), buf);
console.log(kind, name, buf.length, "bytes");
