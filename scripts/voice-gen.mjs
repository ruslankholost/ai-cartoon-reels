// node scripts/voice-gen.mjs <episode> [--char dave,barb,linda,chad,phone] [--cand 1,2] [--lines 4,6] [--tries 3] [--from 1]
// One ElevenLabs take per call (eleven_v4, with-timestamps) -> scratch/voice-raw/<episode>/<char>-<cand>-<voice>/L<nn>-t<k>.mp3 + .json
// (say, settings, word times with the [tags] stripped). The lines come from episodes/<episode>.jsonc. Take k uses direction k of the line
// (cycles), so takes differ in delivery. Without --cand each character is voiced by the episode's cast pick. Existing takes are skipped.
// The key is read from .env and never printed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const key = /^ELEVENLABS_API_KEY=(.+)$/m.exec(fs.readFileSync(new URL("../.env", import.meta.url), "utf8"))?.[1]?.trim();
if (!key) throw new Error("no ELEVENLABS_API_KEY");
const EP_NAME = process.argv[2];
const EP = JSON.parse(fs.readFileSync(new URL(`../episodes/${EP_NAME}.jsonc`, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
const RAW = path.join(fileURLToPath(new URL("../scratch/voice-raw/", import.meta.url)), EP_NAME);
const VOICES = JSON.parse(fs.readFileSync(new URL("../scratch/voices.json", import.meta.url), "utf8"));

// candidates per character, picked from the account by labels + description (never the owner's own voices). The number in the raw folder name
// is the position here (dave-1-callum, chad-3-eric). Each episode file names its cast and runner-up by that number; Will was auditioned and dropped.
const CAST = {
  dave: ["N2lVS1w4EtoT3dr4eOWO", "CwhRBWXzGAHq8TQ4Fs17"], // Callum (husky, gravelly) / Roger (laid-back, resonant)
  barb: ["XrExE9yKIg1WjnnlVkGX", "SAz9YHcvj6GT2YYXdXww"], // Matilda (alto, professional) / River (relaxed, neutral)
  linda: ["hpp4J3VqNfWAUOO0d1Us", "EXAVITQu4vr4xnSDxMaL"], // Bella (middle-aged, bright) / Sarah (warm, mature)
  chad: ["3IwIPyXc0WRkgKBE8KXP", "bIHbv24MWmeRgasZH58o", "cjVigY5qzO86Huf0OWal"], // jack-ed (smooth, cheesy charm) / Will (relaxed optimist) / Eric (smooth tenor)
  phone: ["FGY2WhTYpPnrIDTdsKH5", "cgSgspJ2msm6clMCkdW9"], // Laura (sunny, quirky) / Jessica (playful, bright)
  // season 1 (docs/bible.md): Phantom the cat narrates; Sarah and Lisa replace Barb and Linda
  phantom: ["nPczCjzI2devNBz1zQrb", "auq43ws1oslv0tO4BDa7", "xp3gDg85YgFcWpnNVlIu"], // Brian (deep, resonant) / Adam Stone (deep, British) / jack-nubee (mature)
  sarah: ["XrExE9yKIg1WjnnlVkGX", "EXAVITQu4vr4xnSDxMaL", "SAz9YHcvj6GT2YYXdXww"], // Matilda (alto) / Sarah (mature) / River (neutral)
  lisa: ["cgSgspJ2msm6clMCkdW9", "hpp4J3VqNfWAUOO0d1Us"], // Jessica (playful, bright) / Bella (bright, warm)
  chuck: ["2vubyVoGjNJ5HPga4SkV", "pqHfZKP75CvOlQylNhV4"], // jack-chris-boston (Boston, character) / Bill (old, crisp)
  // "Nobody Picks Up" (2026-10-20): a composite cast, one episode each
  denise: ["hpp4J3VqNfWAUOO0d1Us", "EXAVITQu4vr4xnSDxMaL"], // Bella (bright, middle-aged) / Sarah (mature)
  tony: ["CwhRBWXzGAHq8TQ4Fs17", "iP95p4xoKVk53GoZ742B"], // Roger (laid-back) / Chris (down-to-earth)
  voicemail: ["FGY2WhTYpPnrIDTdsKH5", "cgSgspJ2msm6clMCkdW9"], // Laura (sunny) / Jessica (bright)
  agency: ["TX3LPaxmHKxFdv7VOQHJ", "Q0Et7LOU7VpeoeCRQAVS"], // Liam (social media creator) / Derek (fun, energetic)
  marco: ["cjVigY5qzO86Huf0OWal", "iP95p4xoKVk53GoZ742B"], // Eric (smooth) / Chris
  wife: ["XrExE9yKIg1WjnnlVkGX", "pFZP5JQG7iQjIQuC4Bku"], // Matilda (alto) / Lily (velvety)
  gary: ["2vubyVoGjNJ5HPga4SkV", "N2lVS1w4EtoT3dr4eOWO", "SOYHLrjzK2X1ezoPC6cr"], // jack-chris-boston (Boston character) / Callum (husky) / Harry (rough)
  // "Tip?" (Denise reuses her line above)
  kyle: ["Myb1gsDenT3mlMlj7vib", "bIHbv24MWmeRgasZH58o"], // jack-james (calm, young) / Will (chill)
  machine: ["FGY2WhTYpPnrIDTdsKH5", "cgSgspJ2msm6clMCkdW9"], // Laura (sunny) / Jessica (bright)
  attendant: ["pqHfZKP75CvOlQylNhV4", "CwhRBWXzGAHq8TQ4Fs17"], // Bill (old, crisp) / Roger (laid-back)
  lily: ["cgSgspJ2msm6clMCkdW9", "FGY2WhTYpPnrIDTdsKH5"], // Jessica (cute), pitched up after generation / Laura ("Tip?" v1 and v2 only: her lines and the pitch note are gone from episodes/tip.jsonc)
  // "Because" (2026-10-21): Denise reuses her line above (Bella)
  cashier: ["rPMkKgdwgIwqv4fXgR6N", "bIHbv24MWmeRgasZH58o"], // jack-tyler (young, American, quick; not jack-james, who is Kyle) / Will (young, chill)
  rhonda: ["XrExE9yKIg1WjnnlVkGX", "SAz9YHcvj6GT2YYXdXww"], // Matilda (alto, middle-aged) / River (relaxed, neutral)
  // "Sell Me This Pen" (2026-10-21): Denise (Bella) and Rhonda (Matilda) reuse their lines above
  brandon: ["3IwIPyXc0WRkgKBE8KXP", "pNInz6obpgDQGcFmaJgB"], // jack-ed (smooth, cheesy charm: the slick salesman; only Chad's audition voice, every cast has Eric) / Adam (bright tenor, brash, openly confident: the smug one; no character has him)
  guest1: ["EXAVITQu4vr4xnSDxMaL"], // Sarah (warm, mature, American): the first 1950s guest
  guest2: ["pFZP5JQG7iQjIQuC4Bku"], // Lily (velvety, middle-aged): the oldest-sounding woman on the account
  guest3: ["SAz9YHcvj6GT2YYXdXww"], // River (relaxed, calm, American): flat enough for "glazed"
  // "Cold Lips" (2026-10-22): Denise reuses her line above (Bella). Two library voices were auditioned too (Ivanna gE0owC0H9C8SzfDyIUtB, Nolan R9EZoy8pXSL8Yh4yxiew) and lost; only winners are added to the account
  customer: ["pFZP5JQG7iQjIQuC4Bku", "flHkNRp1BlvT73UL6gyz"], // Lily (velvety, British: only a tiny part in "tup", out on accent) / Jessica Anne Bogart (library: American, middle-aged, "wickedly eloquent, cruel and calm")
  todd: ["Q0Et7LOU7VpeoeCRQAVS", "SDARFhQygpPvpLh7Ad1B"], // Derek (fun, energetic: radio host; used once as "agency") / Odd Todd (library: American, early 40s, nervous, cracking voice)
  // x08 "Just Let Me Pay" (2026-10-24): Ross plays himself. Ross: "use the one that will be super emotional from our latest cartoons and sounds like mine but without my accent". Against his own
  // recordings (median pitch 125 Hz): jack-tyler 131 Hz and the closest timbre, Liam 124 Hz and the widest range in his takes, Harry 113 Hz and rough. Never his cloned voice (docs/production.md).
  ross: ["rPMkKgdwgIwqv4fXgR6N", "TX3LPaxmHKxFdv7VOQHJ", "SOYHLrjzK2X1ezoPC6cr"], // jack-tyler (young American creator; the "Because" cashier) / Liam (energetic creator; "agency") / Harry (rough)
  // x09 "Habits of the Rich" (2026-10-24): the get-rich guru who shouts every habit
  guru: ["Q0Et7LOU7VpeoeCRQAVS", "pNInz6obpgDQGcFmaJgB", "3IwIPyXc0WRkgKBE8KXP"], // Derek (radio host energy; auditioned for Todd in "Cold Lips") / Adam (brash, openly confident) / jack-ed (the slick salesman, Brandon)
  // x10 "My Own Business" (2026-10-25): Ross and Chuck reuse their lines above; the three hands at the till are one short line each
  tyler: ["Myb1gsDenT3mlMlj7vib", "TX3LPaxmHKxFdv7VOQHJ"], // jack-james (calm, young: Kyle in "Tip?") / Liam (young creator; Ross's runner-up)
  landlord: ["N2lVS1w4EtoT3dr4eOWO"], // Callum (husky, gravelly)
  supplier: ["CwhRBWXzGAHq8TQ4Fs17"], // Roger (laid-back)
  accountant: ["XrExE9yKIg1WjnnlVkGX"], // Matilda (alto, professional)
  guy: ["bIHbv24MWmeRgasZH58o", "iP95p4xoKVk53GoZ742B"], // Will (relaxed optimist) / Chris (down-to-earth): the guy who walks home at 5 pm
  // x16 "Hiring a Zoomer" (2026-10-27): Kenzie, 22, livestreams her interview; her mom negotiates on FaceTime
  kenzie: ["FGY2WhTYpPnrIDTdsKH5", "cgSgspJ2msm6clMCkdW9"], // Laura (young, sassy, social media; x15's robocall) / Jessica (young, playful)
  mom: ["flHkNRp1BlvT73UL6gyz", "hpp4J3VqNfWAUOO0d1Us", "EXAVITQu4vr4xnSDxMaL"], // Jessica Anne Bogart (middle-aged, crisp, "cruel and calm": Cold Lips' customer) / Bella (middle-aged, bright) / Sarah (young, confident: x18's scrolling mom, a voice no recent episode used)
  // x17 "Seat Swap" (2026-10-27): the honeymoon couple, the flight attendant, the pilot
  bride: ["cgSgspJ2msm6clMCkdW9", "FGY2WhTYpPnrIDTdsKH5"], // Jessica (young, cute, bright) / Laura (young, sassy)
  groom: ["bIHbv24MWmeRgasZH58o", "TX3LPaxmHKxFdv7VOQHJ"], // Will (young, chill) / Liam (young, energetic)
  fa: ["hpp4J3VqNfWAUOO0d1Us", "XrExE9yKIg1WjnnlVkGX"], // Bella (professional, bright: the frozen airline smile) / Matilda (upbeat, professional)
  pilot: ["nPczCjzI2devNBz1zQrb", "pqHfZKP75CvOlQylNhV4"], // Brian (deep, resonant: the captain's voice) / Bill (old, crisp)
  // x18 "Unattended" (2026-10-27): the mom is "mom" 3 above; the kids are adult takes pitched up in voice-build (plan "pitch")
  grandpa: ["pqHfZKP75CvOlQylNhV4"], // Bill (old, crisp): the last drop-off at the door
  kid1: ["cgSgspJ2msm6clMCkdW9"], // Jessica (cute), pitched up: the toddler
  kid2: ["FGY2WhTYpPnrIDTdsKH5"], // Laura (sassy), pitched up: a girl in the chant
  kid3: ["Myb1gsDenT3mlMlj7vib"], // jack-james (calm, young), pitched up: a boy in the chant
  // x20 "One Coffee" (2026-10-29): the laptop camper and the three guys from his startup
  camper: ["pNInz6obpgDQGcFmaJgB", "bIHbv24MWmeRgasZH58o"], // Adam (bright tenor, brash, openly confident) / Will (relaxed optimist)
  dev1: ["Q0Et7LOU7VpeoeCRQAVS"], // Derek (fun, energetic)
  dev2: ["iP95p4xoKVk53GoZ742B"], // Chris (down-to-earth)
  dev3: ["Myb1gsDenT3mlMlj7vib"], // jack-james (calm, young): "...Just water."
};

// a direction is {t: tags, st: stability, sy: style, text: optional override, since punctuation changes the pacing}. Take k of a line uses
// direction k, so new directions go at the END of a list (takes already made keep their meaning).
const LINES = EP.lines;

const slug = (id) => VOICES.find((v) => v.voice_id === id).name.split(" ")[0].toLowerCase();
const voiceName = (id) => VOICES.find((v) => v.voice_id === id).name;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function speak(voiceId, say, vs) {
  for (let a = 1; ; a++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: say, model_id: "eleven_v4", voice_settings: { stability: vs.st, similarity_boost: 0.8, style: vs.sy, use_speaker_boost: true } }),
    });
    if ((res.status === 429 || res.status >= 500) && a < 6) { await sleep(2000 * a); continue; }
    if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    const al = j.alignment;
    const words = [];
    let cur = null, inTag = false;
    al.characters.forEach((ch, i) => {
      if (ch === "[") inTag = true;
      if (inTag) { if (ch === "]") inTag = false; return; }
      if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
      if (!cur) cur = { w: "", d: "", t: al.character_start_times_seconds[i], e: 0 };
      cur.d += ch;
      cur.e = al.character_end_times_seconds[i];
    });
    if (cur) words.push(cur);
    const clean = words.map((x) => ({ w: x.d.toLowerCase().replace(/[^a-z0-9']/g, ""), d: x.d, t: x.t, e: x.e })).filter((x) => x.w);
    return { mp3: Buffer.from(j.audio_base64, "base64"), dur: clean[clean.length - 1]?.e ?? 0, words: clean };
  }
}

{
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
  const chars = (arg("char", Object.keys(CAST).join(","))).split(",");
  const candArg = arg("cand", "");
  const only = arg("lines", "").split(",").filter(Boolean).map(Number);
  const tries = Number(arg("tries", 2));
  const from = Number(arg("from", 1));
  const jobs = [];
  for (const line of LINES) {
    if (!chars.includes(line.char) || (only.length && !only.includes(line.n))) continue;
    for (const c of candArg ? candArg.split(",").map(Number) : [EP.cast[line.char]]) {
      const id = CAST[line.char][c - 1];
      const dir = path.join(RAW, `${line.char}-${c}-${slug(id)}`);
      fs.mkdirSync(dir, { recursive: true });
      for (let k = from; k < from + tries; k++) {
        const d = line.dirs[(k - 1) % line.dirs.length];
        jobs.push({ base: path.join(dir, `L${String(line.n).padStart(2, "0")}-t${k}`), id, line, c, k, d, say: `${d.t} ${d.text ?? line.text}` });
      }
    }
  }
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      if (fs.existsSync(`${j.base}.json`)) continue;
      const r = await speak(j.id, j.say, j.d);
      fs.writeFileSync(`${j.base}.mp3`, r.mp3);
      fs.writeFileSync(`${j.base}.json`, JSON.stringify({ n: j.line.n, char: j.line.char, cand: j.c, take: j.k, voice: voiceName(j.id), voiceId: j.id, text: j.line.text, say: j.say, vs: j.d, dur: r.dur, words: r.words }));
      console.log(`${path.basename(path.dirname(j.base))}/${path.basename(j.base)}  dur ${r.dur.toFixed(2)}  [${r.words.map((w) => w.d).join(" ")}]`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log("done", jobs.length, "jobs; raw dir", RAW);
}
