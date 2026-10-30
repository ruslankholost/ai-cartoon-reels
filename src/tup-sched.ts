// The timeline and the acting of "I'm Just Supporting a Friend" (src/Tup.tsx, docs/x05-supporting-a-friend.md): the Tupperware party as its own episode (10-22). Pure data and arithmetic: every number is a
// function of the frame, of the voice takes in public/tup/timings.json and of the mouth loudness in src/amp-tup.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's
// clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of episodes/tup.jsonc carry the silent beats): every cut and action below is anchored to a take (before or after a word, in a pause, or on
// a loud syllable) or to the measured peak of a sound (src/sfx-peaks.json), never to a number of its own. The model is src/pen-sched.ts (the pen sketch); what the two share (the physics helpers, the poses'
// type) is imported from it. The story's pictures (the sepia store, the living room, the newspaper) were Pen v1's; they are drawn again here with this episode's schedule.
import timings from "../public/tup/timings.json" with { type: "json" };
import amps from "./amp-tup.json" with { type: "json" };
import { FPS, antic, bump, clamp01, dropH, ease, easeOut, hash, keys, onPeak, popP, slideP, snap, squashAt, twos, type Char, type Mood, type MouthShape, type Pose } from "./pen-sched.ts";
import { fitEyes } from "./pen-eyes.ts";
import { lerp, spring } from "./sp-math.ts";
import { DIVE_Z } from "./tup-layout.ts";

export { FPS, antic, bump, clamp01, dropH, ease, easeOut, hash, keys, onPeak, popP, slideP, snap, squashAt, twos };
export type { Char, Mood, MouthShape, Pose };

// ── the voice takes (the shape of pen-sched.ts)
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: string; char: Char; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
const CHAR_OF: Record<string, Char> = { DENISE: "denisePen", RHONDA: "rhondaPen", "GUEST 1": "guest1", "GUEST 2": "guest2", "GUEST 3": "guest3" };
function peaksOf(l: Omit<Line, "peaks">): { f: number; a: number }[] {
  const out: { f: number; a: number }[] = [];
  for (let f = Math.floor(l.first * FPS) - 1; f <= Math.ceil(l.end * FPS); f++) {
    const i = f - l.f0, v = l.amp[i] ?? 0;
    if (v < 0.3 || !(v > (l.amp[i - 1] ?? 0) && v >= (l.amp[i + 1] ?? 0))) continue;
    const valley = Math.min(...[1, 2, 3, 4, 5, 6].map((k) => l.amp[i - k] ?? 0));
    if (v - valley < 0.15) continue;
    if (out.length && f - out[out.length - 1].f < 5) { if (v > out[out.length - 1].a) out[out.length - 1] = { f, a: v }; continue; }
    out.push({ f, a: v });
  }
  return out;
}
export const LINES: Line[] = (() => {
  const count: Record<string, number> = {};
  return TK.takes.map((t) => {
    const ofs = P(t.n), amp = AMP[t.file].amp;
    const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
    const char = CHAR_OF[t.character];
    const i0 = amp.findIndex((a) => a >= 0.1);
    const base = { n: t.n, who: t.character, char, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
    const k = count[char] ?? 0;
    const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: ((k + j) % 2 === 0 ? 1 : -1) as 1 | -1 }));
    count[char] = k + peaks.length;
    return { ...base, peaks };
  });
})();
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;
const L = LINE;
const linesOf = (c: Char) => LINES.filter((l) => l.char === c);

// ── the cuts and the named moments (seconds). Every one hangs on a take: before its first sound or after its last
const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start, L(n).voiced[0][0]) - d); // a speaker cut: d s before the take's first sound (a sigh counts) or its first word
const aft = (n: number, d = 0.05) => snap(L(n).tend + d); // d s after the take's last sound
const bef = (n: number, d = 0.1) => snap(Math.min(L(n).first, L(n).start, L(n).voiced[0][0]) - d);
/** the middle of the longest silence inside a take (the pause between two sentences): a cut that falls there is inside no word */
function pauseMid(n: number): number {
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
/** the cut between word i and word i+1 of a take (their shared edge, or the middle of the gap between them) */
const between = (n: number, i: number) => snap((L(n).words[i].e + L(n).words[i + 1].t) / 2);
const W = (n: number, i: number) => L(n).words[i];

// the hook: the phone with the invite is on screen from frame 0, her thumb types "I'm in!!" and sends it (1.6 s); Rhonda's brow goes up (0.5 s); Denise answers (her line 1 starts at the lead, 2.2 s)
const s2 = snap(bef(1, 0.1) - 0.5), s3 = bef(1, 0.1);
export const TYPED = ["I", "'", "m", " ", "i", "n", "!", "!", " ", "♥"] as const; // the keys she taps: "I'm in!! " and the heart
const sendT = snap(s2 - 0.1), type0 = snap(sendT - 0.7); // the invite is read for 0.8 s before the first key (QA: it has to read in under a second)
export const KEY_T: number[] = TYPED.map((_, i) => snap(type0 + (2 / FPS) * i)); // a key every 2 frames
const brow = snap(s2 + 0.14); // Rhonda's brow lifts on a tick
// the garage: Rhonda says what the party is
const s4 = spk(2, 0.06), s5 = spk(3, 0.1), s6 = spk(4, 0.06);
// the dive into the bowl on her lap (the pause after "Shut up and look."); over its last 0.15 s the colour drains into sepia with the lamp flickering, and the lamp warms up for the first 0.3 s of the store
const s7 = aft(4, 0.03), s8 = bef(5, 0.1);
const proj0 = snap(s8 - 0.15), proj1 = snap(s8 + 0.3);
// the 1949 store: the clerk blows the dust off the bowl on the pile ("Detroit,"), the card lands on "1949."; "Plastic bowls." over the stacks
const puff = snap(W(5, 0).e - 0.05), stamp = snap(W(5, 1).t), s9 = snap(pauseMid(5));
const s10 = bef(6, 0.1); // "Nobody buys 'em in stores.": the store is empty, the clerk yawns
// a shopper presses the lid by its edge (the pause after "stores."): it tilts, pops off, spins and lands
const s11 = aft(6, 0.05), lidPress = snap(s11 + 0.1), lidPop = snap(lidPress + 0.16), lidLand = snap(lidPop + 0.46);
const s12 = bef(7, 0.1), shrug = snap(W(7, 3).t + 0.12); // "Nobody gets the lid.": the clerk shrugs
// "You have to burp it.": the hostess's finger presses the middle of the lid from "burp"; the burp, the ding, then the guests gasp
const s13 = snap(pauseMid(7)), press = snap(W(7, 7).t), burpT = aft(7, 0.1), ding1 = snap(burpT + 0.2), s14 = snap(burpT + 0.3), gaspT = snap(s14 + 0.1);
const s15 = between(8, 4); // "So a divorced mom named" | "Brownie Wise shows 'em at parties."
const s16 = bef(9, 0.1); // "To her friends.": she holds the lidded bowl up
const s17 = aft(9, 0.05), chipT = snap(s17 + 0.2); // the cut-back: Denise bites a chip, the crunch
const s19 = between(10, 6), s18 = snap(s19 - 2.3); // the shelf empties: the stacks leave on the thuds of "In '51 they pulled 'em off the" | "shelves. Parties only." over the door
const cardDrop = snap(W(10, 8).t); // the card SOLD AT HOME PARTIES ONLY lands on "Parties"
const s20 = snap(L(10).tend + 0.25); // "And the friend throwing the party?": a man's hand holds out a gift box
const handover = snap(W(11, 5).e + 0.08), s21 = snap(handover + 0.2), giftPop = snap(s21 + 0.05); // the ding on the handover; the next shot: she beams with the box
const s22 = aft(11, 0.05); // the order forms and pens slide in front of the three guests
const slide1 = snap(s22 + 0.12), slide2 = snap(slide1 + 0.15), slide3 = snap(slide2 + 0.15);
const s23 = spk(12, 0.05), s24 = spk(13, 0.05), s25 = spk(14, 0.05), sign1 = snap(s23 + 0.3), sign2 = snap(s24 + 0.3), sign3 = snap(s25 + 0.3); // "Sure." x3
const s26 = spk(15, 0.08); // "One woman's selling."
const s27 = bef(16, 0.1); // "Everybody else thinks it's a party.": the forms pile up on the table, one on each loud syllable
const s28 = aft(16, 0.1), lookT = snap(s28 + 0.22); // the cut-back: Denise stops chewing and looks down at her bowl
const s29 = snap(Math.min(L(18).first, L(18).start) - 0.17), paperStop = snap(s29 + 0.5); // the newspaper spins in and stops dead on the thud
const s30 = between(18, 5); // "In '58 the owner sold the" | "company. Sixteen million." (the page's $16,000,000)
const s31 = spk(20, 0.06); // back in colour, hard: "Now it's the group chat."
const s32 = aft(20, 0.1), buzz = snap(s32 + 0.12); // her phone buzzes: "Bring a friend!! I get a free candle"
const s33 = spk(21, 0.06), s34 = between(21, 3), s35 = snap(pauseMid(21)); // "A 2018 survey asked" | "people who sell this stuff." | "Almost half lost money."
const stampT = snap(W(21, 9).t), s36 = snap(L(21).end + 0.55); // "47% LOST MONEY" slams in on "half" and holds
const crack = snap(L(23).first - 0.1), s37 = snap(crack - 0.13); // the last wide: Rhonda cracks another beer, then the outro
const share = aft(23, 0.04);

export const T = {
  s2, sendT, type0, brow, s3, s4, s5, s6, s7, proj0, s8, proj1, puff, stamp, s9, s10, s11, lidPress, lidPop, lidLand, s12, shrug, s13, press, burpT, ding1, s14, gaspT, s15, s16, s17, chipT, s18, s19, cardDrop, s20, handover, s21, giftPop,
  s22, slide1, slide2, slide3, s23, sign1, s24, sign2, s25, sign3, s26, s27, s28, lookT, s29, paperStop, s30, s31, s32, buzz, s33, s34, s35, stampT, s36, crack, s37, share,
  end: snap(share + 2.5),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);

// The shots (docs/x05-supporting-a-friend.md, the shot list; 37 here because a line longer than 2.4 s over one picture has to be cut at a word): one per framing. tup-check.mts holds the list to the length
// rule (<= 2.4 s except the last shot) and to "no two shots in a row with the same framing".
export const SHOT_IDS = [
  "hook", "rhoBrow", "denSupport", "rhoStore", "denParty", "rhoLook", "dive", "storeDust", "pileBowls", "storeWide", // 1-10
  "lidPop", "clerkShrug", "burp", "gasp", "hostessBrownie", "hostessHolds", "denChew", "storeEmpty", "doorCard", "giftHand", // 11-20
  "giftBeam", "formsSlide", "guest1", "guest2", "guest3", "hostessSells", "formsPile", "denLooks", "paperSpin", "paperClose", // 21-30
  "rhoGroup", "phoneBuzz", "rhoSurvey", "denPhone", "denStamp", "denMarketing", "wideEnd", // 31-37
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
const START: Record<ShotId, number> = {
  hook: 0, rhoBrow: s2, denSupport: s3, rhoStore: s4, denParty: s5, rhoLook: s6, dive: s7, storeDust: s8, pileBowls: s9, storeWide: s10, lidPop: s11, clerkShrug: s12, burp: s13, gasp: s14, hostessBrownie: s15, hostessHolds: s16,
  denChew: s17, storeEmpty: s18, doorCard: s19, giftHand: s20, giftBeam: s21, formsSlide: s22, guest1: s23, guest2: s24, guest3: s25, hostessSells: s26, formsPile: s27, denLooks: s28, paperSpin: s29, paperClose: s30, rhoGroup: s31,
  phoneBuzz: s32, rhoSurvey: s33, denPhone: s34, denStamp: s35, denMarketing: s36, wideEnd: s37,
};
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = SHOT_IDS.map((id, i) => ({ id, t0: START[id], t1: i + 1 < SHOT_IDS.length ? START[SHOT_IDS[i + 1]] : T_END }));
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}
/** the sepia shots of the story: a filter on the shot, heavier grain, a vignette, the projector's flicker; Denise's cut-backs (denChew, denLooks) stay in colour */
export const STORY: ReadonlySet<ShotId> = new Set<ShotId>([
  "storeDust", "pileBowls", "storeWide", "lidPop", "clerkShrug", "burp", "gasp", "hostessBrownie", "hostessHolds", "storeEmpty", "doorCard", "giftHand", "giftBeam", "formsSlide", "guest1", "guest2", "guest3", "hostessSells", "formsPile",
  "paperSpin", "paperClose",
]);
export const isStory = (f: number) => STORY.has(shotAt(f).id);
const shotId = (f: number) => shotAt(f).id;
/** the dive: 0 on the first frame of shot 7, 1 where the colour starts to drain into sepia; the zoom runs on it (the scene: 1 -> DIVE_Z, exponentially, about the bowl) */
export { DIVE_Z };
export const diveK = (f: number) => ease(clamp01((f / FPS - T.s7) / (T.proj0 - T.s7)));
/** the slow push of a hold: a zoom factor that grows through the shot (slower in the story); the dive and the newspaper's spin have their own camera */
export const holdPush = (f: number) => { const s = shotAt(f); return s.id === "dive" ? Math.pow(DIVE_Z, diveK(f)) : s.id === "paperClose" ? 1.02 + 0.035 * paperPush(f) : 1 + (STORY.has(s.id) ? 0.02 : 0.035) * s.u; }; // the sum's shot starts where the page's spin ends (1.02) and pushes on 3.5 %

// ── the projector: the one transition, from the garage into the 1949 store, and no frame of it is black (QA: an iris read as a black flash). In the dive's last 0.15 s the colour drains to sepia while the lamp flickers
// (up to 25 % either way); the cut onto the same bowl is hard; the lamp warms up for 0.3 s (the flicker dies from 13 % to 3 %); the story keeps its 3 % flicker
export function projectorAt(f: number): { sepia: number; bright: number } {
  const t = f / FPS, rnd = 2 * hash(f * 1.37 + 3) - 1;
  if (t >= T.proj0 && t < T.s8) return { sepia: ease((t - T.proj0) / (T.s8 - T.proj0)), bright: 1 + 0.25 * rnd };
  if (t >= T.s8 && t < T.proj1) return { sepia: 1, bright: 1 + (0.03 + 0.1 * (1 - ease((t - T.s8) / 0.3))) * rnd };
  const story = STORY.has(shotAt(f).id);
  return { sepia: story ? 1 : 0, bright: story ? 1 + 0.03 * rnd : 1 };
}

// ── the hook (shot 1): the thumb taps the keys, one per KEY_T; the finger moves from key to key and presses on each; it sends on sendT and leaves
export const KEYPOS: Record<string, [number, number]> = { I: [225, 470], "'": [255, 526], m: [240, 582], " ": [150, 638], i: [225, 470], n: [210, 582], "!": [270, 582], "♥": [45, 638] }; // design units of the 300 x 715 screen
export const SENDPOS: [number, number] = [268, 408];
export const typedN = (f: number) => KEY_T.filter((t) => f / FPS >= t).length;
export const sentK = (f: number) => popP(f / FPS, T.sendT);
export function fingerAt(f: number): { ux: number; uy: number; press: number; come: number } {
  const t = f / FPS;
  const targets: { t: number; p: [number, number] }[] = [...KEY_T.map((k, i) => ({ t: k, p: KEYPOS[TYPED[i]] })), { t: T.sendT, p: SENDPOS }];
  const come = ease(t / Math.max(0.2, KEY_T[0] - 0.03)) * (1 - ease((t - (T.sendT + 0.08)) / 0.14));
  let i = targets.findIndex((x) => t <= x.t + 1e-6); if (i < 0) i = targets.length - 1;
  const prev = i ? targets[i - 1] : { t: -0.3, p: [KEYPOS["I"][0] + 30, 760] as [number, number] }, cur = targets[i];
  const u = ease(clamp01((t - (prev.t + 0.015)) / Math.max(0.02, cur.t - prev.t - 0.015)));
  const p: [number, number] = [lerp(prev.p[0], cur.p[0], u), lerp(prev.p[1], cur.p[1], u)];
  const press = Math.max(0, 1 - Math.abs(t - cur.t) / 0.045);
  return { ux: p[0], uy: p[1], press, come };
}
// ── the dive and the store: the bowl, the dust, the card
export const blowK = (f: number) => bump(f / FPS, T.puff - 0.32, T.puff - 0.1, T.puff, T.puff + 0.22); // the clerk leans in over the bowl, blows on the puff's peak, straightens
export const blowing = (f: number) => f / FPS >= T.puff - 0.12 && f / FPS < T.puff + 0.14;
export const yawnK = (f: number) => bump(f / FPS, T.s10 + 0.25, T.s10 + 0.65, T.s10 + 1.1, T.s10 + 1.55); // the clerk's yawn in "Nobody buys 'em in stores.": mouth wide, eyes shut, head back
export const shrugK = (f: number) => bump(f / FPS, T.shrug - 0.12, T.shrug, T.shrug + 0.3, T.shrug + 0.55);
export function stampAt(f: number): { on: boolean; s: number; sx: number; sy: number; rot: number } { // the card DETROIT, 1949: it falls from big to its size and stamps in on "1949."
  const t = f / FPS, tl = T.stamp, fall = 0.2, wind = 0.1, S0 = 1.5, Wd = 0.08;
  if (t < tl - fall - wind) return { on: false, s: S0, sx: 1, sy: 1, rot: 0 };
  const up = t < tl - fall ? S0 + Wd * Math.sin((Math.PI / 2) * ((t - (tl - fall - wind)) / wind)) : S0 + Wd;
  const s = t < tl - fall ? up : 1 + (S0 + Wd - 1) * dropH(t, tl, fall);
  const sq = squashAt(t, tl, 0.3, 40);
  return { on: true, s, sx: 1 + 0.1 * sq, sy: 1 - 0.1 * sq, rot: -3 + 1.5 * sq };
}
/** the match cut of the dive: the camera starts a shot on the bowl filling the frame and pulls back (1 -> 0 over 0.5 s), the same bowl on the pile */
export const pullK = (f: number) => 1 - ease(clamp01((f / FPS - T.s8) / 0.5));

// ── the lid (shot 11): the shopper's fingertip comes down on the lid's edge (the pressed side dips), on lidPop the lid pops off the bowl, spins over and lands beside it on lidLand, hops once and rocks to a rest
export const LID = { apex: 330, dx: -340, floor: -243, turns: 1 }; // px of the frame (the scene's bowl is 0.56 of its picture): the lid pops up 330 px, comes down onto the counter 243 px below where it sat, 340 px to the left
const LID_TAU = T.lidLand - T.lidPop;
const LID_Q = (Math.sqrt(2 * LID.apex) + Math.sqrt(2 * (LID.apex - LID.floor))) / LID_TAU, LID_G = LID_Q * LID_Q, LID_V0 = Math.sqrt(2 * LID_G * LID.apex); // gravity and launch speed that make the apex and the landing both come out
/** the bounces of the lid after it lands: heights (px) and durations (s) with the same gravity, 54, 19 and 5.5 px */
export const BOUNCES = [{ h: 54, T: 0.22 }, { h: 19, T: 0.13 }, { h: 5.5, T: 0.07 }];
export function bounceY(d: number): number {
  let t0 = 0;
  for (const b of BOUNCES) { if (d < t0 + b.T) { const u = (d - t0) / b.T; return 4 * b.h * u * (1 - u); } t0 += b.T; }
  return 0;
}
export function lidAt(f: number): { on: boolean; x: number; y: number; rot: number; sy: number; sq: number } {
  const t = f / FPS, a = t - T.lidPop;
  if (t < T.lidPress) return { on: false, x: 0, y: 0, rot: 0, sy: 1, sq: 0 };
  if (a < 0) { const k = ease((t - T.lidPress) / (T.lidPop - T.lidPress)); return { on: false, x: 0, y: -4 * k, rot: 5 * k, sy: 1, sq: 0 }; } // seated, the pressed edge goes down
  if (t < T.lidLand) { const u = a / LID_TAU; return { on: true, x: LID.dx * u, y: LID_V0 * a - 0.5 * LID_G * a * a, rot: 5 * (1 - u) + 12 * Math.sin(Math.PI * 3 * u), sy: Math.cos(Math.PI * 2 * LID.turns * (1 - (1 - u) ** 2)), sq: 0 }; } // it tumbles about its horizontal axis (sy) and turns a little in the plane (rot)
  const d = t - T.lidLand;
  return { on: true, x: LID.dx, y: LID.floor + bounceY(d), rot: 10 * Math.exp(-d / 0.2) * Math.sin((Math.PI * 2 * d) / 0.2), sy: 1, sq: squashAt(t, T.lidLand, 0.3, 40) + 0.4 * squashAt(t, T.lidLand + BOUNCES[0].T, 0.3, 40) }; // three bounces, a rocking wobble, rest
}
/** the finger of shot 11: 0 high above the lid, 1 on the lid's edge (the press), back up on the pop */
export const shopperK = (f: number) => ease((f / FPS - (T.lidPress - 0.16)) / 0.16) * (1 - ease((f / FPS - (T.lidPop - 0.01)) / 0.14));
// ── the burp (shot 13): the hostess's fingertip comes down on the lid's dimple on "burp", the lid squashes a few %, on burpT the puff escapes at the rim and the lid springs back; the ding seals it
export const burpFinger = (f: number) => ease((f / FPS - (T.press - 0.26)) / 0.26) * (1 - ease((f / FPS - (T.burpT + 0.02)) / 0.12));
export const lidSquash = (f: number) => { const t = f / FPS; return t < T.press ? 0 : t < T.burpT ? 0.05 * ease((t - T.press) / (T.burpT - T.press)) : 0.05 * (1 - spring(t - T.burpT, 0.2, 34)); }; // 0 -> 0.05 down, then back past rest (a spring of 50 %) and rings out
export const puffAt = (t0: number) => ({ t0: t0 - 0.03, t1: t0 + 0.07, stop: t0 + 0.2, breakDur: 0.3 });
/** the guests jolt on the gasp: up 30 puppet px on the frame, back in 0.3 s; their mouths are an "o" for 0.5 s */
export function gaspAt(f: number): { up: number; o: boolean } { const a = f / FPS - T.gaspT; return a < 0 ? { up: 0, o: false } : { up: 30 * Math.exp(-a / 0.12) * (1 + 0.3 * Math.cos(a * 40)), o: a < 0.5 }; }

// ── the shelf empties (shot 18): the clerk, in his bowl pose, carries one stack out of the frame (the third of the seven, a short one on the bowl in his hands) and the other six leave on the loud syllables of
// "In '51 they pulled 'em off the", one by one, each squashing for 2 frames, hopping and sliding off along the counter, away from him (the order and the side of each: the ones to his right go right, the two
// to his left go left before he reaches them); nothing crosses his face
export const STACKS = 6;
export const STACK_ORDER = [0, 1, 6, 5, 4, 3] as const; // which of the store's seven stacks (left to right) leaves on thud i
export const STACK_DIR = [-1, -1, 1, 1, 1, 1] as const; // and to which side
export const STACK_CARRIED = 2;
export const STACK_T: number[] = (() => {
  const lo = T.s18 + 0.15, hi = T.s19 - 0.12, ps = L(10).peaks.map((p) => p.f / FPS).filter((t) => t >= lo && t <= hi);
  const out = ps.slice(0, STACKS).map((t) => snap(t));
  for (let i = out.length; i < STACKS; i++) out.push(snap(lerp(lo, hi, (i + 1) / (STACKS + 1)))); // when the line has fewer stresses than stacks, the rest are spread over the line
  return Array.from(new Set(out)).sort((a, b) => a - b);
})();
/** thud i's stack (frame px): still, then 2 frames of squash, then a hop of 14 px and a slide along the counter that speeds up (it is off the frame in 0.45 s); gone after 0.5 s */
export function stackAt(i: number, f: number): { gone: boolean; dy: number; dx: number; sy: number; rot: number } {
  const t = f / FPS, a = t - STACK_T[i], s = STACK_DIR[i];
  if (a < -2 / FPS) return { gone: false, dy: 0, dx: 0, sy: 1, rot: 0 };
  if (a < 0) return { gone: false, dy: 0, dx: 0, sy: 0.94, rot: 0 }; // the squash before it goes
  if (a > 0.5) return { gone: true, dy: 0, dx: 0, sy: 1, rot: 0 };
  return { gone: false, dy: a < 0.12 ? 14 * Math.sin((Math.PI * a) / 0.12) : 0, dx: s * (3400 * a * a + 140 * a), sy: 1 + 0.08 * Math.min(1, a / 0.06), rot: s * 6 * Math.min(1, a / 0.2) };
}
/** the clerk walks out to the left behind the counter (plate px of the store's wide view) from 0.2 s into the shot to 0.15 s before the cut; the bob of his steps on twos (puppet px) */
export const CLERK_WALK = { t0: T.s18 + 0.2, t1: T.s19 - 0.15, dx: -540 };
export const walkK = (f: number) => ease(clamp01((f / FPS - CLERK_WALK.t0) / (CLERK_WALK.t1 - CLERK_WALK.t0)));
export const walkStep = (f: number) => { const t = twos(f) / FPS; return t < CLERK_WALK.t0 || t > CLERK_WALK.t1 ? 0 : 14 * Math.abs(Math.sin((Math.PI * (t - CLERK_WALK.t0)) / 0.2)); };
export const STACK_LAST = STACK_T[STACK_T.length - 1];
if (STACK_T.length !== STACKS) throw new Error(`the shelf has ${STACKS} stacks and ${STACK_T.length} thuds`);
/** the card SOLD AT HOME PARTIES ONLY: it falls from above (0.18 s), lands on "Parties" with a squash, and swings on its hinge (degrees, a damped pendulum) */
export const CARDFALL = 0.18;
export function doorCardAt(f: number): { on: boolean; drop: number; sq: number; swing: number } {
  const t = f / FPS, a = t - T.cardDrop;
  return { on: t >= T.cardDrop - CARDFALL, drop: dropH(t, T.cardDrop, CARDFALL), sq: squashAt(t, T.cardDrop, 0.3, 40), swing: a < 0 ? 0 : 9 * Math.exp(-a / 0.45) * Math.cos(a * 7.5) };
}
// ── the gift (shots 20 and 21): the man's hand comes in from the left with the box in its palm, slows and stops dead in front of the hostess on `handover` (the ding); the next shot she holds it, and it pops up on a spring
export const handK = (f: number) => slideP(f / FPS, T.s20 + 0.15, T.handover);
/** the box pops up in her hands on a spring: a hop of 16 puppet px that rings out in 0.4 s (the hostess and the box go up together) */
export const giftHop = (f: number) => { const a = f / FPS - T.giftPop; return a < 0 ? 0 : 16 * Math.exp(-a / 0.12) * Math.abs(Math.sin(a * 26)); };
// the forms and pens slide in front of the three guests (shot 22): each from the right, slowing at a constant rate, stopping dead
export const SLIDE = 7 / FPS; // 7 frames, from just off the frame to the guest's place
export const slideAt = (i: number, f: number) => { const t0 = [T.slide1, T.slide2, T.slide3][i]; return { on: f / FPS >= t0, p: slideP(f / FPS, t0, t0 + SLIDE) }; };
// the forms pile up on the table, one on each loud syllable of "Everybody else thinks it's a party." (shot 27), each falling under gravity and landing with a squash
export const FORM_FALL = 0.28;
export const FORMS: number[] = (() => {
  const ps = L(16).peaks.map((p) => snap(p.f / FPS)).filter((t) => t >= T.s27 + FORM_FALL && t <= T.s28 - 0.2);
  const out = ps.slice(0, 6);
  for (let i = out.length; i < 6; i++) out.push(snap(lerp(T.s27 + FORM_FALL, T.s28 - 0.25, (i + 1) / 7)));
  return Array.from(new Set(out)).sort((a, b) => a - b);
})();
if (FORMS.length !== 6) throw new Error(`6 forms and ${FORMS.length} landings`);
export const formAt = (i: number, f: number) => { const t = f / FPS; return { on: t >= FORMS[i] - FORM_FALL, drop: dropH(t, FORMS[i], FORM_FALL), sq: squashAt(t, FORMS[i], 0.35, 40) }; };
// ── the newspaper spins in (a turn of 360 degrees, slowing at a constant rate) and stops dead on the thud, with a small wobble: at most 60 degrees a frame
export const SPIN = 360;
export function paperAt(f: number): { on: boolean; rot: number; s: number } {
  const t = f / FPS, u = clamp01((t - T.s29) / (T.paperStop - T.s29)), a = t - T.paperStop;
  const wob = a >= 0 ? Math.exp(-a / 0.09) * Math.cos(a * 34) : 0;
  return { on: t >= T.s29, rot: -2 + SPIN * (1 - u) ** 2 + 2.5 * wob, s: lerp(0.15, 1, 1 - (1 - u) ** 2) + 0.03 * wob };
}
/** the camera of the close shot (30): from the whole headline to the sum, a push of 0.6 s that stops at "Sixteen" */
export const paperPush = (f: number) => ease(clamp01((f / FPS - T.s30) / 0.6));
// ── the phone buzzes (shot 32): a wiggle in px on every frame of a buzz, and the bubble pops in on it
export function buzzAt(f: number): { wig: number; pop: number } {
  const t = f / FPS;
  return { wig: t >= T.buzz && t < T.buzz + 0.3 ? (f % 2 ? 1 : -1) * (6 + 3 * hash(f + 9)) : 0, pop: popP(t, T.buzz) };
}
// ── the stamp (shot 35): "47% LOST MONEY" falls from 1.4 times its size, below her face all the way (`dy`, frame px lower while it is big), onto `stampT` and slams: it rebounds to 0.95 of its size and settles, with a squash
// and a shake of the frame
export const STAMPFALL = 5 / FPS; // a whole number of frames
export function bigStampAt(f: number): { on: boolean; s: number; sx: number; sy: number; rot: number; src: number; dy: number } {
  const t = f / FPS, tl = T.stampT, a = t - tl, drop = dropH(t, tl, STAMPFALL);
  if (t < tl - STAMPFALL) return { on: false, s: 1.4, sx: 1, sy: 1, rot: -6, src: 0, dy: 120 };
  const s = t < tl ? 1 + 0.4 * drop : 1 - 0.05 * Math.exp(-a / 0.12) * Math.cos((Math.PI * 2 * a) / 0.28); // 0.95 on the landing frame, 1.015 a little later, 1 at rest
  const sq = squashAt(t, tl, 0.3, 40);
  return { on: true, s, sx: 1 + 0.08 * sq, sy: 1 - 0.08 * sq, rot: -6 + (t < tl ? 5 * drop : 0), src: clamp01((t - (tl + 0.3)) / 0.15), dy: t < tl ? 300 * (s - 1) : 0 };
}
export function stampShake(f: number): [number, number] { const a = f / FPS - T.stampT; if (a < 0 || a > 0.5) return [0, 0]; const k = 16 * Math.exp(-a / 0.1); return [k * Math.sin(a * 90), 0.6 * k * Math.cos(a * 80)]; }
// ── the last wide: Rhonda cracks the can in her hand (a short puff of spray from the opening)
export const sprayAt = (t0: number, seed = 1) => ({ t0, t1: t0 + 0.1, rate: 55, gravity: 2600, flight: 0.2, spread: 10, seed });
export const dustAt = (t0: number) => ({ t0: t0 - 0.04, t1: t0 + 0.08, stop: t0 + 0.2, breakDur: 0.35 });

// every picture hit that has a sound: the sound's measured peak sits on the hit's frame (cues() starts the clip `peak` s earlier)
export type Hit = { id: string; shot: ShotId; t: number; sfx: string; db: number; fall?: number; len?: number; fade?: number };
export const HITS: Hit[] = [
  ...KEY_T.map((t, i): Hit => ({ id: `key${i + 1}`, shot: "hook", t, sfx: "tick", db: -12 })),
  { id: "send", shot: "hook", t: T.sendT, sfx: "whoosh", db: -10 },
  { id: "sent", shot: "hook", t: snap(T.sendT + 0.04), sfx: "pop", db: -9 },
  { id: "brow", shot: "rhoBrow", t: T.brow, sfx: "tick", db: -6 },
  { id: "dive", shot: "dive", t: snap(T.s7 + 0.1), sfx: "whoosh", db: -8 },
  { id: "stamp", shot: "storeDust", t: T.stamp, sfx: "stamp", db: -3, fall: 0.2 },
  { id: "puff", shot: "storeDust", t: T.puff, sfx: "puff", db: -4 },
  { id: "press", shot: "lidPop", t: T.lidPress, sfx: "tap", db: -6 },
  { id: "boing", shot: "lidPop", t: T.lidPop, sfx: "boing", db: -5 },
  { id: "clatter", shot: "lidPop", t: T.lidLand, sfx: "clatter", db: -4, fall: T.lidLand - T.lidPop },
  { id: "burp", shot: "burp", t: T.burpT, sfx: "burp", db: -3 },
  { id: "ding1", shot: "burp", t: T.ding1, sfx: "ding", db: -7 },
  { id: "gasp", shot: "gasp", t: T.gaspT, sfx: "gasp", db: -6 },
  { id: "chip", shot: "denChew", t: T.chipT, sfx: "crunch", db: -6 },
  ...STACK_T.map((t, i): Hit => ({ id: `stack${i + 1}`, shot: "storeEmpty", t, sfx: "thud", db: -5 })),
  { id: "card", shot: "doorCard", t: T.cardDrop, sfx: "slap", db: -4, fall: CARDFALL },
  { id: "handover", shot: "giftHand", t: T.handover, sfx: "ding", db: -6 },
  { id: "giftPop", shot: "giftBeam", t: T.giftPop, sfx: "pop", db: -7 },
  { id: "slide1", shot: "formsSlide", t: T.slide1, sfx: "slide", db: -8 },
  { id: "slide2", shot: "formsSlide", t: T.slide2, sfx: "slide", db: -8 },
  { id: "slide3", shot: "formsSlide", t: T.slide3, sfx: "slide", db: -8 },
  { id: "sign1", shot: "guest1", t: T.sign1, sfx: "tick", db: -8 },
  { id: "sign2", shot: "guest2", t: T.sign2, sfx: "tick", db: -8 },
  { id: "sign3", shot: "guest3", t: T.sign3, sfx: "tick", db: -8 },
  ...FORMS.map((t, i): Hit => ({ id: `form${i + 1}`, shot: "formsPile", t, sfx: "pop", db: -9, fall: FORM_FALL })),
  { id: "look", shot: "denLooks", t: T.lookT, sfx: "sting-a", db: -4, len: 1.3, fade: 0.5 },
  { id: "spin", shot: "paperSpin", t: snap(T.s29 + 0.06), sfx: "whoosh", db: -6 },
  { id: "paper", shot: "paperSpin", t: T.paperStop, sfx: "thud", db: -3 },
  { id: "buzz", shot: "phoneBuzz", t: T.buzz, sfx: "buzz", db: -7, len: 0.3, fade: 0.06 },
  { id: "stampBig", shot: "denStamp", t: T.stampT, sfx: "stamp", db: -2, fall: STAMPFALL },
  { id: "stampThud", shot: "denStamp", t: T.stampT, sfx: "thud", db: -4 },
  { id: "crack", shot: "wideEnd", t: T.crack, sfx: "can", db: -4 },
];

// ── small acting that the scenes draw
/** the pulse of a nod: 0 before, up over 2 frames, down slowly */
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
/** Denise chews on twos for 0.45 s after the bite: a little open for the bite, shut on the crunch, then it chews */
export function chewMouth(f: number): MouthShape | null {
  const a = twos(f) / FPS - T.chipT;
  return a < -0.1 || a > 0.45 ? null : a < 0 ? "small" : Math.floor(a / 0.1) % 2 ? "small" : "closed";
}
/** the crumbs of the bite (puppet px from her mouth, y up): thrown out of the corner of her mouth on the crunch, on gravity, gone in 0.5 s */
export const CRUMBS = 6;
export function crumbAt(i: number, f: number): { on: boolean; x: number; y: number; rot: number; a: number } {
  const a = f / FPS - T.chipT, vx = (hash(i * 3.7) * 2 - 1) * 150 + (i % 2 ? 40 : -40), vy = 140 + 150 * hash(i * 5.3 + 1);
  if (a < 0 || a > 0.5) return { on: false, x: 0, y: 0, rot: 0, a: 0 };
  return { on: true, x: vx * a, y: vy * a - 0.5 * 2200 * a * a, rot: 1800 * (hash(i * 7.1) - 0.5) * a, a: 1 - ease((a - 0.3) / 0.2) };
}
/** Denise nods along in the cut-back (on twos): the head dips twice after the bite */
export const nodAt = (f: number) => [T.chipT + 0.3, T.chipT + 0.55].reduce((s, t) => s + 5 * pulse(twos(f) - Math.round(t * FPS)), 0);

/** where the captions sit in the frame (y px): one band for the reel; the shots whose pictures carry text or the bowl in it are listed here */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { wideEnd: [330, 490] };
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);
export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  if (c === "denisePen") return t >= T.s5 - 0.05 && t < T.s6 ? "polite" : "flat"; // "...It's a party.", sheepish
  if (c === "hostess" || c === "guest1" || c === "guest2" || c === "guest3") return "polite";
  return "flat";
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return "closed";
  const fi = twos(f), a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  const mood = moodAt(c, fi), w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  return s;
}
// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT: Record<string, number> = { denisePen: 2.6, rhondaPen: 1.8, clerk: 1, hostess: 1.4, guest1: 1.2, guest2: 1.2, guest3: 1.2 };
const BOB: Record<string, number> = { denisePen: 3.2, rhondaPen: 2.6, clerk: 2, hostess: 2.4, guest1: 2, guest2: 2, guest3: 2 };
function talkMove(c: Char, f: number): { tilt: number; bob: number } {
  const l = linesOf(c).find((q) => f / FPS >= q.first - 0.2 && f / FPS <= q.end + 0.6);
  if (!l) return { tilt: 0, bob: 0 };
  const done = l.peaks.filter((p) => p.f <= f);
  const target = (j: number) => (j < 0 ? 0 : done[j].sign * TILT[c] * (0.55 + 0.45 * done[j].a));
  const j = done.length - 1;
  let tilt = j < 0 ? 0 : target(j - 1) + (target(j) - target(j - 1)) * ease((f - done[j].f) / 6);
  tilt *= 1 - ease((f - l.end * FPS) / 12);
  let bob = 0;
  for (const p of done.slice(-2)) bob -= BOB[c] * (0.5 + 0.5 * p.a) * pulse(f - p.f);
  return { tilt, bob: bob * (1 - ease((f - l.end * FPS) / 8)) };
}
// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times
const SEEDS: Record<string, number> = { denisePen: 4, rhondaPen: 17, clerk: 31, hostess: 8, guest1: 13, guest2: 29, guest3: 37 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINKS: Record<string, number[]> = Object.fromEntries(Object.keys(SEEDS).map((c) => [c, blinkStarts(SEEDS[c])]));
const blinkK = (c: Char, f: number) => {
  const t = f / FPS;
  if (c === "guest1" || c === "guest2" || c === "guest3") return 0; // glazed: a stare
  if (c === "denisePen" && t >= T.lookT && t < T.s29) return 0; // she does not blink while her eyes are wide
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};
// ── faces by beat. Denise: lids low, brows up for the party and the bowl, angry on the swear. Rhonda: one brow up in shot 2
const D = (k: [number, number][]) => (t: number) => keys(t, k);
const denLid = D([[0, 0.25], [T.s3, 0.25], [T.s6, 0.2], [T.s17, 0.2], [T.lookT - 0.05, 0.2], [T.lookT + 0.05, 0], [T.s29, 0.1], [T.s31, 0.22], [T.s36, 0.2], [T.s37, 0.28]]);
const denLift = D([[0, 0], [T.s3 + 0.5, 0.05], [T.s5, 0.3], [T.s6, 0], [T.lookT - 0.05, 0.1], [T.lookT + 0.05, 1], [T.s29, 0.3], [T.s31 - 0.05, 0], [T.s34, 0.25], [T.s36, 0.1], [T.s36 + 0.35, 0.5], [T.s37, 0.2]]);
const denAngry = D([[0, 0.1], [T.s36 + 0.2, 0.1], [T.s36 + 0.5, 0.6], [T.s37, 0.4]]);
const denPupil = D([[0, 1], [T.lookT - 0.02, 1], [T.lookT + 0.05, 0.5], [T.s29, 0.9]]);
const rhoLid = D([[0, 0.32], [T.s2, 0.32], [T.brow - 0.02, 0.18], [T.s3, 0.3]]);
const rhoLift = D([[0, 0], [T.brow - 0.03, 0], [T.brow + 0.03, 1], [T.s3, 0.7], [T.s4, 0]]);
const BASE_LID: Record<string, number> = { denisePen: 0.2, rhondaPen: 0.32, clerk: 0.45, hostess: 0.05, guest1: 0.5, guest2: 0.5, guest3: 0.5 };
export function lidAtFace(c: Char, f: number): number {
  const t = f / FPS;
  const b = c === "denisePen" ? denLid(t) : c === "rhondaPen" ? rhoLid(t) : c === "clerk" ? Math.max(BASE_LID.clerk, 0.95 * yawnK(f)) : BASE_LID[c];
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}
// ── gaze: where the pupils look, -1..1 of their travel (x right, y down). In the garage Denise sits on the left and Rhonda on the right
export function gazeAt(c: Char, f: number): [number, number] {
  const t = f / FPS, sh = shotAt(f).id;
  switch (c) {
    case "denisePen":
      if (sh === "denSupport" || sh === "denChew") return [0.5, 0.05]; // Rhonda
      if (sh === "denParty") return [0.45, 0.1];
      if (sh === "dive") return t < T.s7 + 0.12 ? [0.5, 0.05] : [0, 0.9]; // "Shut up and look.": she looks down at the bowl
      if (sh === "denLooks") return t < T.lookT ? [0.5, 0.05] : [0, 0.9]; // the bowl on her lap
      if (sh === "denPhone") return t < T.s34 + 0.5 ? [0.05, 0.75] : [0.3, 0.1]; // her phone
      if (sh === "denStamp") return [0.2, 0.2];
      if (sh === "denMarketing") return t < T.s36 + 0.4 ? [0.05, 0.75] : t < T.s36 + 0.85 ? [0, 0.95] : [0.5, 0.1]; // the phone, the bowl, Rhonda
      if (sh === "wideEnd" || sh === "rhoGroup") return [0.5, 0.1];
      return [0.5, 0.05];
    case "rhondaPen": return [-0.55, 0.1]; // at Denise
    case "clerk": return sh === "storeDust" || sh === "pileBowls" ? [0, 0.7] : sh === "clerkShrug" ? [0.3, 0.05] : sh === "storeEmpty" ? [-0.5, 0.15] : [0.05, 0.3]; // down at the bowl; in 18 ahead of him, where he walks
    case "hostess": return sh === "giftHand" ? [-0.4, 0.1] : [-0.1, 0];
    case "guest1": case "guest2": case "guest3": return sh === c ? [0, 0.9] : [0, 0.05]; // in her close-up she looks down at the form she signs
    default: return [0, 0.05];
  }
}
// ── the body of a character with several poses (the rig's keys): a pose swapped by a cut changes on the cut's frame
export function bodyAt(c: Char, f: number): string | undefined {
  const sh = shotAt(f).id;
  switch (c) {
    case "denisePen": return "chairPhone";
    case "rhondaPen": return "chair";
    case "clerk": return sh === "storeEmpty" ? "bowl" : "stand";
    case "hostess": return sh === "hostessHolds" ? "bowl" : sh === "giftBeam" || sh === "hostessSells" || sh === "formsPile" ? "box" : "stand";
    default: return undefined;
  }
}
export function poseAt(c: Char, f: number): Pose {
  const t = f / FPS, ft = twos(f) / FPS, m = talkMove(c, f);
  const phase = ({ denisePen: 0.4, rhondaPen: 1.2, clerk: 0.7, hostess: 1.8, guest1: 0.3, guest2: 2.4, guest3: 1.1 } as Record<string, number>)[c] ?? 0;
  let tilt = m.tilt, bob = m.bob, lift = 0, asym = 0, angry = 0, pupil = 1, dx = 0, jump = 0, mouth = mouthAt(c, f), mood = moodAt(c, f);
  if (c === "denisePen") {
    angry = denAngry(t); lift = denLift(t); pupil = denPupil(t); bob -= nodAt(f);
    jump += 9 * bump(ft, T.lookT, T.lookT + 0.08, T.lookT + 0.1, T.lookT + 0.3); // the start she gives at the bowl
    mouth = chewMouth(f) ?? mouth;
  }
  if (c === "rhondaPen") {
    lift = 0.5 * rhoLift(t); asym = 2 * rhoLift(t); // one brow up, the other down a little: a look
    const k = T.crack; bob += -7 * antic(ft, k, 0.13) + 4 * bump(ft, k, k + 0.05, k + 0.08, k + 0.3); tilt += -2 * bump(ft, k, k + 0.05, k + 0.08, k + 0.3); // her thumb on the tab: the head dips before the crack, up with a jolt after it
  }
  if (c === "clerk") {
    const b = blowK(f), y = yawnK(f), s = shrugK(f);
    if (shotId(f) === "storeEmpty") { jump += walkStep(f); tilt += -3 * (walkK(f) > 0 && walkK(f) < 1 ? 1 : 0); } // he walks out with the stack on his bowl
    tilt += 3 * b - 4 * y + 4 * s; bob += -12 * b + 8 * y - 22 * s; jump += 30 * s; // he leans in over the bowl, yawns with his head back, shrugs (the shoulders and the head go up)
    if (blowing(f)) mouth = "o";
    else if (y > 0.3) { mouth = "wide"; mood = "neutral"; }
  }
  if (c === "guest1" || c === "guest2" || c === "guest3") {
    const g = LINES.find((l) => l.char === c)!, ga = gaspAt(f);
    if (ft >= g.start - 0.15 && ft <= g.end + 0.02) dx = (Math.floor(ft * 15) % 2 ? 1 : -1) * 2.4; // she writes: the whole puppet wriggles with the pen
    jump += ga.up; if (ga.o && t < T.s15) mouth = "o";
    if (shotId(f) === "formsPile" || shotId(f) === "hostessSells") bob += 3.5 * Math.sin(ft * 22 + phase * 3); // and laughs, shoulders shaking
  }
  if (c === "hostess") { if (shotId(f) === "gasp") jump += 3 * gaspAt(f).up; if (shotId(f) === "giftBeam") jump += giftHop(f); }
  const shut = blinkK(c, f) > 0 || (c === "clerk" && yawnK(f) > 0.02), lid = lidAtFace(c, f), gz = gazeAt(c, f);
  const eyes = shut ? { lid, gaze: gz } : fitEyes(c, lid, gz, pupil); // a pupil never hides under the lid
  return { body: bodyAt(c, f), tilt, bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase) + jump, mouth, mood, ...eyes, angry, sad: 0, lift, asym, pupil, dx };
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses, cuts and ~22 characters; a bleep shows as F***ing.
// A caption lives inside one shot: it is split where a cut falls between two words, and starts no earlier than the cut that brings its first word.
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number };
const say = (w: Word) => (w.bleep ? w.d.replace(/^(\w)\w{3}(\w*)/, "$1***$2") : w.d.replace(/—/g, "-"));
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const len = (ws: Word[]) => ws.map(say).join(" ").length;
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const lines: Word[][] = [];
    for (const ch of chunks) {
      let parts = [ch];
      while (parts.some((p) => len(p) > 22 && p.length > 1)) parts = parts.flatMap((p) => {
        if (len(p) <= 22 || p.length < 2) return [p];
        let best = 1, bestK = Infinity;
        for (let i = 1; i < p.length; i++) { const k = Math.max(len(p.slice(0, i)), len(p.slice(i))); if (k < bestK) { bestK = k; best = i; } }
        return [p.slice(0, best), p.slice(best)];
      });
      lines.push(...parts);
    }
    for (const ws of lines) caps.push({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0: ws[0].t - 0.04, t1: stretchEnd(l, ws[ws.length - 1].e) + 0.25, w0: ws[0].t, w1: ws[ws.length - 1].e });
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } }); // a caption never runs over a cut
  caps.forEach((c, i) => { const n = caps[i + 1], s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (n && n.n === c.n && s && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) { if (n.t0 >= s.t1 - 1e-6) { c.t1 = s.t1; n.t0 = s.t1; } else c.t1 = n.t0; } }); // no flash of an empty frame inside a line: a caption that a cut ends is followed at the cut, a short breath between words is bridged
  caps[caps.length - 1].t1 = Math.min(caps[caps.length - 1].t1, T.share); // the share line takes the place of the last caption
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
export const SHARE = "Send this to the friend who always says yes to the candle party.";
export const shareK = (f: number) => ease((f / FPS - T.share) / 0.18);

// ── sound cues for the mix (scripts/tup-cues.mts): name, time, db, optional length and fade
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  HITS.forEach((h) => add(h.sfx, onPeak(h.sfx, h.t), h.db, { ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}) }));
  // the projector under the sepia shots (the clip is 10 s long: three of them follow each other, each starting 0.2 s before the last one ends) and the 1950s jazz from the living room to the end of the newspaper's shots
  const bed = T.s31 + 0.1 - T.s8;
  for (let t = 0; t < bed; t += 9.8) add("filmbed", T.s8 + t, 0, bed - t < 10 ? { len: bed - t, fade: 0.4 } : {});
  const jazz = T.s31 - T.s14;
  for (let t = 0; t < jazz; t += 17.8) add("penstory", T.s14 + t, 0, jazz - t < 18 ? { len: jazz - t, fade: 1.2 } : {});
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: key frames, at least one per shot, chosen away from blinks (tup-check.mts)
const ALL = Object.keys(SEEDS);
const blinking = (f: number) => ALL.some((c) => BLINKS[c].some((s) => f >= s - 1 && f <= s + 3));
const kf = (label: string, t: number) => { let f = Math.round(t * FPS); const i = shotAt(f).i; for (let d = 0; d < 8 && blinking(f) && shotAt(f + 1).i === i; d++) f++; return { label, f }; }; // a key frame moves off a blink but stays in its own shot
const mid = (a: number, b: number) => (a + b) / 2;
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 hook: the invite, frame 0", 0), kf("1 hook: she types", mid(T.type0, T.sendT)), kf("1 hook: sent", T.sendT + 0.06),
  kf("2 rhoBrow: her brow", T.brow + 0.05), kf("3 denSupport: I'm just supporting a friend", L(1).start + 0.4), kf("4 rhoStore: That party's a store", L(2).start + 0.3),
  kf("5 denParty: It's a party", L(3).start + 0.3), kf("6 rhoLook: Shut up and look", L(4).start + 0.2), kf("7 dive: the push", mid(T.s7, T.proj0)), kf("7 dive: the bowl fills the frame", T.proj0 - 0.02),
  kf("8 storeDust: the pull back", T.s8 + 0.3), kf("8 storeDust: the puff", T.puff + 0.08), kf("8 storeDust: the card", T.stamp + 0.15), kf("9 pileBowls: Plastic bowls", L(5).words[2].t + 0.2),
  kf("10 storeWide: the yawn", mid(T.s10 + 0.65, T.s10 + 1.1)), kf("11 lidPop: the press", T.lidPress + 0.04), kf("11 lidPop: the lid in the air", mid(T.lidPop, T.lidLand)), kf("11 lidPop: it has landed", T.lidLand + 0.1),
  kf("12 clerkShrug: the shrug", T.shrug + 0.1), kf("13 burp: the press", T.burpT - 0.12), kf("13 burp: the puff", T.burpT + 0.05), kf("13 burp: sealed", T.ding1 + 0.05), kf("14 gasp: the jolt", T.gaspT + 0.05),
  kf("15 hostessBrownie: Brownie Wise", L(8).words[6].t + 0.1), kf("16 hostessHolds: To her friends", L(9).start + 0.2), kf("17 denChew: the bite", T.chipT + 0.06),
  kf("18 storeEmpty: the first stacks gone", mid(STACK_T[2], STACK_T[3])), kf("18 storeEmpty: bare shelf", T.s19 - 0.08), kf("19 doorCard: the card swings", T.cardDrop + 0.2),
  kf("20 giftHand: the box comes in", mid(T.s20, T.handover)), kf("20 giftHand: handed over", T.handover - 0.02), kf("21 giftBeam: she beams", T.giftPop + 0.15), kf("22 formsSlide: a form slides", mid(T.slide2, T.slide2 + SLIDE)),
  kf("23 guest1: Sure", L(12).start + 0.1), kf("24 guest2: Sure", L(13).start + 0.1), kf("25 guest3: Sure", L(14).start + 0.1), kf("26 hostessSells: One woman's selling", L(15).start + 0.3),
  kf("27 formsPile: the forms land", FORMS[2] + 0.07), kf("28 denLooks: she looks at the bowl", T.lookT + 0.2), kf("29 paperSpin: it spins", mid(T.s29, T.paperStop)), kf("29 paperSpin: it has stopped", T.paperStop + 0.12),
  kf("30 paperClose: the sum", L(19).start + 0.3), kf("31 rhoGroup: Now it's the group chat", L(20).start + 0.3), kf("32 phoneBuzz: the buzz", T.buzz + 0.1), kf("32 phoneBuzz: the text, readable", T.buzz + 1.0),
  kf("33 rhoSurvey: A 2018 survey", L(21).words[2].t + 0.2), kf("34 denPhone: people who sell this stuff", L(21).words[6].t + 0.1), kf("35 denStamp: the stamp lands", T.stampT + 0.08), kf("35 denStamp: the stamp, held", mid(T.stampT + 0.5, T.s36)),
  kf("36 denMarketing: the bowl", T.s36 + 0.6), kf("36 denMarketing: Fucking marketing", L(22).words[1].t + 0.15), kf("37 wideEnd: the second can", T.crack + 0.07), kf("37 wideEnd: the share line", T.share + 0.6),
];
