// The writers' room on the Anthropic API: a premise -> beats (3 angles, judged) -> script -> notes from 4 critics -> rewrite (up to 2 rounds)
// -> storyboard in the episode format -> notes from 3 critics -> rewrite -> episodes/<ep>.draft.jsonc and docs/<ep>-draft.md (a plain-English summary for the owner).
//   node scripts/writers-room.mjs <episode>            premise in docs/pitches/<episode>.md; every step is saved in scratch/room/<episode>/
// A step whose file exists is skipped, so a run resumes; delete a file to redo that step and what follows. The key is ANTHROPIC_API_KEY in .env.
// Every call's tokens and cost go to scratch/room/<episode>/usage.jsonl.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EP = process.argv[2];
if (!EP) throw new Error("usage: node scripts/writers-room.mjs <episode>");
const DIR = path.join(ROOT, "scratch", "room", EP);
fs.mkdirSync(DIR, { recursive: true });
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const KEY = /^ANTHROPIC_API_KEY=(.+)$/m.exec(read(".env").replace(/\0/g, ""))?.[1]?.trim();
if (!KEY) throw new Error("no ANTHROPIC_API_KEY in .env");
const MODEL = process.env.ROOM_MODEL || "claude-opus-5-5";
const PRICE = { "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10] }; // $ per M input / output tokens (platform.claude.com pricing, 2026-10-19)

const BIBLE = read("docs/bible.md");
const RULES = fs.existsSync(path.join(ROOT, "docs/reel-rules.md")) ? read("docs/reel-rules.md") : "";
const PREMISE = read(`docs/pitches/${EP}.md`);
const EXAMPLE = read("episodes/be-chad.jsonc"); // the format, and an approved episode
const SFX = fs.readdirSync(path.join(ROOT, "public", "sfx")).map((f) => f.replace(/\.mp3$/, ""));
const SYSTEM = `You are part of the writers' room of an adult animated series. Follow the series bible exactly.\n\n${BIBLE}\n\n${RULES ? "# Reel rules (from our Instagram playbooks)\n" + RULES : ""}`;

// one call, streamed (long thinking would outlive a plain request), adaptive thinking at high effort; returns the text
async function ask(step, prompt, { maxTokens = 24000, model = MODEL } = {}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, thinking: { type: "adaptive" }, output_config: { effort: "high" }, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`${step}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  let text = "", usage = {}, buf = "";
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ev = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = ev.split("\n").find((l) => l.startsWith("data: "));
      if (!data) continue;
      const d = JSON.parse(data.slice(6));
      if (d.type === "content_block_delta" && d.delta.type === "text_delta") text += d.delta.text;
      if (d.type === "message_start") usage = { ...d.message.usage };
      if (d.type === "message_delta" && d.usage) usage = { ...usage, ...d.usage };
      if (d.type === "error") throw new Error(`${step}: ${JSON.stringify(d.error)}`);
    }
  }
  const [pi, po] = PRICE[model] ?? [0, 0];
  const cost = ((usage.input_tokens ?? 0) * pi + (usage.output_tokens ?? 0) * po) / 1e6;
  fs.appendFileSync(path.join(DIR, "usage.jsonl"), JSON.stringify({ step, model, ...usage, cost: +cost.toFixed(4), at: new Date().toISOString() }) + "\n");
  console.log(`${step}: ${usage.input_tokens} in, ${usage.output_tokens} out, $${cost.toFixed(3)}`);
  return text;
}
const json = (t) => { // the example episode is jsonc, so replies can carry its whole-line // comments
  const s = (/```(?:json[c]?)?\s*([\s\S]*?)```/.exec(t)?.[1] ?? t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)).replace(/^\s*\/\/.*$/gm, "").trim();
  try { return JSON.parse(s); } catch (e) { fs.writeFileSync(path.join(DIR, "failed-reply.txt"), t); throw e; } // keep the paid reply
};
async function step(name, make) { // a saved step is reused
  const f = path.join(DIR, name);
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  const out = await make();
  fs.writeFileSync(f, out);
  return out;
}

// ── 1. beats: three angles in parallel, then a judge merges the best ──
const ANGLES = [
  "Grounded sitcom: a situation every trade-business owner has lived through, told straight, each step a small believable exaggeration of the last.",
  "Build it on the fence: Dave and Sarah against Chad and Lisa next door, with Phantom's dry narration landing the biggest laughs.",
  "One piece of marketing advice owners actually hear, followed literally and logically until it backfires.",
];
const BEATS_ASK = (angle) => `Premise for the next episode:\n${PREMISE}\n\nAngle: ${angle}\n\nWrite a beat sheet for a 35-45 s episode: a title; a one-line logline; three hook options for the first 1-3 s (picture + line); the 8 Story Circle steps, each with what is on screen and the line(s) said; the escalation ladder; the ironic ending and the last line; the two end-card lines. Mark which beats are a visual gag with no line. Respect every rule and every picture limit in the bible.`;
const beats = await Promise.all(ANGLES.map((a, i) => step(`10-beats-${i + 1}.md`, () => ask(`beats-${i + 1}`, BEATS_ASK(a)))));
const pick = await step("11-beats-pick.md", () => ask("beats-judge", `Three beat sheets for the same premise:\n\n${beats.map((b, i) => `## Sheet ${i + 1}\n${b}`).join("\n\n")}\n\nScore each 1-10 on: hook (does it stop the scroll in 1 second), relatability for an owner of a trade business, cause and effect (each step caused by the one before), laughs (an absurd image or a laugh every 2-3 s), the ending (ironic, earned, shareable: "send it to your Dave"), producibility within the picture limits. Show the scores in a table. Then write ONE final beat sheet: the winner, improved with the best ideas from the others (say which ideas you took). Same structure as the sheets.`));

// ── 2. script, then critics and rewrites ──
const WPS = 2.1; // spoken words per second of our ElevenLabs voices: the pilot 2.2, episode 2 2.0 (public/*/timings.json)
const spoken = (sc) => [...sc.split(/\n#+\s*change log/i)[0].matchAll(/^\**[A-Z][A-Z ]+\**\s*(?:\([^)]*\))?\s*:\s*"([^"]+)"/gm)].reduce((n, m) => n + m[1].split(/\s+/).length, 0);
const SCRIPT_ASK = `Write the full script from this beat sheet:\n\n${pick}\n\nFormat: scene headings; short action lines saying exactly what is on screen; every line as SPEAKER (direction): "line" [estimated seconds when said aloud]. Our voices speak about 2.1 words per second (measured on the pilot and episode 2), so a line of 2.5 s is about 5 words and 35-45 s holds about 60-75 spoken words in all (the pilot: 61); count them. Mark the bleeped swear words with *asterisks*. Pace of the pilot: 36 shots in 40 s; scenes of 1-3 shots; no scene over about 6 s; cut beats from the sheet without mercy to fit; the dialogue carries only what the picture cannot. End with the total estimated running time (35-45 s including silent gags) and the two end-card lines.`;
const CRITICS = {
  story: "STORY LOGIC. Check the Story Circle step by step; cause and effect; what Dave wants and the price he pays; setups and payoffs (the hook paid off later); holes a viewer would ask about (\"why doesn't he just...?\"); whether the ending is earned and ironic per the bible.",
  comedy: "COMEDY. Laugh density (a laugh or absurd image every 2-3 s); the funny word at the END of each line; jokes that are clichés or explained; the adult tone kept inside the bible's limits; the running gags used well; the economy of Phantom's narration; a stronger last line if there is one.",
  retention: "INSTAGRAM RETENTION. The first 1-2 s (picture and line) must stop the scroll; something new happens at least every 2-3 s; a pattern break at about one third and two thirds; no dead air; total length 35-45 s, which is 60-75 spoken words at our voices' 2.1 words per second (count them); the share trigger at the end; every line short enough to read as a caption.",
  realism: "REALISM. Read the bible's tone section. For every beat: does this really happen to owners of trade businesses (or is it a small step past what happens)? Flag anything random, cartoonishly violent or too unhinged, and anything a real person would not do; more than one absurd escalation is a must-fix. Say what the believable version is.",
  voice: "DIALOGUE VOICE. Apply the anti-AI rules in the bible to every line; read each line aloud: does a real tired funny person say it this way; each character sounds like themselves; no line over about 2.5 s; no stage directions inside the spoken text; nothing that reads as translated.",
};
const NOTES_ASK = (lens, script) => `You are the ${lens}\n\nThe script:\n\n${script}\n\nReturn JSON only, in a json code block: {"score": 1-10, "must": ["a concrete problem -> the concrete fix", ...], "should": [...]}. "must" is only for problems that would make a viewer scroll away, confuse them or break a bible rule. Quote the line or beat you mean.`;
let script = await step("20-script-1.md", () => ask("script-1", SCRIPT_ASK));
for (let round = 1; round <= 3; round++) {
  const notes = await Promise.all(Object.entries(CRITICS).map(([k, lens]) => step(`2${round}-notes-${k}.json`, async () => JSON.stringify(json(await ask(`notes-${round}-${k}`, NOTES_ASK(lens, script), { maxTokens: 12000 })), null, 1))));
  const must = notes.map((n) => JSON.parse(n)).flatMap((n) => n.must ?? []);
  const words = spoken(script);
  if (words > 75) { must.push(`${words} spoken words, about ${(words / WPS).toFixed(0)} s of speech at ${WPS} words per second: cut to 60-75 words`); notes.push(JSON.stringify({ must: [must.at(-1)] })); }
  console.log(`round ${round}: ${must.length} must-fix notes; scores`, notes.map((n) => JSON.parse(n).score).join(" "));
  if (!must.length) break;
  script = await step(`2${round}-script-${round + 1}.md`, () => ask(`rewrite-${round}`, `The script:\n\n${script}\n\nNotes from the critics (JSON per critic):\n\n${[...Object.keys(CRITICS), "code checks"].map((k, i) => (notes[i] ? `## ${k}\n${notes[i]}` : "")).join("\n\n")}\n\nRewrite the script. Fix every "must" note; take a "should" note only when it makes the episode better. Keep what already works. Same format as the script. After the script, a short change log: each note, applied or rejected, and why.`));
}
script = script.split(/\n#+\s*change log/i)[0];

// ── 3. storyboard in the episode format, critics, rewrite ──
const BOARD_ASK = `Turn this approved script into the episode file.\n\n${script}\n\nThe format and an approved episode (episode 2, "Be Chad") are here; copy its structure, its voice-direction style (ElevenLabs audio tags in "t", stability "st", style "sy", an optional "text" override) and the level of detail of its shot prompts:\n\n${EXAMPLE}\n\nWrite JSON only, in a json code block, with these keys:
- "title", "cast" (copy the cast numbers from the example), "lines": [{n, char, text, dirs: [3 variants]}] (text with the real swear words; add "bleep": [word indices] for each bleeped word),
- "shots": [{id: "s01".., kind: "talk"|"move"|"still", who (talk only), cue: {line: n, word: i} for the shot that starts on word i of line n (word 0 = the first word), or dur: seconds for a shot that plays in the silence between lines, refs: [cast names in the shot], key: the keyframe prompt, move: the motion prompt (not for stills)}],
- "stamps": [{text, cue: {line, word} or after: shot id, dur}], "tableSfx": [{line, from: "start"|"end", off, sfx}] using only these sounds: ${SFX.join(", ")}; for a sound we do not have, add it to "newSfx": [{name, secs, prompt}] and use the name,
- "endcard": {lines: [2 lines]}.
Rules: every line is covered by one or more "talk" shots of its speaker (a cue on word 0 of each line; split a line over 2 shots only at a word boundary); a silent gag is one or more "move" or "still" shots with dur 0.5-2 s; a shot lasts 0.6-2.5 s; a cut every 1.1-1.3 s on average (the pilot: 36 shots in 40 s); the first shot is the hook. Every key prompt names the place, the light source, what each person wears and every prop, as in the example. Follow every picture limit in the bible.`;
let board = await step("30-board-1.json", async () => JSON.stringify(json(await ask("board-1", BOARD_ASK, { maxTokens: 40000 })), null, 1));
const BCRITICS = {
  continuity: "CONTINUITY AND SCENE LOGIC. Wardrobe and props in every shot match the scene and the shots before (a phone taped to the hand stays taped until it is torn off); places look the same each time; time of day; real light sources; who looks at what; nothing in a shot contradicts the script.",
  risk: "GENERATION RISK. Check every shot against the picture limits in the bible: one simple action per shot; a talking shot shows only its speaker; silent shots avoid talking-looking faces; no pouring, throwing-into or transforming in one shot; hands said explicitly; no small text or digits; glow wording. Give a safer staging for each risky shot.",
  pacing: "PACING. Shot lengths (0.6-2.5 s, average about 1.2 s); total length 35-45 s, which is 60-75 spoken words at our voices' 2.1 words per second (count them); the hook shot; every line covered by talk shots of its speaker; silent gags long enough to read and no longer; the stamps; the end.",
};
// rules code can check before any critic reads the board (the idea of FilmAgent's shot_review and stob's qc-inspector)
function lint(b) {
  const B = JSON.parse(b), out = [], lines = B.lines ?? [], shots = B.shots ?? [];
  const sec = (t) => t.split(/\s+/).length / WPS;
  for (const l of lines) {
    const own = shots.filter((s) => s.kind === "talk" && s.cue?.line === l.n);
    if (!own.length) out.push(`line ${l.n} (${l.char}) has no talk shot`);
    if (own.some((s) => s.who !== l.char)) out.push(`line ${l.n} is ${l.char}'s but a talk shot on it has who=${own.find((s) => s.who !== l.char).who}`);
    if (!own.some((s) => (s.cue.word ?? 0) === 0)) out.push(`line ${l.n}: no talk shot starts on its first word`);
    if (sec(l.text) > 3) out.push(`line ${l.n} is about ${sec(l.text).toFixed(1)} s long, over the 2.5 s limit`);
  }
  for (const s of shots) {
    if (s.kind === "talk" && !(s.refs ?? []).includes(s.who)) out.push(`${s.id}: talk shot of ${s.who} without ${s.who} in refs`);
    if (s.kind !== "talk" && !(s.dur >= 0.5 && s.dur <= 2)) out.push(`${s.id}: silent shot needs dur 0.5-2 s (has ${s.dur})`);
    if (s.kind === "talk" && s.dur) out.push(`${s.id}: a talk shot takes its length from the line, drop dur`);
    for (const w of ["glow", "vibrat", "pour"]) if (`${s.key} ${s.move ?? ""}`.toLowerCase().includes(w)) out.push(`${s.id}: "${w}" in the prompt (see the picture limits)`);
    if (!/(light|lamp|window|moon|sun|screen|tv|daylight|bulb|neon)/i.test(s.key)) out.push(`${s.id}: the key prompt names no light source`);
  }
  const total = lines.reduce((t, l) => t + sec(l.text), 0) + shots.filter((s) => s.kind !== "talk").reduce((t, s) => t + (s.dur ?? 0), 0);
  if (total < 32 || total > 48) out.push(`estimated length ${total.toFixed(0)} s, outside 35-45 s`);
  return out;
}

for (let round = 1; round <= 3; round++) {
  const found = lint(board);
  fs.writeFileSync(path.join(DIR, `3${round}-board-lint.txt`), found.join("\n") || "clean");
  console.log(`board round ${round}: lint ${found.length}`);
  const notes = await Promise.all(Object.entries(BCRITICS).map(([k, lens]) => step(`3${round}-board-notes-${k}.json`, async () => JSON.stringify(json(await ask(`board-notes-${round}-${k}`, NOTES_ASK(lens, board), { maxTokens: 16000 })), null, 1))));
  if (found.length) notes.push(JSON.stringify({ must: found }));
  const must = notes.map((n) => JSON.parse(n)).flatMap((n) => n.must ?? []);
  console.log(`board round ${round}: ${must.length} must-fix notes`);
  if (!must.length) break;
  board = await step(`3${round}-board-${round + 1}.json`, async () => JSON.stringify(json(await ask(`board-rewrite-${round}`, `The episode file:\n\n${board}\n\nNotes (JSON per critic; "code checks" are rule violations found by code):\n\n${[...Object.keys(BCRITICS), "code checks"].map((k, i) => (notes[i] ? `## ${k}\n${notes[i]}` : "")).join("\n\n")}\n\nReturn the corrected episode file as JSON only in a json code block, same keys. Fix every "must" note; take a "should" note when it helps.`, { maxTokens: 40000 })), null, 1));
}

// ── 4. export: the draft episode file and the plain-English summary for the owner ──
const out = path.join(ROOT, "episodes", `${EP}.draft.jsonc`);
fs.writeFileSync(out, `// Draft from the writers' room (scripts/writers-room.mjs, ${new Date().toISOString().slice(0, 10)}); steps in scratch/room/${EP}/. Not approved yet.\n${board}\n`);
const summary = await step("40-summary.md", () => ask("summary", `Here is the final script and the episode file:\n\n${script}\n\n${board}\n\nWrite for the owner (not a developer), in plain English (never rename anyone): the title; the story in 4-6 sentences; then the script scene by scene: one sentence on what is on screen, then the lines exactly as they will be voiced. No jargon, no praise of the script, no emojis. Markdown.`, { model: "claude-sonnet-5-5", maxTokens: 12000 }));
fs.writeFileSync(path.join(ROOT, "docs", `${EP}-draft.md`), summary);
const spent = fs.readFileSync(path.join(DIR, "usage.jsonl"), "utf8").trim().split("\n").reduce((s, l) => s + JSON.parse(l).cost, 0);
console.log(`done: ${path.relative(ROOT, out)}, docs/${EP}-draft.md; total $${spent.toFixed(2)}`);
