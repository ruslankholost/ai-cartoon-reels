// The timeline of "Friday Night Lead". Pure data and arithmetic on the voice takes (public/friday/timings.json), no React:
// where each take sits, where each shot cuts (0.04 s before the first word it belongs to), when the gags happen (in the
// pauses between lines), the captions (phrase by phrase, word-synced, one colour per speaker), the stamps and the sound cues.
// Every number is seconds on the reel's own clock.

export const FPS = 30;
export const snap = (t: number) => Math.round(t * FPS) / FPS;

export type Who = "dave" | "barb" | "linda" | "chad" | "phone" | "phantom" | "sarah" | "lisa" | "chuck";
export type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
export type Take = { id: string; n: number; file: string; character: string; text: string; dur: number; end: number; words: Word[]; voiced: [number, number][]; amp?: number[] };
export type Timings = { takes: Take[] };
// mouth openness per frame for each take file (src/amp.json, from scripts/amp-build.py); used only while its duration matches the take
export type Amps = Record<string, { dur: number; amp: number[] }>;

// what is typed on a phone, word by word with a take (the insert screens and the key taps share it)
export const TYPED = {
  search: { k: 0, text: "plumber near me", from: 1 },
  msg: { k: 1, text: "My basement is flooding! How soon can you come?", from: 0 },
  chad: { k: 6, text: "Hi Linda! We can be there in 40 min. Want to book?", from: 0 },
  dave: { k: 10, text: "Hi Linda! Still need help?", from: 0 },
};

export const SHOT_KEYS = [
  "burst", "lindaType", "insSearch", "insMsgA", "linda2", "insSend",
  "livingWide", "barb1", "dave1", "barb2", "phoneTable", "dave2", "daveFlop", "dip",
  "chadWide", "insChad", "chadWide2", "chadClose", "insBooked",
  "lindaHug", "streetVan", "boot", "wrench", "drain", "basementDry", "lindaHero",
  "calendar", "kitchenWide", "daveType", "insDaveMsg", "lindaMonday", "insReply", "daveFreeze", "daveTurn", "barbEnd",
  "endcard",
] as const;
export type ShotKey = (typeof SHOT_KEYS)[number];
export type Shot = { key: ShotKey; start: number; end: number };
export type Cap = { who: Who; text: string; t0: number; t1: number; words: { text: string; at: number }[] };
export type Stamp = { text: string; t0: number; t1: number };
export type Cue = { name: string; at: number; vol: number; len?: number; rate?: number };
export type Sched = {
  shots: Shot[]; total: number; frames: number;
  P: number[]; takes: Take[];
  voice: { file: string; at: number; who: Who }[];
  caps: Cap[]; stamps: Stamp[]; cues: Cue[];
};

export const whoOf = (character: string): Who => {
  const c = character.toUpperCase();
  return c === "DAVE" ? "dave" : c === "BARB" ? "barb" : c === "LINDA" ? "linda" : c === "CHAD" ? "chad" : c === "PHANTOM" ? "phantom" : c === "SARAH" ? "sarah" : c === "LISA" ? "lisa" : c === "CHUCK" ? "chuck" : "phone";
};
// one colour per speaker (captions)
export const SPEAKER: Record<Who, string> = { dave: "#FFD84D", barb: "#F59BC8", linda: "#5FE0D6", chad: "#93B6FF", phone: "#8CE88E", phantom: "#FF9A3C", sarah: "#F59BC8", lisa: "#5FE0D6", chuck: "#B8E05F" };

const CUT = 0.04; // a cut lands this much before the word it belongs to
const HOLD = 0.22; // a caption stays this long after its last word, if nothing replaces it
const WGAP = 0.2; // between two lines of a scene: last word to first word
export const BOOT_HIT = 0.2; // the boot lands in the puddle
export const WRENCH_SNAP = 0.2; // the wrench bites
export const RING_LANDS = 0.51; // the float lands on the floor, as a share of the dry-floor shot
export const CAL_FLIP: [number, number] = [0.05, 0.55]; // the calendar pages flip from, for

// captions: phrase by phrase, word-synced; take k sits at P[k]. A bleeped word shows as a grawlix.
export function buildCaps(tk: Take[], P: number[]): Cap[] {
  const caps: Cap[] = [];
  const say = (w: Word) => (w.bleep ? "#@$%!" : w.d.toUpperCase());
  tk.forEach((t, k) => {
    const who = whoOf(t.character);
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      caps.push({ who, text: cur.map(say).join(" "), t0: P[k] + cur[0].t - 0.03, t1: P[k] + cur[cur.length - 1].e + HOLD, words: cur.map((w) => ({ text: say(w), at: P[k] + w.t })) });
      cur = [];
    };
    t.words.forEach((w, i) => {
      cur.push(w);
      const nxt = t.words[i + 1];
      if (/[.!?…]$/.test(w.d) || (nxt && nxt.t - w.e > 0.28) || cur.length >= 5) flush();
    });
    flush();
  });
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  return caps;
}

export function buildSched(T: Timings, A: Amps = {}): Sched {
  const tk = [...T.takes].sort((a, b) => a.n - b.n).map((t) => (A[t.file] && Math.abs(A[t.file].dur - t.dur) < 0.02 ? { ...t, amp: A[t.file].amp } : t));
  const P: number[] = [];
  const first = (k: number) => tk[k].voiced?.[0]?.[0] ?? tk[k].words[0].t; // the take's first sound
  const place = (k: number, at: number) => (P[k] = snap(at - first(k))); // the take sits so that its first sound is at `at`
  const onset = (k: number, i: number) => P[k] + tk[k].words[i].t;
  const wend = (k: number) => P[k] + tk[k].words[tk[k].words.length - 1].e; // the end of the last word of a take
  const placeW = (k: number, prev: number) => (P[k] = snap(Math.max(wend(prev) + WGAP - tk[k].words[0].t, vend(prev) + 0.06 - first(k)))); // the next line follows the last word of `prev` by WGAP
  const vend = (k: number) => P[k] + tk[k].end; // the last voiced moment of a take
  const before = (k: number, i: number) => (i ? Math.max(onset(k, i) - CUT, P[k] + tk[k].words[i - 1].e) : onset(k, i) - CUT); // a cut ahead of word i, never inside word i-1
  const starts: Partial<Record<ShotKey, number>> = {};
  const cut = (key: ShotKey, at: number) => { starts[key] = snap(at); return snap(at); };
  const cues: Cue[] = [];
  const cue = (name: string, at: number, vol = 1, len?: number, rate?: number) => cues.push({ name, at: snap(at), vol, len, rate });

  // A. the basement, Friday 9:04 PM: the pipe bursts, Linda searches, then texts
  cut("burst", 0);
  place(0, 0.5);
  cut("lindaType", before(0, 0));
  cue("burst", 0.07, 1, 0.9);
  cut("insSearch", before(0, 1)); // "plumber near me..."
  const aEnd = vend(0) + 0.1;
  cut("insMsgA", aEnd);
  place(1, aEnd + 0.1);
  cut("linda2", before(1, 4)); // "How soon can you come?"
  cut("insSend", before(1, 8)); // "come?" and the send
  const sendAt = vend(1) + 0.1;
  cue("whoosh", sendAt, 0.8);

  // B. Dave's living room: the phone buzzes, Barb, Dave, the phone into the dip
  const tB = sendAt + 0.42;
  cut("livingWide", tB);
  cue("buzz", tB + 0.04, 0.9); cue("buzz", tB + 0.32, 0.9);
  place(2, tB + 0.52);
  cut("barb1", before(2, 0));
  placeW(3, 2);
  cut("dave1", before(3, 0));
  placeW(4, 3);
  cut("barb2", before(4, 0));
  cut("phoneTable", before(4, 2));
  placeW(5, 4);
  cut("dave2", before(5, 0));
  const flop = cut("daveFlop", vend(5) + 0.08); // the beat after "flooding on a Friday"
  const dipAt = cut("dip", flop + 0.45);
  cue("thud", flop + 0.2, 0.9); cue("blub", dipAt + 0.34, 1);

  // C. Chad's bedroom, Friday 9:05 PM
  const tC = dipAt + 0.6;
  cut("chadWide", tC);
  cue("buzz", tC + 0.1, 0.9);
  place(6, tC + 0.66);
  cut("insChad", before(6, 0));
  cut("chadWide2", before(6, 9)); // "Want to book?"
  placeW(7, 6);
  cut("chadClose", before(7, 0));
  const booked = cut("insBooked", vend(7) + 0.08); // the beat after "Book it, buddy"
  cue("ding", booked + 0.15, 0.9);

  // D. the basement again: relief, then the van, the boot, the wrench and the drain, then "My hero."
  const tD = booked + 0.52;
  cut("lindaHug", tD);
  place(8, tD + 0.1);
  const van = cut("streetVan", vend(8) + 0.1); // the beat between "Oh, thank God." and "My hero."
  const boot = cut("boot", van + 0.55);
  const wrench = cut("wrench", boot + 0.45);
  const drain = cut("drain", wrench + 0.5); // the drain and the dry floor are one beat
  const dry = cut("basementDry", drain + 0.4);
  const hero = cut("lindaHero", dry + 0.4);
  place(9, hero + 0.1);
  cue("engine", van, 0.8, 0.7); cue("splash", boot + BOOT_HIT, 1); cue("clank", wrench + WRENCH_SNAP, 1);
  cue("glug", drain, 1); cue("thud", dry + RING_LANDS * (hero - dry), 0.9);

  // E. Monday: the calendar, the kitchen, Dave texts, Linda answers, "Marketing doesn't work."
  const cal = cut("calendar", vend(9) + 0.15);
  [0, 1, 2].forEach((i) => cue("flip", cal + CAL_FLIP[0] + CAL_FLIP[1] * (i + 0.5) / 3, 0.8));
  const kit = cut("kitchenWide", cal + 0.75);
  cue("blub", kit + 0.12, 0.6); cue("wipe", kit + 0.34, 0.7); // the phone out of the dip, wiped on the belly
  const dtype = cut("daveType", kit + 0.75);
  place(10, dtype + 0.1);
  cut("insDaveMsg", before(10, 2));
  const dSend = vend(10) + 0.1;
  cue("whoosh", dSend, 0.8);
  cut("lindaMonday", dSend + 0.32);
  place(11, dSend + 0.32 + 0.22);
  const reply = cut("insReply", vend(11) + 0.1);
  cue("ding", reply + 0.12, 0.9);
  const freeze = cut("daveFreeze", reply + 0.55);
  const turn = cut("daveTurn", freeze + 0.45); // the beat before "Marketing doesn't work."
  place(12, turn + 0.38);
  placeW(13, 12);
  cut("barbEnd", before(13, 0));
  const endAt = cut("endcard", vend(13) + 0.22);
  const total = snap(endAt + 1.4);

  // shot table: each shot ends where the next begins
  const order = SHOT_KEYS.map((key) => ({ key, start: starts[key] as number }));
  const shots: Shot[] = order.map((s, i) => ({ key: s.key, start: s.start, end: i + 1 < order.length ? order[i + 1].start : total }));

  const caps = buildCaps(tk, P);

  // beds (looped under the picture, ducked under the voices), snores, key taps, title pops
  cue("spraybed", 0.3, 0.55, tB - 0.3); cue("spraybed", tD, 0.55, wrench + WRENCH_SNAP - tD);
  cue("rain", van - 0.05, 0.7, boot + 0.5 - van);
  for (let t = tB - 0.05; t < flop - 0.4; t += 2.35) cue("snore", t, 0.55);
  cue("snore", tC + 0.05, 0.4, undefined, 1.2);
  cue("pop", endAt + 0.04, 0.7); cue("pop", endAt + 0.38, 0.7);
  const S0 = { takes: tk, P } as unknown as Sched;
  const typing = (k: number, text: string, from: number, g0: number, g1: number, vol: number) => {
    let prev = 0, last = -1;
    for (let g = g0; g < g1; g += 1 / 240) {
      const n = typedAt(S0, k, g, text, from).length;
      if (n > prev && g - last >= 0.075) { cues.push({ name: "tick", at: g, vol }); last = g; }
      prev = n;
    }
  };
  typing(TYPED.search.k, TYPED.search.text, TYPED.search.from, onset(0, 1), onset(0, 4), 0.5);
  typing(TYPED.msg.k, TYPED.msg.text, TYPED.msg.from, P[1], vend(1), 0.5);
  typing(TYPED.chad.k, TYPED.chad.text, TYPED.chad.from, P[6], onset(6, 9), 0.4);
  typing(TYPED.dave.k, TYPED.dave.text, TYPED.dave.from, P[10], vend(10), 0.5);

  const stamps: Stamp[] = [
    { text: "FRIDAY 9:04 PM", t0: 0.1, t1: 2.5 },
    { text: "FRIDAY 9:05 PM", t0: tC + 0.04, t1: tC + 1.2 },
    { text: "MONDAY 8:00 AM", t0: cal + 0.04, t1: kit + 0.05 },
  ];

  return {
    shots, total, frames: Math.round(total * FPS), P, takes: tk,
    voice: tk.map((t, k) => ({ file: t.file, at: P[k], who: whoOf(t.character) })),
    caps, stamps, cues,
  };
}

// ── acting, from the schedule ──
// how far open a speaker's mouth is at global time g (0..1): from the take's loudness per frame when there is any
// (`amp`), else from the word times (a flap on every syllable). From the first word to the last it never reads as
// "not speaking" (0.1 at the least), so a pose that switches on speech does not flicker between words.
export function mouthAt(S: Sched, who: Who, g: number): number {
  for (let k = 0; k < S.takes.length; k++) {
    if (whoOf(S.takes[k].character) !== who) continue;
    const ws = S.takes[k].words;
    const t = g - S.P[k];
    if (t < ws[0].t - 0.03 || t > ws[ws.length - 1].e + 0.06) continue;
    const a = S.takes[k].amp;
    if (a && a.length) return Math.max(0.1, Math.min(1, a[Math.min(a.length - 1, Math.max(0, Math.round(t * FPS)))]));
    for (const w of ws) {
      if (t >= w.t && t <= w.e) {
        const syl = Math.max(1, Math.round((w.e - w.t) / 0.17));
        const ph = (t - w.t) / (w.e - w.t);
        const edge = Math.min(1, ph * 8, (1 - ph) * 8);
        return 0.18 + 0.72 * Math.pow(Math.abs(Math.sin(ph * Math.PI * syl)), 0.8) * Math.max(0.35, edge);
      }
    }
    return 0.1;
  }
  return 0;
}
// is someone of this kind speaking at g?
export const speaking = (S: Sched, who: Who, g: number) => mouthAt(S, who, g) > 0;
// a blink: 0 open .. 1 shut, every few seconds, offset per character
export function blinkAt(g: number, seed: number): number {
  const period = 3.1 + (seed % 5) * 0.37;
  const ph = (g + seed * 0.83) % period;
  const d = 0.17;
  return ph < d ? 1 - Math.abs((ph / d) * 2 - 1) : 0;
}
// how much of `text` has been typed at g, following the words of a take from word `from` on (the text and the words match one for one)
export function typedAt(S: Sched, k: number, g: number, text: string, from = 0): string {
  const toks = text.split(" ");
  const ws = S.takes[k].words.slice(from);
  const t = g - S.P[k];
  let out = "";
  for (let i = 0; i < toks.length; i++) {
    const w = ws[Math.min(i, ws.length - 1)];
    if (t < w.t) break;
    const f = Math.min(1, (t - w.t) / Math.max(0.05, (w.e - w.t) * 0.85));
    out += (out ? " " : "") + toks[i].slice(0, Math.max(1, Math.ceil(toks[i].length * f)));
    if (f < 1) break;
  }
  return out;
}
export const shotAt = (S: Sched, g: number): { shot: Shot; i: number } => {
  let i = S.shots.length - 1;
  for (let n = 0; n < S.shots.length; n++) if (g >= S.shots[n].start - 1e-6 && g < S.shots[n].end - 1e-6) { i = n; break; }
  return { shot: S.shots[i], i };
};
