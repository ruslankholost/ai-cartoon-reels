// The timeline and the motion of the South Park puppet call test (SpCallTest). Pure data and arithmetic: every number is a function
// of the frame (and of the voice takes in public/nobody/timings.json + src/amp-nobody.json), nothing reads a clock or a random source.
// Seconds are the clip's own clock: a ringback, the pickup click, then takes 9-15 of "Nobody Picks Up" at their table-read gaps.
import timings from "../public/nobody/timings.json" with { type: "json" };
import amps from "./amp-nobody.json" with { type: "json" };

export const FPS = 30;
export type Who = "DENISE" | "GARY";
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; words: Word[] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;

export const T_RING = 0.08; // the ringback tone starts (public/sfx/ringback.mp3, 1.2 s)
export const T_PICK = 1.28; // the pickup click: Gary is in his seat from here
const T_YEAH = 1.55; // "Yeah." starts
export const TAIL = 1.0; // silence after "I'm never busy."
const SKIP9 = 0.8; // take 9 opens with a lip smack and a breath (its first word is at 0.975 s): the clip starts at 0.8 s of the file

export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: Who; file: string; ofs: number; skip: number; text: string; words: Word[]; start: number; end: number; amp: number[]; f0: number; peaks: Peak[] };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)); // smoothstep
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// syllable peaks of a line's loudness curve: local maxima with some height, a clear rise over the last frames, and 5 frames between them
function peaksOf(l: Omit<Line, "peaks">): { f: number; a: number }[] {
  const out: { f: number; a: number }[] = [];
  const a0 = Math.floor(l.start * FPS) - 1, a1 = Math.ceil(l.end * FPS);
  for (let f = a0; f <= a1; f++) {
    const i = f - l.f0;
    const v = l.amp[i] ?? 0;
    if (v < 0.3 || !(v > (l.amp[i - 1] ?? 0) && v >= (l.amp[i + 1] ?? 0))) continue;
    const valley = Math.min(...[1, 2, 3, 4, 5, 6].map((k) => l.amp[i - k] ?? 0));
    if (v - valley < 0.15) continue;
    if (out.length && f - out[out.length - 1].f < 5) { if (v > out[out.length - 1].a) out[out.length - 1] = { f, a: v }; continue; }
    out.push({ f, a: v });
  }
  return out;
}

const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
const take9 = TK.takes.find((t) => t.n === 9)!;
export const LINES: Line[] = (() => {
  const tks = TK.takes.filter((t) => t.n >= 9 && t.n <= 15).sort((a, b) => a.n - b.n);
  const count: Record<string, number> = {};
  return tks.map((t) => {
    const ofs = P(t.n) - P(9) - take9.words[0].t + T_YEAH; // the clip time of the file's second 0
    const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
    const base = { n: t.n, who: t.character as Who, file: t.file, ofs, skip: t.n === 9 ? SKIP9 : 0, text: t.text, words, start: words[0].t, end: words[words.length - 1].e, amp: AMP[t.file].amp, f0: Math.round(ofs * FPS) };
    const k = (count[base.who] ?? 0);
    const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: ((k + j) % 2 === 0 ? 1 : -1) as 1 | -1 }));
    count[base.who] = k + peaks.length;
    return { ...base, peaks };
  });
})();
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;
export const T_END = LINES[LINES.length - 1].end + TAIL;
export const SP_FRAMES = Math.round(T_END * FPS);

// ── the mouth: a level per frame from the loudness of the take, changing on twos (like cut-out animation on twos); closed whenever the
// character is not speaking (from just before the first word to just after the last). The mood decides how the level is drawn
// (sp-puppet.tsx) and how far it may open: Denise is neutral, then angry from "For what?", then defeated from "...Okay."; Gary is bored and smug.
export type MouthShape = "closed" | "small" | "mid" | "wide" | "o";
export type Mood = "neutral" | "angry" | "defeated" | "smug";
const ROUND = /^(w|tw|o|you|for)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
export function moodAt(who: Who, f: number): Mood {
  if (who === "GARY") return "smug";
  const t = f / FPS;
  return t >= LINE(14).start - 0.05 ? "defeated" : t >= LINE(12).start - 0.15 ? "angry" : "neutral";
}
export function mouthAt(who: Who, f: number): MouthShape {
  const t = f / FPS;
  const l = LINES.find((q) => q.who === who && t >= q.start - 0.1 && t <= q.end + 0.07);
  if (!l) return "closed";
  const fi = f - (f % 2);
  const a = ampAt(l, fi + 1); // the shape for a pair of frames follows the sound one frame ahead, as animators lead the lips
  if (a < 0.1) return "closed";
  const mood = moodAt(who, fi);
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if (mood === "angry" && s === "small") s = "mid"; // a shout is never a tiny mouth
  if (mood === "smug" && s === "wide") s = "mid"; // bored: small to medium
  if (mood === "defeated") s = a >= 0.62 ? "mid" : "small"; // given in: small openings
  return s;
}
export const speaking = (who: Who, f: number) => LINES.some((q) => q.who === who && f / FPS >= q.start - 0.1 && f / FPS <= q.end + 0.07);

// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT = { DENISE: 2.4, GARY: 1.5 }; // degrees
const BOB = { DENISE: 3, GARY: 3.5 }; // source px
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
function talkMove(who: Who, f: number): { tilt: number; bob: number } {
  const l = LINES.find((q) => q.who === who && f / FPS >= q.start - 0.2 && f / FPS <= q.end + 0.6);
  if (!l) return { tilt: 0, bob: 0 };
  const done = l.peaks.filter((p) => p.f <= f);
  const target = (j: number) => (j < 0 ? 0 : done[j].sign * TILT[who] * (0.55 + 0.45 * done[j].a));
  const j = done.length - 1;
  let tilt = j < 0 ? 0 : target(j - 1) + (target(j) - target(j - 1)) * ease((f - done[j].f) / 6);
  tilt *= 1 - ease((f - l.end * FPS) / 12);
  let bob = 0;
  for (const p of done.slice(-2)) bob -= BOB[who] * (0.5 + 0.5 * p.a) * pulse(f - p.f);
  return { tilt, bob: bob * (1 - ease((f - l.end * FPS) / 8)) };
}

// the listener: a slight tilt each time the other one finishes a line (and Denise straightens when the phone is picked up)
function listenTilt(who: Who, f: number): number {
  const knots: { f: number; v: number }[] = LINES.filter((q) => q.who !== who).map((q, i) => ({ f: Math.round((q.end + 0.35) * FPS), v: (i % 2 === 0 ? 1 : -1) * 1.1 }));
  if (who === "DENISE") knots.unshift({ f: Math.round((T_PICK + 0.25) * FPS), v: 1.3 });
  const done = knots.filter((k) => k.f <= f);
  if (!done.length) return 0;
  const j = done.length - 1;
  const prev = j ? done[j - 1].v : 0;
  return prev + (done[j].v - prev) * ease((f - done[j].f) / 10);
}
const talkWeight = (who: Who, t: number) => Math.max(0, ...LINES.filter((q) => q.who === who).map((q) => ease((t - (q.start - 0.25)) / 0.2) * (1 - ease((t - (q.end + 0.1)) / 0.3))));

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINK_SEED: Record<Who, number> = { DENISE: 3, GARY: 8 };
export const BLINKS: Record<Who, number[]> = { DENISE: blinkStarts(BLINK_SEED.DENISE), GARY: blinkStarts(BLINK_SEED.GARY) };
// Denise's expression beats: eyes widen while Gary says "Fifteen hundred." (brows up, pupils shrink), angry brows on "For what?" held through
// Gary's answer, sad brows and heavy lids as she gives in at "...Okay."
const giveIn = () => LINE(14).start - 0.05;
export function angryAt(f: number): number {
  const t = f / FPS, a = LINE(12);
  return ease((t - (a.start - 0.15)) / 0.2) * (1 - ease((t - giveIn()) / 0.45));
}
export const sadAt = (f: number) => ease((f / FPS - giveIn()) / 0.45);
export function shockAt(f: number): number {
  const t = f / FPS, a = LINE(11);
  return ease((t - (a.start - 0.05)) / 0.15) * (1 - ease((t - (a.end + 0.2)) / 0.25));
}
// the lids: Gary's are heavy all the time (the top 45 % of each eye, a touch more on "I picked up."); Denise's close to 40 % as she gives in.
// A blink goes from there to shut and back (3 frames: half way, shut, half way).
function baseLid(who: Who, f: number): number {
  const t = f / FPS;
  if (who === "GARY") { const a = LINE(13); return 0.45 + 0.07 * ease((t - (a.start - 0.3)) / 0.3) * (1 - ease((t - (a.end + 0.3)) / 0.5)); }
  return 0.4 * ease((t - giveIn()) / 0.4);
}
export function lidAt(who: Who, f: number): number {
  const base = baseLid(who, f);
  for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return base + (1 - base) * [0.5, 1, 0.5][k]; }
  return base;
}

export type Pose = { tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; pupil: number };
export function poseAt(who: Who, f: number): Pose {
  const t = f / FPS;
  const m = talkMove(who, f);
  const w = talkWeight(who, t);
  const phase = who === "DENISE" ? 0.4 : 2.1;
  const d = who === "DENISE";
  const shock = d ? shockAt(f) : 0;
  return {
    tilt: listenTilt(who, f) * (1 - w) + m.tilt, bob: m.bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase), mouth: mouthAt(who, f), mood: moodAt(who, f), lid: lidAt(who, f),
    angry: d ? angryAt(f) : 0, sad: d ? sadAt(f) : 0, lift: shock, pupil: 1 - 0.45 * shock,
  };
}

// ── the camera: one gentle push-in on Gary for "I picked up.", a small cut-in to Denise for "...Okay. Come."
export function zoomGary(f: number): number {
  const t = f / FPS, a = LINE(13), c = LINE(14);
  return 1 + 0.10 * ease((t - (a.start - 0.9)) / (a.end + 0.15 - (a.start - 0.9))) * (1 - ease((t - (c.start - 0.1)) / 0.7));
}
export function zoomDenise(f: number): number {
  const t = f / FPS, c = LINE(14);
  return 1 + 0.42 * ease((t - (c.start - 0.12)) / 0.18) * (1 - ease((t - (c.end + 0.2)) / 0.18));
}
// Gary lands in his seat over 5 frames after the pickup click (px up from below); 1 before the click means "not in the frame yet"
export const garyHere = (f: number) => f >= Math.round(T_PICK * FPS);
export const garySettle = (f: number) => 36 * (1 - ease((f - Math.round(T_PICK * FPS)) / 5));

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses and ~22 characters
export type Cap = { who: Who; text: string; t0: number; t1: number };
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  for (const l of LINES) {
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      caps.push({ who: l.who, text: cur.map((w) => w.d).join(" "), t0: cur[0].t - 0.04, t1: cur[cur.length - 1].e + 0.25 });
      cur = [];
    };
    l.words.forEach((w, i) => {
      if (cur.length && [...cur, w].map((x) => x.d).join(" ").length > 22) flush();
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && nxt.t - w.e > 0.3)) flush();
    });
    flush();
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);

// the four frames the stills are taken at
export const KEY_FRAMES: { label: string; f: number }[] = [
  { label: "Gary picks up", f: Math.round((T_PICK + 0.1) * FPS) },
  { label: "Fifteen hundred.", f: Math.round(LINE(11).words[0].t * FPS) + 8 },
  { label: "I picked up.", f: Math.round(LINE(13).words[1].t * FPS) + 3 },
  { label: "...Okay. Come.", f: Math.round(LINE(14).words[1].t * FPS) + 4 },
];
export { clamp01, ease };
