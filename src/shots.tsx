import React from "react";
import type { Cam } from "./Stage";
import { Basement, RING_FLOOR, WL } from "./basement";
import { Bedroom } from "./bedroom";
import { armToward } from "./chars";
import { BOWL_AT, DAVE_AT, DAVE_SHOULDER_R, LivingRoom, PHONE_REST } from "./living";
import { Kitchen, KBOWL, KDAVE, KDAVE_SHOULDER_L } from "./kitchen";
import { BootPuddle, DrainTop, WrenchMacro } from "./macros";
import { EndCard, InsBooked, InsChad, InsCompose, InsDaveMsg, InsReply, InsSearch } from "./inserts";
import { BOOT_HIT, CAL_FLIP, RING_LANDS, TYPED, WRENCH_SNAP, blinkAt, mouthAt, type Sched, type ShotKey, type Who } from "./sched";
import { STREET_VAN_STOP, Street } from "./street";

// One function per shot: given the clock (g global, t since the cut, d the shot length) it returns the flat scene, the
// camera (zoom, pan, a shake on impact), and anything drawn over it (a phone close-up). The camera only ever zooms and pans.
export type Ctx = { S: Sched; g: number; t: number; d: number; u: number };
export type ShotOut = { scene?: React.ReactNode; cam?: Cam; bg?: string; dom?: React.ReactNode; hideStamp?: boolean };

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const E = (t: number) => { const u = cl(t); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shake = (t: number, t0: number, amp: number, dur = 0.3, f = 62) => (t >= t0 && t < t0 + dur ? amp * (1 - (t - t0) / dur) * Math.sin((t - t0) * f) : 0);
// a camera on (x, y) at `zoom`, with the subject lifted `up` px above the middle (the captions live below)
const view = (zoom: number, x: number, y: number, up = 140, extra: Partial<Cam> = {}): Cam => ({ zoom, x, y: y - up / zoom, ...extra });
const mouth = (c: Ctx, who: Who) => mouthAt(c.S, who, c.g);

// Linda, acting: her mouth follows her voice, she blinks, she looks at the phone
const lindaActing = (c: Ctx, o: Record<string, unknown> = {}) => ({ mouth: mouth(c, "linda"), lid: blinkAt(c.g, 3), look: [0, -0.7] as [number, number], brow: 0.7, tilt: -4, ...o });

export const SHOT_FNS: Record<ShotKey, (c: Ctx) => ShotOut> = {
  // ── A. the basement, Friday 9:04 PM ──
  burst: (c) => {
    const T0 = 0.08;
    const spray = cl((c.t - T0) / 0.3);
    const sh = shake(c.t, T0, 16, 0.55, 74);
    return { scene: <Basement st={{ g: c.g, spray, water: WL }} />, cam: { zoom: 2.3, x: 250 + sh, y: 560 + sh * 0.6, rot: sh * 0.1 } };
  },
  lindaType: (c) => ({
    scene: <Basement st={{ g: c.g, water: lerp(-215, WL, E(c.t / 0.9)), linda: lindaActing(c, { pose: "type" }) }} />,
    cam: view(1.9, -10, -40, 150, { zoom: 1.9 + 0.05 * c.u }),
  }),
  insSearch: (c) => ({ bg: "#3A4658", dom: <InsSearch S={c.S} g={c.g} t={c.t} d={c.d} />, hideStamp: true }),
  insMsgA: (c) => ({ bg: "#3A4658", dom: <InsCompose S={c.S} g={c.g} t={c.t} d={c.d} k={1} text={TYPED.msg.text} send={c.S.shots[5].start + 9} />, hideStamp: true }),
  linda2: (c) => ({
    scene: <Basement st={{ g: c.g, linda: lindaActing(c, { pose: "type" }) }} />,
    cam: view(2.4, -10, 10, 150, { zoom: 2.4 + 0.06 * c.u }),
  }),
  insSend: (c) => ({ bg: "#3A4658", dom: <InsCompose S={c.S} g={c.g} t={c.t} d={c.d} k={1} text={TYPED.msg.text} send={c.S.P[1] + c.S.takes[1].end + 0.1} thumb />, hideStamp: true }),

  // ── B. Dave living room: the phone buzzes ──
  livingWide: (c) => ({ scene: <LivingRoom st={{ g: c.g, phone: { ...PHONE_REST, buzz: 1 } }} />, cam: view(1, 0, -30, 0, { zoom: 1 + 0.04 * c.u }) }),
  barb1: (c) => ({
    scene: <LivingRoom st={{ g: c.g, barbMouth: mouth(c, "barb"), barbLid: 0.42 + 0.5 * blinkAt(c.g, 1), phone: { ...PHONE_REST, buzz: 1 } }} />,
    cam: { zoom: 1.9 + 0.1 * c.u, x: 250, y: 20 },
  }),
  dave1: (c) => ({
    scene: <LivingRoom st={{ g: c.g, daveMouth: mouth(c, "dave") > 0 ? mouth(c, "dave") : undefined, daveTilt: 5, phone: { ...PHONE_REST, buzz: 1 } }} />,
    cam: { zoom: 1.7 + 0.06 * c.u, x: -290, y: -10 },
  }),
  barb2: (c) => ({
    scene: <LivingRoom st={{ g: c.g, barbMouth: mouth(c, "barb"), barbLid: 0.42 + 0.5 * blinkAt(c.g, 1), barbLook: [-0.45, -0.9], phone: { ...PHONE_REST, buzz: 1 } }} />,
    cam: { zoom: 2.0 + 0.04 * c.u, x: 250, y: 20 },
  }),
  phoneTable: (c) => ({
    scene: <LivingRoom st={{ g: c.g, phone: { ...PHONE_REST, buzz: 1 } }} />,
    cam: view(2.3, 20, -330, 170, { zoom: 2.3 + 0.1 * c.u }),
  }),
  dave2: (c) => ({
    scene: <LivingRoom st={{ g: c.g, daveMouth: mouth(c, "dave") > 0 ? mouth(c, "dave") : undefined, daveTilt: 5 + 3 * c.u, phone: { ...PHONE_REST, buzz: 1 } }} />,
    cam: { zoom: 1.7 + 0.08 * c.u, x: -290, y: -10 },
  }),
  // the sleeping hand flops down onto the phone (it stops buzzing)
  daveFlop: (c) => {
    const tgt = armToward(DAVE_SHOULDER_R, 1, [PHONE_REST.x + 6, PHONE_REST.y + 96], DAVE_AT.s);
    const f = E(c.t / 0.2);
    return {
      scene: <LivingRoom st={{ g: c.g, daveTilt: lerp(7, 14, f), daveMouth: 0.55, reach: { a: lerp(22, tgt.a, f), len: lerp(96, tgt.len, f) }, phone: { ...PHONE_REST, buzz: c.t < 0.2 ? 1 : 0 } }} />,
      cam: view(1.15, -120, -140, 0, { x: -120 + shake(c.t, 0.2, 4, 0.2), y: -140 }),
    };
  },
  // ... and pushes it face down into the dip: it shrinks into the bowl, the dip splashes, bubbles: blub
  dip: (c) => {
    const BX = BOWL_AT[0], BY = BOWL_AT[1];
    const t = c.t * 1.55; // the beat is 0.6 s; the motion was drawn for 0.93 s
    const slide = E((t - 0.2) / 0.34);
    const drop = E((t - 0.54) / 0.24);
    const sc = lerp(1, 0.26, drop);
    const flip = cl((t - 0.54) / 0.08);
    const px = lerp(PHONE_REST.x, BX, slide), py = lerp(PHONE_REST.y, BY + 30, slide) - 70 * drop;
    const back = E((t - 0.82) / 0.1);
    const hand: [number, number] = [px + 6, py + 96 * sc];
    const rest: [number, number] = [80, -200];
    const tgt = armToward(DAVE_SHOULDER_R, 1, [lerp(hand[0], rest[0], back), lerp(hand[1], rest[1], back)], DAVE_AT.s);
    const gone = drop >= 0.97;
    return {
      scene: <LivingRoom st={{ g: c.g, daveTilt: 14, daveMouth: 0.5, reach: { a: tgt.a, len: tgt.len }, phone: gone ? null : { x: px, y: py, r: lerp(PHONE_REST.r, 0, slide), flip, scale: sc, z: t > 0.54 ? 81.4 : 90 }, bubbles: cl((t - 0.7) / 0.28), splash: cl((t - 0.58) / 0.32) }} />,
      cam: view(2.0, -40, -330, 90, { x: -40 + shake(t, 0.6, 5, 0.25), y: -330 - 45 }),
    };
  },

  // ── C. Chad bedroom, Friday 9:05 PM ──
  chadWide: (c) => ({ scene: <Bedroom st={{ g: c.g, buzz: c.t > 0.1 ? 1 : 0 }} />, cam: view(1, -30, -60, 0, { zoom: 1 + 0.04 * c.u }) }),
  insChad: (c) => ({ bg: "#2B2A4A", dom: <InsChad S={c.S} g={c.g} t={c.t} d={c.d} />, hideStamp: true }),
  chadWide2: (c) => ({ scene: <Bedroom st={{ g: c.g, smile: 1.05 }} />, cam: view(1.55, -170, 70, 120, { zoom: 1.55 + 0.05 * c.u }) }),
  chadClose: (c) => ({
    scene: <Bedroom st={{ g: c.g, smile: lerp(0.9, 1.3, E(c.t / 0.8)), mouth: 0.3 + 0.55 * mouth(c, "chad") }} />,
    cam: view(2.2, 10, 130, 150, { zoom: 2.2 + 0.1 * c.u }),
  }),
  insBooked: (c) => ({ bg: "#2B2A4A", dom: <InsBooked S={c.S} g={c.g} t={c.t} d={c.d} />, hideStamp: true }),

  // ── D. the basement again: relief, the van, the drain ──
  lindaHug: (c) => ({
    scene: <Basement st={{ g: c.g, linda: lindaActing(c, { pose: "hug", lid: 0.97, brow: 0.3, mouth: mouth(c, "linda"), tongue: false, teeth: true, tilt: 3 }) }} />,
    cam: view(1.8, -10, -20, 150, { zoom: 1.8 + 0.05 * c.u }),
  }),
  streetVan: (c) => {
    const u = E(c.t / 0.45);
    const x = lerp(-1150, STREET_VAN_STOP, u);
    return {
      scene: <Street st={{ g: c.g, van: { x, wheel: -(x / 54) * 57.3, r: c.t > 0.45 ? 1.6 * Math.exp(-(c.t - 0.45) * 9) * Math.cos((c.t - 0.45) * 28) : -0.8 * (1 - u), brake: c.t > 0.4 ? 1 : 0 } }} />,
      cam: { zoom: 1, x: shake(c.t, 0.45, 5, 0.3), y: 0 },
    };
  },
  boot: (c) => ({ scene: <BootPuddle t={c.t} g={c.g} />, cam: { zoom: 1, x: shake(c.t, BOOT_HIT, 12, 0.25), y: shake(c.t, BOOT_HIT, 10, 0.25, 50) } }),
  wrench: (c) => ({ scene: <WrenchMacro t={c.t} />, cam: { zoom: 1, x: shake(c.t, WRENCH_SNAP, 16, 0.3), y: shake(c.t, WRENCH_SNAP, 12, 0.3, 48) } }),
  drain: (c) => ({ scene: <DrainTop t={c.t} dur={c.d} />, cam: { zoom: 1.3, x: 0, y: -30 } }),
  basementDry: (c) => {
    const water = lerp(WL, -560, cl(c.t / (c.d * 0.9)) ** 1.6);
    const landed = water - 90 <= RING_FLOOR;
    const tl = RING_LANDS * c.d;
    return {
      scene: <Basement st={{ g: c.g, water, spray: 0, fixed: true, duck: null, box: { y: Math.max(water - 310, -470) }, linda: lindaActing(c, { pose: "hug", mouth: 0.18, tongue: false, look: [Math.sin(c.g * 5) * 0.6, 0.1], brow: 0.5, bob: false }) }} />,
      cam: view(1.2, -10, -130, 100, { x: -10 + (landed ? shake(c.t, tl, 7, 0.3) : 0), y: -130 - 100 / 1.2 + (landed ? shake(c.t, tl, 12, 0.3, 50) : 0) }),
    };
  },
  lindaHero: (c) => ({
    scene: <Basement st={{ g: c.g, water: null, fixed: true, spray: 0, linda: lindaActing(c, { pose: "hug", heartEyes: true, hearts: c.g, look: [0, 0.1], brow: 0.2, tongue: false, teeth: true, tilt: 8, lid: 0 }) }} />,
    cam: view(2.0, -10, -10, 150, { zoom: 2.0 + 0.05 * c.u }),
  }),

  // ── E. Monday: the calendar, the kitchen, Dave texts, Linda answers ──
  calendar: (c) => ({ scene: <Kitchen st={{ g: c.g, calendar: cl((c.t - CAL_FLIP[0]) / CAL_FLIP[1]) * 3 }} />, cam: view(3.0, -100, 600, 100, { zoom: 3.0 + 0.1 * c.u }) }),
  kitchenWide: (c) => {
    const t = c.t * 1.9; // the beat is 0.77 s; the motion was drawn for 1.45 s
    const inBowl: [number, number] = [KBOWL[0], KBOWL[1] - 20];
    const up: [number, number] = [-300, -250];
    const belly: [number, number] = [-230, -120];
    const swipe = cl((t - 0.62) / 0.6);
    const wipePos: [number, number] = [belly[0] + Math.sin(swipe * Math.PI * 4) * 60, belly[1] + 10 * Math.sin(swipe * Math.PI * 8)];
    let hand: [number, number];
    if (t < 0.3) hand = [lerp(-330, inBowl[0], E(t / 0.3)), lerp(-170, inBowl[1], E(t / 0.3))];
    else if (t < 0.62) hand = [lerp(inBowl[0], up[0], E((t - 0.3) / 0.32)), lerp(inBowl[1], up[1], E((t - 0.3) / 0.32))];
    else if (t < 1.25) hand = [lerp(up[0], wipePos[0], E((t - 0.62) / 0.12)), lerp(up[1], wipePos[1], E((t - 0.62) / 0.12))];
    else hand = [lerp(wipePos[0], -200, E((t - 1.25) / 0.2)), lerp(wipePos[1], -150, E((t - 1.25) / 0.2))];
    const holding = t >= 1.4;
    const pulled = t >= 0.3;
    return {
      scene: <Kitchen st={{ g: c.g, fish: holding ? null : { to: hand }, held: holding, phone: holding ? null : { x: hand[0], y: hand[1] + (pulled ? 40 : 76), inside: !pulled, goo: true }, dave: { smear: cl((t - 0.65) / 0.5), look: [-0.2, -0.8], lid: 0.3, armL: holding ? -58 : 0, armR: holding ? -58 : 6, armLLen: holding ? 100 : 20, armRLen: holding ? 100 : 96 }, bubbles: cl((t - 0.3) / 0.3) * (t < 0.6 ? 1 : 0) }} />,
      cam: view(1, 0, -40, 0, { zoom: 1 + 0.03 * c.u }),
    };
  },
  daveType: (c) => ({
    scene: <Kitchen st={{ g: c.g, held: true, phone: null, dave: { smear: 1, look: [0, -0.85], lid: 0.2 + 0.7 * blinkAt(c.g, 0), mouth: mouth(c, "dave") > 0 ? 0.25 + 0.7 * mouth(c, "dave") : 0.28, teeth: true, tongue: false, smile: 1, brow: 0, raise: [12, 12], armL: -58 + 2 * Math.sin(c.g * 18), armR: -58 + 2 * Math.sin(c.g * 18 + 2), armLLen: 100, armRLen: 100 } }} />,
    cam: view(1.9, -200, 10, 150, { zoom: 1.9 + 0.06 * c.u }),
  }),
  insDaveMsg: (c) => ({ bg: "#E9D9B4", dom: <InsDaveMsg S={c.S} g={c.g} t={c.t} d={c.d} />, hideStamp: true }),
  lindaMonday: (c) => ({
    scene: <Basement st={{ g: c.g, water: null, monday: true, fixed: true, spray: 0, clock: [8, 12], linda: lindaActing(c, { pose: "type", mask: "up", lid: 0.35 + 0.6 * blinkAt(c.g, 2), look: [0, -0.75], brow: 0, mouth: mouth(c, "linda") > 0 ? 0.18 + 0.4 * mouth(c, "linda") : 0, tongue: false, teeth: false, tilt: 0 }) }} />,
    cam: view(1.45, 10, 100, 140, { zoom: 1.45 + 0.04 * c.u }),
  }),
  insReply: (c) => ({ bg: "#E9D9B4", dom: <InsReply S={c.S} g={c.g} t={c.t} d={c.d} />, hideStamp: true }),
  // Dave freezes: eyes wide, the mustache droops; then he turns his head to Barb
  daveFreeze: (c) => ({
    scene: <Kitchen st={{ g: c.g, held: true, phone: null, dave: { smear: 1, look: [0, -0.5], lid: 0, pupil: 4.5, mouth: 0, tongue: false, brow: 0.7, raise: [0, 0], droop: E(c.t / 0.4), armL: -58, armR: -58, armLLen: 100, armRLen: 100 } }} />,
    cam: view(2.0, -200, 50, 150, { zoom: 2.0 + 0.2 * c.u }),
  }),
  daveTurn: (c) => {
    const turn = E(c.t / 0.3);
    return {
      scene: <Kitchen st={{ g: c.g, held: true, phone: null, dave: { smear: 1, turn, look: [lerp(0, 1, turn), 0], lid: 0.1, pupil: 5, droop: 1, mouth: mouth(c, "dave") > 0 ? 0.2 + 0.7 * mouth(c, "dave") : 0, tongue: false, brow: 0.5, tilt: lerp(0, 3, turn), armL: -58, armR: -58, armLLen: 100, armRLen: 100 } }} />,
      cam: view(1.2, 65, 20, 100, { zoom: 1.2 + 0.04 * c.u }),
    };
  },
  barbEnd: (c) => ({
    scene: <Kitchen st={{ g: c.g, held: true, phone: null, barb: { mouth: mouth(c, "barb") > 0 ? 0.1 + 0.3 * mouth(c, "barb") : 0, lid: 0.42 + 0.5 * blinkAt(c.g, 1) }, dave: { smear: 1, turn: 1, droop: 1, look: [1, 0], lid: 0.1, pupil: 5, mouth: 0, tongue: false, brow: 0.5, armL: -58, armR: -58, armLLen: 100, armRLen: 100 } }} />,
    cam: view(2.1, 300, 40, 150, { zoom: 2.1 + 0.05 * c.u }),
  }),
  endcard: (c) => ({ bg: "#000", dom: <EndCard t={c.t} />, hideStamp: true }),
};
export { KDAVE, KDAVE_SHOULDER_L };
