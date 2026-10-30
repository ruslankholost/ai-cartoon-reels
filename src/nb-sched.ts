// The timeline of "Nobody Picks Up": pure data and arithmetic on the voice takes (public/nobody/timings.json). Every number is
// seconds on the reel's own clock. Take k sits where the table read put it (tableRead.cues[k].at), so the gaps of
// episodes/nobody.jsonc carry the silent shots. Shots cut where the story turns, not on a fixed grid.
export const FPS = 30;
export const snap = (t: number) => Math.round(t * FPS) / FPS;

export type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
export type Take = { n: number; file: string; character: string; text: string; dur: number; end: number; words: Word[]; voiced: [number, number][]; amp?: number[] };
export type Timings = { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
export type Amps = Record<string, { dur: number; amp: number[] }>;

export const SHOT_KEYS = [
  "bath", "insSearch", "insTap", "sink", "deniseEar", "office", "phoneFlip", "deniseCall", "gym", "rick", "deniseScroll", "insGary", "insTapGary",
  "garyAnswer", "deniseHi", "garyPrice", "deniseWhat", "garyPicked", "deniseDrip", "garyKey", "living", "insPremier", "phoneDown",
] as const;
export type ShotKey = (typeof SHOT_KEYS)[number];
export type Shot = { key: ShotKey; start: number; end: number; cuts: number[] }; // cuts: extra camera cuts inside the shot (absolute seconds)
export type Cap = { who: string; text: string; t0: number; t1: number; words: { text: string; at: number }[] };
export type Cue = { name: string; at: number; vol: number; len?: number; rate?: number };
export type Sched = { shots: Shot[]; total: number; frames: number; P: number[]; takes: Take[]; caps: Cap[]; cues: Cue[]; T: Record<string, number> };

// one colour per speaker (captions), in the sepia palette
export const SPEAKER: Record<string, string> = {
  DENISE: "#ffd27a", TONY: "#f0a35e", VOICEMAIL: "#cfd9b0", "AGENCY GUY": "#f2cfa4", MARCO: "#e8b98c", "RICK'S WIFE": "#f4a9a0", GARY: "#fbf1d6",
};
const HOLD = 0.22;

export function buildCaps(tk: Take[], P: number[]): Cap[] {
  const caps: Cap[] = [];
  const say = (w: Word) => (w.bleep ? w.d.replace(/^(.)(.*?)(ing)?([.,!?]*)$/i, (_m, a, mid, ing, p) => a + "***" + (ing ?? "") + p) : w.d).toUpperCase();
  tk.forEach((t, k) => {
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      caps.push({ who: t.character, text: cur.map(say).join(" "), t0: P[k] + cur[0].t - 0.03, t1: P[k] + cur[cur.length - 1].e + HOLD, words: cur.map((w) => ({ text: say(w), at: P[k] + w.t })) });
      cur = [];
    };
    t.words.forEach((w, i) => {
      cur.push(w);
      const nxt = t.words[i + 1];
      const len = cur.map(say).join(" ").length;
      if (/[.,!?…]$/.test(w.d) || (nxt && nxt.t - w.e > 0.25) || len >= 15) flush();
    });
    flush();
  });
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  return caps;
}

export function buildSched(T: Timings, A: Amps = {}): Sched {
  const tk = [...T.takes].sort((a, b) => a.n - b.n).map((t) => (A[t.file] && Math.abs(A[t.file].dur - t.dur) < 0.02 ? { ...t, amp: A[t.file].amp } : t));
  const P = tk.map((t) => T.tableRead.cues.find((c) => c.n === t.n)!.at);
  const V = (n: number, rel: number) => P[n - 1] + rel;
  const starts: Partial<Record<ShotKey, number>> = {};
  const cut = (key: ShotKey, at: number) => (starts[key] = snap(at));
  const cuts: Partial<Record<ShotKey, number[]>> = {};
  const sub = (key: ShotKey, at: number) => (cuts[key] = [...(cuts[key] ?? []), snap(at)]);

  cut("bath", 0);
  cut("insSearch", V(1, 2.1));
  cut("insTap", V(2, 2.15));
  cut("sink", V(3, -0.3));
  cut("deniseEar", V(3, 1.95));
  sub("deniseEar", V(4, 1.65));
  cut("office", V(4, 3.05));
  sub("office", V(5, 0.95));
  cut("phoneFlip", V(5, 2.72));
  cut("deniseCall", V(6, 1.4));
  cut("gym", V(6, 2.4));
  cut("rick", V(7, -0.1));
  cut("deniseScroll", V(7, 1.05));
  cut("insGary", V(8, 0.0));
  cut("insTapGary", V(8, 2.5));
  cut("garyAnswer", V(9, -0.1));
  cut("deniseHi", V(10, -0.05));
  cut("garyPrice", V(11, -0.04));
  cut("deniseWhat", V(12, -0.04));
  cut("garyPicked", V(12, 1.1));
  cut("deniseDrip", V(13, 1.7));
  sub("deniseDrip", V(14, -0.05));
  cut("garyKey", V(15, -0.04));
  const tail = V(15, 2.46);
  cut("living", tail);
  cut("insPremier", tail + 1.5);
  cut("phoneDown", tail + 2.6);
  const total = snap(tail + 3.8);

  const order = SHOT_KEYS.map((key) => ({ key, start: starts[key] as number }));
  const shots: Shot[] = order.map((s, i) => ({ key: s.key, start: s.start, end: i + 1 < order.length ? order[i + 1].start : total, cuts: cuts[s.key] ?? [] }));
  const st = (k: ShotKey) => starts[k] as number;

  // named moments the pictures and the sound both hang on
  const M: Record<string, number> = {
    cold: 0.04, tap: st("insTap") + 0.16, ring1: st("insTap") + 0.45, buzz1: st("sink") + 0.06, buzz2: st("sink") + 0.5, buzz3: st("sink") + 0.95,
    foamSlide: V(4, 0.07), ringRick: st("deniseCall") + 0.12, flush: st("gym") + 0.2, elbow: V(7, 0.12),
    flipThunk: st("phoneFlip") + 0.22, tapGary: st("insTapGary") + 0.16, pickup: st("garyAnswer") + 0.06, plop: st("insGary") + 0.35,
    slowmo: V(13, 0.02), drop: st("deniseDrip") + 0.45, engine: V(15, 1.55), vanGo: tail + 0.05, money: tail + 0.55, ringPremier: st("insPremier") + 0.1,
    thunk: st("phoneDown") + 0.5, card: st("phoneDown") + 0.2,
  };
  const cues: Cue[] = [];
  const cue = (name: string, at: number, vol = 1, len?: number, rate?: number) => cues.push({ name, at: snap(at), vol, len, rate });
  cue("ice", 0.02, 1);
  [0.28, 0.5, 0.72].forEach((d, i) => cue("tick", st("insSearch") + d, 0.9 - i * 0.05));
  cue("tick", st("insSearch") + 0.98, 1);
  cue("tap", M.tap, 1); cue("ring", M.ring1, 0.7, 0.55);
  cue("buzz", M.buzz1, 1); cue("buzz", M.buzz2, 1); cue("buzz", M.buzz3, 0.9);
  cue("ring", st("office") + 0.05, 0.7, 0.8); cue("ring", st("office") + 1.55, 0.5, 0.6); cue("ring", V(5, 2.1), 0.6, 0.6);
  cue("thud", M.flipThunk, 1);
  cue("ring", M.ringRick, 0.55, 0.7);
  cue("flush", M.flush, 1);
  cue("kick", M.elbow, 1);
  // the scroll ticks slow down as the list reaches the bottom
  let ts = st("deniseScroll") + 0.1, gap = 0.07;
  while (ts < st("insGary") - 0.05) { cue("tick", ts, 0.8); ts += gap; gap *= 1.17; }
  cue("plop", M.plop, 1);
  cue("tap", M.tapGary, 1); cue("ring", M.tapGary + 0.2, 0.7, 0.3);
  cue("pickup", M.pickup, 1);
  cue("drip", M.drop, 0.9);
  cue("engine", M.engine, 1, 1.1);
  cue("drive", M.vanGo, 1, 1.6);
  cue("pop", M.money, 1);
  cue("ring", M.ringPremier, 0.8, 0.8); cue("buzz", M.ringPremier + 0.9, 0.7);
  cue("thud", M.thunk, 1);
  cue("pop", M.card, 0.8);
  cue("filmbed", 0, 1, total);

  return { shots, total, frames: Math.round(total * FPS), P, takes: tk, caps: buildCaps(tk, P), cues, T: M };
}

// how far open a speaker's mouth is at global time g (0..1): from the take's loudness per frame (amp), else from the word times.
// From the first word to the last it never drops below 0.1, so a pose that switches on speech does not flicker between words.
export function mouthAt(S: Sched, character: string, g: number): number {
  for (let k = 0; k < S.takes.length; k++) {
    if (S.takes[k].character !== character) continue;
    const ws = S.takes[k].words;
    const t = g - S.P[k];
    if (t < ws[0].t - 0.12 || t > ws[ws.length - 1].e + 0.08) continue;
    const a = S.takes[k].amp;
    if (a && a.length) return Math.max(0.0, Math.min(1, a[Math.min(a.length - 1, Math.max(0, Math.round(t * FPS)))]));
    return 0.4 + 0.4 * Math.abs(Math.sin(t * 22));
  }
  return 0;
}
// a blink: 0 open .. 1 shut, every few seconds, offset per seed
export function blinkAt(g: number, seed: number): number {
  const period = 2.9 + (seed % 5) * 0.37;
  const ph = (g + seed * 0.83) % period;
  const d = 0.17;
  return ph < d ? 1 - Math.abs((ph / d) * 2 - 1) : 0;
}
export const shotAt = (S: Sched, g: number): { shot: Shot; i: number } => {
  let i = S.shots.length - 1;
  for (let n = 0; n < S.shots.length; n++) if (g >= S.shots[n].start - 1e-6 && g < S.shots[n].end - 1e-6) { i = n; break; }
  return { shot: S.shots[i], i };
};
