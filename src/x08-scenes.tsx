import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, xf, type Pt } from "./sp-puppet";
import { H, W } from "./pen-stage";
import {
  CORK_T, CRASH_T, CUTS, DING_T, FPS, KEY_T, LAUNCH_T, ROBOT_T, SHOT_IDS, SLAP_T, STAR_T, TAP1, TAP2_T, TAPS_T, THUD_T, buzzHop, dayAt, ease, ghostFloat, ghostPoke, ghostPose, lerp, notifyK, passRules, popIn, rossPose,
  stackOff, starOn, thumbAt, tickK, tilePop, tilesTicked, twos, typedKeys, weakK, windowAt, wrongK, type ShotId,
} from "./x08-sched";
import { Ghost, GHOST_ANCHOR, GHOST_K, InkSet, LIVING, LampGlow, NIGHT_PUPPET, PeelActor, Plate, RJ, ROSS, RossActor, Shake, ShoulderGhost, bodyPt, cam, capsule, headPt, loc, rossFrame, shotX } from "./x08-shared";
import { CeilingHole, Cloud, Cork, Dust, EarSteam, Exhaust, HairSmoke, PlasterRain, PopBurst, SunShaft, steamSprites8 } from "./x08-fx";
import { HandPhone, PlainPhone, PuppetScreen, WindowPlane, WindowShadow, glassPt, layerPt, type Screen } from "./x08-ui";

// The three.js scenes of x08 "Just Let Me Pay" (docs/x08-just-let-me-pay.md, the build spec): one ortho canvas per shot, hard cuts. One room (the plate x08-bg-living.jpg: the couch, the lamp, the night window) in the night and
// the morning; the phone's screens are drawn in code on the hand of ross-hand-62 (the inserts), on the phone Ross holds, or on a phone of its own (src/x08-ui.tsx). Layers: plate 0, lamp light 1, Ross 40-55 (his body 40, the ghost 41,
// the painted phone's screen 45, his head 50), light over him 60, steam 70, corks 75, windows and plaster 100+. Every scene is made by shotX() (src/x08-shared.tsx). Positions are panel px (y up) unless a name says frame px.
type VW = ReturnType<typeof cam>;
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const toFrame = (p: [number, number]): [number, number] => [p[0] + W / 2, H / 2 - p[1]]; // panel -> frame px
const toPanel = (p: [number, number]): [number, number] => [p[0] - W / 2, H / 2 - p[1]];

// ── the views (cam(s, u, v): the plate point (u, v) in the middle of the frame, s frame px per plate px). Ross's neck pivot is at the frame point where the notes say
const CLOSE = cam(3.7, 397, 895);       // his face from the shoulders up: the pivot at frame (540, 1040), E 1.70
const SCREAM = cam(3.0, 397, 804);      // the phone above his head in frame: pivot (540, 1300), E 1.38
const XCLOSE = cam(4.5, 397, 847);      // his face fills the frame: pivot (540, 1276), E 2.07
const TWO = cam(3.2, 392, 886);         // the two of them, he to the right, room at the left for the ghost's shrug
const WIDE = cam(1.41, 384, 571);       // the whole room and a high ceiling above it: E 0.65, his pivot at frame (559, 1448)
const SEAT = cam(3.2, 397, 1000);       // the couch's seat, close
const FRONT = cam(2.8, 397, 1010);      // him above, the phone in the foreground: pivot (540, 700), E 1.29

// ── the insert: the hand and its phone, big (every phone shot but the two with him behind it)
const INS = { E: 2.2, x: -81.4, y: -201.4 };
const FRONT_PHONE = { E: 1.7, x: 37, y: -514 };
const insBg = (red = 0) => (
  <>
    <Poly pts={rect(-W, H, W, -H)} color="#080c19" order={0} />
    <Glow x={0} y={80} rx={760} ry={1000} op={0.5} order={1} color="rgba(120,160,255,1)" />
    {red > 0.01 && <Glow x={0} y={80} rx={900} ry={1100} op={0.34 * red} order={2} color="rgba(255,70,50,1)" />}
  </>
);
/** a design point of the glass (300 x 640) as a panel point, for a hand at (x, y) at scale E */
const dpt = (x: number, y: number, E: number, dx: number, dy: number): [number, number] => { const [lx, ly] = glassPt(dx, dy); return layerPt(x, y, E, lx, ly); };

// ── the thumb (code): the other hand's thumb comes up from below the frame to a point of the glass (a design point); hovering it is bigger (nearer the lens) with a shadow under it, pressed it squashes
function Thumb({ x, y, E, at, down, sq = 0, rise = 1, order }: { x: number; y: number; E: number; at: [number, number]; down: number; sq?: number; rise?: number; order: number }) {
  const hov = 1 - down, tip = glassPt(at[0], at[1]), away = 1 - rise; // `rise` < 1: the thumb still comes up from below the frame, along its own line
  const T: Pt = [tip[0] - 14 * hov - 60 * away, tip[1] + 70 * hov + 600 * away];
  const d2: Pt = [-0.1, 0.995], d1: Pt = [-0.42, 0.907]; // the tip's bar leans a little, the bar behind the knuckle bends away to the lower left
  const K: Pt = [T[0] + d2[0] * 175, T[1] + d2[1] * 175], B: Pt = [K[0] + d1[0] * 1100, K[1] + d1[1] * 1100];
  const wT = 62 * (1 + 0.18 * hov) * (1 + 0.1 * sq), wK = 84 * (1 + 0.18 * hov), wB = 112 * (1 + 0.18 * hov);
  const P = (p: Pt): Pt => layerPt(x, y, E, p[0], p[1]);
  const skin = "#fed493", ink = "#8a6234";
  const nailC: Pt = [T[0] - d2[0] * wT * 0.06, T[1] - d2[1] * wT * 0.06];
  const nail = ellipsePts(0, 0, 0.3 * wT, 0.42 * wT, 22).map(([a, b]) => P([nailC[0] + a, nailC[1] + b]));
  const n: Pt = [d2[1], -d2[0]];
  const crease = ribbon([[...P([K[0] - n[0] * 0.3 * wK, K[1] - n[1] * 0.3 * wK + 4]), 2.6 * E], [...P([K[0], K[1] + 10]), 3 * E], [...P([K[0] + n[0] * 0.3 * wK, K[1] + n[1] * 0.3 * wK + 4]), 2.6 * E]]);
  const tp = P(T);
  return (
    <>
      {[1.5, 1.2, 0.9].map((k, i) => <Poly key={i} pts={xf(ellipsePts(0, 0, 34 * E * k, 20 * E * k, 24), tp[0] + 30 * E * hov, tp[1] - 62 * E * hov - 20, 0)} color="#06101e" order={order - 0.1 + i * 0.01} op={0.1 * hov} />)}
      <InkSet parts={[capsule(B, K, wB / 2, wK / 2).map(P), capsule(K, T, wK / 2, wT / 2).map(P)]} color={skin} ink={ink} w={3.4} order={order} />
      <Poly pts={crease} color={ink} order={order + 0.3} op={0.5} />
      <Inked pts={nail} color="#ffeccc" ink="#c49a60" w={1.8} order={order + 0.4} />
    </>
  );
}
const CHECKOUT_TIP: [number, number] = [50, 356]; // the padlock at the left end of the button (design px of the glass)

// ── Ross in the night room: the plate, the lamp, Ross, his ghost, the phone's light; `screen` is drawn on the glass of the phone he holds; children go on top
type RP = ReturnType<typeof rossPose>;
function Room({ f, m, screen, ghost = true, ghostK = 1, children }: { f: number; m: VW; screen?: Screen; ghost?: boolean; ghostK?: number; children?: React.ReactNode | ((g: { x: number; y: number; E: number; p: RP }) => React.ReactNode) }) {
  const { x, y, E } = rossFrame(m), p = rossPose(f), day = dayAt(f) > 0;
  const tint = day ? undefined : NIGHT_PUPPET;
  const glowAt = bodyPt(p, E, x, y, p.body === "up" ? 0 : -39.6, p.body === "up" ? 560 : -116.4);
  return (
    <>
      <Plate m={m} f={f} />
      {!day && <LampGlow m={m} />}
      <RossActor f={f} x={x} y={y} E={E} tint={tint} />
      {screen && (p.body === "sit" || p.body === "up") && <PuppetScreen pose={p.body} x={x} y={y} E={E} p={p} screen={screen} order={45} />}
      {ghost && <ShoulderGhost f={f} x={x} y={y} E={E} p={p} kMul={ghostK} />}
      {!day && <Glow x={glowAt[0]} y={glowAt[1]} rx={430 * E / 1.7} ry={430 * E / 1.7} op={0.34} order={60} color="rgba(150,200,255,1)" />}
      {typeof children === "function" ? children({ x, y, E, p }) : children}
    </>
  );
}
const SHOP: Screen = { kind: "shop", press: 0, flash: 0 };

// ═════════════════════════════════════════════════════ 2: four pop-ups fly out of the phone and slap onto his face, stacking like sticky notes; 3: he peels the stack off
const SLAP = [{ x: -34, y: 246, rot: -6, s: 0.84 }, { x: 40, y: 282, rot: 4.5, s: 0.88 }, { x: -18, y: 232, rot: -3.5, s: 0.94 }, { x: 4, y: 252, rot: 1.6, s: 1.06 }]; // where window i ends up on his face (panel px, degrees, scale)
const PHONE_AT: [number, number] = [-60, -250]; // the phone in his hands, in this view (panel px)
function Stack({ f, rip = false }: { f: number; rip?: boolean }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const w = windowAt(i, f), off = rip ? stackOff(i, f) : 0;
        if (!w.on) return null;
        const S = SLAP[i], fl = w.fly, sq = 1 + 0.1 * w.land;
        const x0 = lerp(PHONE_AT[0], S.x, fl), y0 = lerp(PHONE_AT[1], S.y, fl) + 90 * Math.sin(Math.PI * fl) * (i % 2 ? -1 : 1);
        const s = lerp(0.26, S.s, fl) * sq, rot = lerp(S.rot + (i % 2 ? -30 : 30), S.rot, fl);
        const dir = [[-1.1, 0.5], [1.2, 0.6], [-0.9, 1], [1, 0.9]][i];
        const ox = off * dir[0] * 620, oy = off * dir[1] * 760, os = 1 + off * 0.55, orot = off * dir[0] * 28;
        return (
          <React.Fragment key={i}>
            <WindowShadow i={i} x={x0 + ox} y={y0 + oy} s={s * os} rot={rot + orot} order={100 + i * 4} op={0.55 * Math.max(0, 1 - off)} />
            <WindowPlane i={i} x={x0 + ox} y={y0 + oy} s={s * os} rot={rot + orot} order={101 + i * 4} />
          </React.Fragment>
        );
      })}
    </>
  );
}
const Slaps = shotX(({ f }) => {
  const t = f / FPS, flash = SLAP_T.reduce((k, ts) => (t >= ts ? Math.max(k, Math.exp(-(t - ts) / 0.035)) : k), 0);
  return (
    <Shake f={f}>
      <Room f={f} m={CLOSE} screen={SHOP} />
      <Stack f={f} />
      {flash > 0.02 && <Poly pts={rect(-W, H, W, -H)} color="#ffffff" order={250} op={0.3 * flash} />}
    </Shake>
  );
}, [540, 700]);
const Peel = shotX(({ f }) => {
  const m = CLOSE, { x, y, E } = rossFrame(m), p = rossPose(f);
  return (
    <Shake f={f}>
      <Plate m={m} f={f} />
      <LampGlow m={m} />
      <PeelActor f={f} x={x} y={y} E={E} tint={NIGHT_PUPPET} />
      <ShoulderGhost f={f} x={x} y={y} E={E} p={p} />
      <Stack f={f} rip />
    </Shake>
  );
}, [540, 700]);

// ═════════════════════════════════════════════════════ 4: the password screen
const Password = shotX(({ f }) => {
  const k = typedKeys(f), jig = k > 0 && k < KEY_T.length ? (twos(f) % 4 ? 3 : -3) : 0;
  return (
    <Shake f={f}>
      {insBg()}
      <HandPhone x={INS.x} y={INS.y + jig} E={INS.E} screen={{ kind: "password", rules: passRules(f), typed: k, weak: weakK(f) }} order={10} />
    </Shake>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ 5: seething
const Socks = shotX(({ f }) => <Room f={f} m={CLOSE} screen={SHOP} />, [540, 760]);

// ═════════════════════════════════════════════════════ 6: the captcha, nine faces, nine taps
const Captcha = shotX(({ f }) => {
  const t = f / FPS, n = tilesTicked(f);
  const tilePos = (i: number): [number, number] => [64 + 86 * (i % 3), 182 + 86 * Math.floor(i / 3)];
  const cur = Math.max(0, Math.min(8, n - 1)), prev = Math.max(0, cur - 1);
  const dt = t - TAPS_T[cur];
  const from = tilePos(prev), to = tilePos(n === 0 ? 0 : cur);
  const k = n === 0 ? 1 : ease(dt / 0.04);
  const lift = TAPS_T[8] + 0.06, away = ease((t - lift) / 0.14); // after the last tap the thumb lifts off and drops out of the frame, clear of the error banner
  const enter = n === 0 ? ease((t - (TAPS_T[0] - 0.7)) / 0.5) : 1; // before the first tap it still comes up from below the frame
  const pos: [number, number] = n === 0 ? [to[0] - 40, to[1] + 120] : [lerp(from[0], to[0], k) + 60 * away, lerp(from[1], to[1], k) + 330 * away];
  const down = n === 0 ? 0 : dt >= -1e-6 && dt < 0.05 ? 1 : 0.35;
  const wrong = wrongK(f);
  const ticked = Array.from({ length: 9 }, (_, i) => tilePop(i, f));
  return (
    <Shake f={f}>
      {insBg()}
      <HandPhone x={INS.x} y={INS.y} E={INS.E} screen={{ kind: "captcha", ticked, wrong }} order={10} />
      <Thumb x={INS.x} y={INS.y} E={INS.E} at={[pos[0] + 8, pos[1] + 26]} down={t >= lift ? 0 : down} sq={down > 0.9 && t < lift ? 0.6 : 0} rise={enter} order={20} />
    </Shake>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ 7 and 8: the tunnels shoot out like corks; steam whistles out of the holes like a kettle
const PLUGS = (RJ.ross.plugs as number[][]).map(([X, Y, r]) => ({ at: loc(ROSS, X, Y), r }));
function holesAt(p: RP, E: number, x: number, y: number): [[number, number], [number, number]] {
  return [headPt(p, E, x, y, PLUGS[0].at[0], PLUGS[0].at[1]), headPt(p, E, x, y, PLUGS[1].at[0], PLUGS[1].at[1])];
}
const Corks = shotX(({ f }) => {
  const t = f / FPS;
  return (
    <Shake f={f}>
      <Room f={f} m={CLOSE} screen={SHOP}>
        {({ x, y, E, p }) => {
          const h = holesAt(p, E, x, y), R = PLUGS[0].r * E;
          return (
            <>
              <Cork at={h[0]} dir={-1} t={t} t0={CORK_T[0]} r={R * 1.5} order={75} />
              <Cork at={h[1]} dir={1} t={t} t0={CORK_T[1]} r={R * 1.5} order={75} up={0.8} />
              <PopBurst at={h[0]} t={t} t0={CORK_T[0]} R={R * 2.2} order={74} />
              <PopBurst at={h[1]} t={t} t0={CORK_T[1]} R={R * 2.2} order={74} />
            </>
          );
        }}
      </Room>
    </Shake>
  );
}, [540, 700]);
/** the steam out of both ear holes of the Ross of this view, drawn over the room */
const Jets = ({ f, m }: { f: number; m: VW }) => {
  const { x, y, E } = rossFrame(m), p = rossPose(f), h = holesAt(p, E, x, y);
  return <EarSteam f={f} left={toFrame(h[0])} right={toFrame(h[1])} k={E / 1.7} order={70} />;
};
const Kettle = shotX(({ f }) => (
  <Room f={f} m={CLOSE} screen={SHOP}><Jets f={f} m={CLOSE} /></Room>
), [540, 700]);

// ═════════════════════════════════════════════════════ 9: "Last step! Prove you're human."
const Last = shotX(({ f }) => {
  const t = f / FPS;
  const sp = [...steamSprites8([10, 1960], 1, t, 1.1, 3, 1.3), ...steamSprites8([1070, 1960], -1, t, 1.1, 4, 1.3)]; // the kettle goes on out of frame: clouds rise at the two bottom corners
  return (
    <Shake f={f}>
      {insBg()}
      <HandPhone x={INS.x} y={INS.y} E={INS.E} screen={{ kind: "last", pop: popIn(f, DING_T), t: t - DING_T }} order={10} />
      {sp.length > 0 && <Cloud sprites={sp} order={70} opacity={0.92} />}
    </Shake>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ 10 and 11: the scream
const SCREAM_SCREEN: Screen = { kind: "last", pop: 1, t: 0 };
const Scream = shotX(({ f }) => (
  <Room f={f} m={SCREAM} screen={SCREAM_SCREEN} ghostK={0.85}><Jets f={f} m={SCREAM} /></Room>
), [540, 1000]);
const ScreamClose = shotX(({ f }) => (
  <Shake f={f}>
    <Room f={f} m={XCLOSE} screen={SCREAM_SCREEN}><Jets f={f} m={XCLOSE} /></Room>
  </Shake>
), [540, 900]);

// ═════════════════════════════════════════════════════ 12: "Too aggressive. Are you a robot? 🤖"
const Robot = shotX(({ f }) => (
  <Shake f={f}>
    {insBg(Math.exp(-Math.max(0, f / FPS - ROBOT_T) / 0.25))}
    <HandPhone x={INS.x} y={INS.y} E={INS.E} screen={{ kind: "robot", tick: 0, pop: popIn(f, ROBOT_T) }} order={10} />
  </Shake>
), [540, 960]);

// ═════════════════════════════════════════════════════ 1, 21, 22 and 13: his head above, the big hand and the phone in front of him. Shots 1, 21 and 22: the cart page, the thumb over CHECKOUT (it rises, hovers, slams; trembles; slams);
// 13: the ghost floats to the phone and ticks "I'm not a robot"
function FrontShot({ f, screen, ghost, thumb, tapT }: { f: number; screen: Screen; ghost: boolean; thumb?: boolean; tapT?: number }) {
  const m = FRONT, { x, y, E } = rossFrame(m), p = rossPose(f), P = FRONT_PHONE, night = dayAt(f) === 0;
  const box = dpt(P.x, P.y, P.E, 58, 428), th = thumbAt(f), btn = dpt(P.x, P.y, P.E, 150, 326);
  const flash = tapT === undefined ? 0 : Math.max(0, 1 - Math.abs(f / FPS - tapT - 0.02) / 0.1);
  const u = thumb ? 0 : ghostFloat(f), poke = ghostPoke(f); // the shots with the thumb: the ghost stays on his shoulder
  const g0 = bodyPt(p, E, x, y, GHOST_ANCHOR[0], GHOST_ANCHOR[1]);
  const k1 = 1.9, arm = 40 + 14 * poke; // the tip of its right arm (shoulder (44, 56), 95 degrees out: level) lands on the box from the left
  const A = (95 * Math.PI) / 180, tipOff: [number, number] = [44 + Math.sin(A) * arm, 56 - Math.cos(A) * arm];
  const g1: [number, number] = [box[0] - tipOff[0] * k1, box[1] - tipOff[1] * k1];
  const path = (a: number): [number, number] => [lerp(g0[0], g1[0], a) - 50 * Math.sin(Math.PI * a), lerp(g0[1], g1[1], a)];
  const gp = path(u), gk = lerp(GHOST_K * E, k1, ease(u)), gose = ghostPose(f);
  return (
    <>
      <Plate m={m} f={f} />
      {night && <LampGlow m={m} />}
      <RossActor f={f} x={x} y={y} E={E} tint={night ? NIGHT_PUPPET : undefined} />
      {ghost && u <= 0.001 && <ShoulderGhost f={f} x={x} y={y} E={E} p={p} />}
      {night && <Glow x={P.x + 60} y={P.y + 700} rx={620} ry={700} op={0.3} order={60} color="rgba(150,200,255,1)" />}
      <HandPhone x={P.x} y={P.y} E={P.E} screen={screen} order={80} />
      {thumb && <Thumb x={P.x} y={P.y} E={P.E} at={CHECKOUT_TIP} down={th.down} sq={th.sq} rise={th.rise} order={90} />}
      {flash > 0.01 && <Glow x={btn[0]} y={btn[1]} rx={520} ry={360} op={0.5 * flash} order={96} color="rgba(255,235,150,1)" />}
      {ghost && u > 0.001 && <Ghost x={gp[0]} y={gp[1]} k={gk} pose={{ ...gose, armR: lerp(18, 95, ease(u * 3)), lenR: lerp(20, arm, ease(u * 3)), armL: 30, sy: 1 - 0.1 * poke, sx: 1 + 0.06 * poke, gaze: [0.7, 0.3], rot: 0 }} order={95} ink={Math.max(3, gk * 0.7)} />}
    </>
  );
}
/** the cart page with its CHECKOUT button pressed from the tap on, and a white ring round it for a few frames */
const cartScreen = (f: number, tapT: number): Screen => ({ kind: "shop", press: thumbAt(f).down > 0.9 ? 1 : 0, flash: Math.max(0, 1 - Math.abs(f / FPS - tapT - 0.02) / 0.1) });
// 1: "Aaand... checkout." The thumb comes up, hovers, slams CHECKOUT on the end of the word; the first pop-up flies out of the phone at his face (shot 2 takes it from there)
const Buy = shotX(({ f }) => {
  const w = windowAt(0, f);
  return (
    <Shake f={f}>
      <FrontShot f={f} screen={cartScreen(f, TAP1)} ghost thumb tapT={TAP1} />
      {w.on && <WindowPlane i={0} x={lerp(100, -20, w.fly)} y={lerp(-300, 450, w.fly)} s={lerp(0.2, 1.0, w.fly)} rot={lerp(-24, -6, w.fly)} order={120} />}
    </Shake>
  );
}, [540, 960]);
const Tick = shotX(({ f }) => <FrontShot f={f} screen={{ kind: "robot", tick: tickK(f), pop: 1 }} ghost />, [540, 960]);
// 21: the morning, soot on his face, the eye twitching, the thumb trembling over CHECKOUT through line 9; 22: the cut-in on the button, the slam, and the reel loops into shot 1
const Stare = shotX(({ f }) => <FrontShot f={f} screen={SHOP} ghost thumb />, [540, 960]);
const BuyAgain = shotX(({ f }) => <Shake f={f}><FrontShot f={f} screen={cartScreen(f, TAP2_T)} ghost thumb tapT={TAP2_T} /></Shake>, [540, 1000]);

// ═════════════════════════════════════════════════════ 14: Ross stares at the ghost, the ghost shrugs
const Shrug = shotX(({ f }) => (
  <Room f={f} m={TWO} screen={{ kind: "robot", tick: 1, pop: 1 }} ghostK={1.3} />
), [587, 900]);

// ═════════════════════════════════════════════════════ 15: "Sorry! Out of stock 😔"
const SoldOut = shotX(({ f }) => (
  <Shake f={f}>
    {insBg()}
    <HandPhone x={INS.x} y={INS.y} E={INS.E} screen={{ kind: "soldout", pop: popIn(f, THUD_T) }} order={10} />
  </Shake>
), [540, 960]);

// ═════════════════════════════════════════════════════ 16: his face goes red from the chin up, the steam thickens
const Red = shotX(({ f }) => (
  <Room f={f} m={CLOSE} screen={{ kind: "soldout", pop: 1 }}><Jets f={f} m={CLOSE} /></Room>
), [540, 700]);

// ═════════════════════════════════════════════════════ 17: the rocket
const ROCKET_A = 6300; // px/s^2: from the couch to the ceiling's edge in the 0.43 s between the launch and the crash
const rocketUp = (t: number) => { const a = Math.max(0, t - LAUNCH_T), b = Math.max(0, t - CRASH_T); return 0.5 * ROCKET_A * a * a + 1500 * b * b; };
const CEIL_Y = (m: VW) => toPanel([0, 960 + (LIVING.ceiling - (m.v0 + 960 / m.s)) * m.s])[1]; // the ceiling's edge in a view, panel y
const Launch = shotX(({ f }) => {
  const m = WIDE, { x, y, E } = rossFrame(m), t = f / FPS, launched = t >= LAUNCH_T, up = rocketUp(t);
  const p = rossPose(f), crash = t - CRASH_T, hole = t >= CRASH_T, ceilY = CEIL_Y(m);
  const pivot: [number, number] = [x + (launched ? 5 * Math.sin(t * 60) : 0), y + up];
  const gStart = bodyPt(p, E, x, y, GHOST_ANCHOR[0], GHOST_ANCHOR[1]);
  const fall = launched ? ease((t - LAUNCH_T) / 0.12) : 0, land = launched ? Math.max(0, t - LAUNCH_T - 0.12) : 0;
  const gy = gStart[1] - 56 * E * fall, bounce = 14 * E * Math.max(0, Math.sin(land * 30)) * Math.exp(-land / 0.12);
  const feet = (tb: number): [number, number] => toFrame([x, y + rocketUp(tb) - 500 * E]);
  return (
    <Shake f={f}>
      <Plate m={m} f={f} />
      <LampGlow m={m} />
      {launched && <Exhaust f={f} t0={LAUNCH_T} t1={CRASH_T + 0.3} feet={feet} k={E / 0.65} order={30} />}
      <RossActor f={f} x={pivot[0]} y={pivot[1]} E={E} tint={NIGHT_PUPPET} />
      {!launched && <ShoulderGhost f={f} x={x} y={y} E={E} p={p} />}
      {!launched && <Jets f={f} m={m} />}
      {launched && <Ghost x={gStart[0]} y={gy + bounce} k={GHOST_K * E} pose={{ ...ghostPose(f), gaze: [0, -0.8], lid: 0, sy: 1 + 0.15 * (1 - fall), armL: 150, armR: 150, rot: 16 }} order={41} ink={Math.max(2.4, 1.9 * E)} />}
      {hole && <CeilingHole cx={x} top={H / 2} bottom={ceilY} w={230} order={90} pop={Math.min(1, 0.55 + 4 * crash)} night />}
      {hole && <Dust f={f} t0={CRASH_T} at={[x, ceilY]} k={E / 0.65} order={92} />}
      {hole && <PlasterRain f={f} t0={CRASH_T} origin={[x, ceilY - 10]} spread={300 * E / 0.65} land={toPanel([0, 1640])[1]} k={E / 0.65} order={94} />}
      {hole && crash < 0.07 && <Poly pts={rect(-W, H, W, -H)} color="#ffffff" order={300} op={0.55 * (1 - crash / 0.07)} />}
    </Shake>
  );
}, [540, 700]);

// ═════════════════════════════════════════════════════ 18: the phone on the empty couch, the ghost taps five stars
const Stars = shotX(({ f }) => {
  const m = SEAT, t = f / FPS;
  const PW = 500, ph = (PW * 668) / 328, px = 0, py = 100;
  const starPos = (i: number): [number, number] => [px - PW / 2 + ((14 + 34 + 58 * i) / 328) * PW, py + ph / 2 - ((14 + 296) / 668) * ph];
  const k = 1.45, hop = 80, apexOf = (i: number): [number, number] => { const s = starPos(i); return [s[0], s[1] - 125 * k - 4]; }; // at the apex its head touches the star's lower tip
  // it darts in from the left, then hops from star to star: every apex lands on a tap's frame, between two apexes it dips (and stretches on the way up)
  const T0 = CUTS.stars, last = STAR_T[4];
  let gp: [number, number], stretch = 1;
  if (t < STAR_T[0]) { const u = ease((t - T0) / (STAR_T[0] - T0)), a0 = apexOf(0); gp = [lerp(-360, a0[0], u), lerp(a0[1] - 150, a0[1], u)]; }
  else if (t < last) { const i = STAR_T.findIndex((ts, j) => j < 4 && t < STAR_T[j + 1]), u = (t - STAR_T[i]) / (STAR_T[i + 1] - STAR_T[i]), a = apexOf(i), b = apexOf(i + 1); gp = [lerp(a[0], b[0], ease(u)), lerp(a[1], b[1], u) - hop * Math.sin(Math.PI * u)]; stretch = 1 + 0.12 * Math.cos(Math.PI * 2 * u); }
  else { const a = apexOf(4), d = ease((t - last) / 0.25); gp = [a[0], a[1] - 70 * d]; }
  const gose = ghostPose(f), hit = STAR_T.reduce((q, ts) => (t >= ts ? Math.max(q, Math.exp(-(t - ts) / 0.1)) : q), 0);
  const stars = Array.from({ length: 5 }, (_, i) => (starOn(i, f).on ? starOn(i, f).p : 0));
  return (
    <>
      <Plate m={m} f={f} />
      <LampGlow m={m} />
      <Glow x={px} y={py} rx={620} ry={760} op={0.4} order={5} color="rgba(150,200,255,1)" />
      <PlainPhone x={px} y={py} w={PW} screen={{ kind: "rate", stars }} order={20} rot={-2} />
      {STAR_T.map((ts, i) => <PopBurst key={i} at={starPos(i)} t={t} t0={ts} R={46} order={45} />)}
      <Ghost x={gp[0]} y={gp[1]} k={k} pose={{ ...gose, armL: 120, armR: 120, lenL: 24, lenR: 24, sy: stretch * (1 - 0.1 * hit), sx: 1 / Math.sqrt(stretch) * (1 + 0.1 * hit), gaze: [0, -0.7], lid: 0, rot: 0 }} order={40} ink={4.5} />
    </>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ 19: the next morning
function Birds({ m, f }: { m: VW; f: number }) {
  const t = f / FPS - CUTS.morning;
  return (
    <>
      {[0, 1].map((i) => {
        const u = (t * 0.16 + i * 0.5 + 0.1) % 1.4, x = 236 + 300 * u, y = 440 + 70 * i + 12 * Math.sin(t * 2.4 + i), fl = twos(f) % 8 < 4 ? 1 : -0.4, s = m.s / 1.5;
        if (u > 1) return null;
        return <Poly key={i} pts={xf(ribbon([[-17, 6 * fl, 3.4], [0, -5, 4], [17, 6 * fl, 3.4]]), m.X(x), m.Y(y), 0, s)} color="#2b3a4a" order={2} />;
      })}
    </>
  );
}
const Morning = shotX(({ f }) => {
  const m = WIDE;
  return (
    <Room f={f} m={m} screen={SHOP}>
      {({ x, p, y, E }) => {
        const top = headPt(p, E, x, y, -10, 410), ceilY = CEIL_Y(m);
        return (
          <>
            <Birds m={m} f={f} />
            <SunShaft cx={x} top={ceilY} floor={toPanel([0, 1640])[1]} wTop={170} wBottom={640} f={f} order={30} />
            <CeilingHole cx={x} top={H / 2} bottom={ceilY} w={230} order={90} />
            <HairSmoke f={f} at={top} k={1.1} order={72} />
          </>
        );
      }}
    </Room>
  );
}, [540, 900]);

// ═════════════════════════════════════════════════════ 20: the phone buzzes: "You left something in your cart! 😊"
const Notify = shotX(({ f }) => {
  const hop = buzzHop(f);
  return (
    <Shake f={f}>
      {insBg()}
      <HandPhone x={INS.x} y={INS.y + hop} E={INS.E} screen={{ kind: "notify", slide: notifyK(f), press: 0 }} order={10} />
    </Shake>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ the scenes of this file
const DRAWN: Record<ShotId, React.FC<{ f: number }>> = {
  buy: Buy, slaps: Slaps, peel: Peel, password: Password, socks: Socks, captcha: Captcha, corks: Corks, kettle: Kettle, last: Last, scream: Scream, screamClose: ScreamClose, robot: Robot,
  tick: Tick, shrug: Shrug, soldOut: SoldOut, red: Red, launch: Launch, stars: Stars, morning: Morning, notify: Notify, stare: Stare, buyAgain: BuyAgain,
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, DRAWN[id]])) as Record<ShotId, React.FC<{ f: number }>>;
