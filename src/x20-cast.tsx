import React from "react";
import { Inked, Poly, ellipsePts, ribbon, type Pt } from "./sp-puppet";
import { FR } from "./x13-draw";
import { Flat, TalkMouth, kid, pic20, type Pic } from "./x20-stage";
import { coverPts, dotAt, type Eye, type V } from "./x20-eyes";
import { mouthAt, talkMove, type Who } from "./x20-sched";

// The people of x20 "One Coffee" as flat cut-outs (scripts/x20-prep.py cuts them from out/x20-cast, src/x20-rig.json holds what was measured): the camper in his seven pictures, the three guys of the row, Ross soaked in foam. A person is placed by the middle between his eyes
// (the picture's `anchor`) on a frame point at a scale `k` (frame px per picture px); what the code draws over the painted face (lids for a blink, pupils that look somewhere, a mouth that talks over the painted one) is in the Flat's children, in the picture's own px.
const anchorOf = (d: Pic): V => d.anchor as unknown as V;
export const P = (name: string): Pic => { const d = pic20(name); if (!d) throw new Error(`x20-rig has no picture ${name}: run scripts/x20-prep.py`); return d; };
/** the frame point where a picture point (px, py) lands for a figure whose anchor point `a` (picture px) is on the frame point (x, y) at scale k (no turn) */
export const figPt = (a: V, x: number, y: number, k: number, px: number, py: number): V => [x + (px - a[0]) * k, y + (py - a[1]) * k];

/** a lid over each painted eye: a skin-coloured cap that comes down by `c` (0 open .. 1 shut) with a dark line along its edge (the eyes' ovals are the picture's, measured). From c 0.75 on the eye is shut: the cap covers the whole oval (the camper's pupils sit on the lower edge of the white, they must not peek out)
 * and the line is a gentle arc across it, as a closed eye is drawn */
export function EyeLids20({ eyes, d, ax, ay, skin, c, order }: { eyes: Eye[]; d: Pic; ax: number; ay: number; skin: string; c: number; order: number }) {
  if (c <= 0.02) return null;
  const shut = c >= 0.75;
  return (
    <>
      {eyes.map((e, i) => {
        const [x, y] = kid(d, ax, ay, e.cx, e.cy), rx = e.rx + 3.5, ry = e.ry + 3.5;
        if (shut) {
          const cap: Pt[] = Array.from({ length: 29 }, (_, j) => { const a = (j / 28) * Math.PI * 2; return [x + rx * Math.cos(a), y + ry * Math.sin(a)] as Pt; });
          const line = Array.from({ length: 11 }, (_, j) => { const u = j / 10, w = 2 * u - 1; return [x + w * rx * 0.9, y - 0.12 * ry - 0.16 * ry * (1 - w * w), 4.2 * (0.55 + 0.45 * (1 - w * w))] as number[]; });
          return (
            <React.Fragment key={i}>
              <Poly pts={cap} color={skin} order={order} />
              <Poly pts={ribbon(line)} color="#2a1a0a" order={order + 0.1} />
            </React.Fragment>
          );
        }
        const yl = y + ry - 2 * ry * Math.min(1, c), a0 = Math.asin(Math.max(-1, Math.min(1, (yl - y) / ry)));
        const arc: Pt[] = Array.from({ length: 29 }, (_, j) => { const a = a0 + ((Math.PI - 2 * a0) * j) / 28; return [x + rx * Math.cos(a), y + ry * Math.sin(a)] as Pt; });
        const xr = x + rx * Math.cos(a0), xl = x - rx * Math.cos(a0), line = Array.from({ length: 9 }, (_, j) => { const u = j / 8; return [xl + (xr - xl) * u, yl - 0.09 * ry * Math.sin(Math.PI * u), 4.2] as number[]; });
        return (
          <React.Fragment key={i}>
            <Poly pts={arc} color={skin} order={order} />
            <Poly pts={ribbon(line)} color="#2a1a0a" order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/** pupils that look somewhere: the painted pupil is covered with the eye's white (the cover is the painted pupil's disc cut to the eye's oval, so it never spills over the lid), a dot of the painted size goes where `look` says (-1 .. 1 across and down the white, x right, y down;
 * [0, 0] is the middle of the eye, not the painted spot); `mix` 0 puts the dot on the painted pupil's own spot, 1 on `look`. All in picture px, drawn in the children of a Flat */
export function EyeDots({ d, ax, ay, look, mix = 1, order, ink = "#0a0a0a", dot }: { d: Pic; ax: number; ay: number; look: V; mix?: number; order: number; ink?: string; dot?: number }) {
  const eyes = d.eyes as unknown as Eye[], pupils = d.pupils as unknown as number[][], white = (d.white as string) ?? "#fdfdfb";
  return (
    <>
      {eyes.map((e, i) => {
        const q = pupils[Math.min(i, pupils.length - 1)] ?? [e.cx, e.cy, 8], r = dot ?? q[2];
        const cover: Pt[] = coverPts(e, q).map(([px, py]) => kid(d, ax, ay, px, py) as Pt), [kx, ky] = kid(d, ax, ay, ...dotAt(e, q, look, mix, r));
        return (
          <React.Fragment key={i}>
            <Poly pts={cover} color={white} order={order} />
            <Poly pts={ellipsePts(kx, ky, r, r, 18)} color={ink} order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}

type FigProps = { f: number; x: number; y: number; k: number; rot?: number; sx?: number; sy?: number; order?: number; tint?: string; flip?: boolean; /** the picture point that lands on (x, y) when it is not the eye midpoint (the camper's table pictures share one head: they are all placed by the same point) */ at?: V };
type FaceProps = { who?: Who; talk?: boolean; lid?: number; look?: V; mix?: number; /** how much bigger than the painted mouth's box the skin patch under the talking mouth is (a wide painted smile has corners outside the usual 1.05) */ patch?: number };
/** a person of x20 by his picture name: placed by his eye midpoint; `talk` draws his voice's mouth over the painted one (if the picture has a mouth box), `lid` a blink, `look` pupils that look somewhere; `children` are drawn in the picture's px about the anchor */
export function Person({ f, name, x, y, k, rot = 0, sx = 1, sy = 1, order = 30, tint, flip = false, at, who, talk = false, lid = 0, look, mix = 1, patch = 1.05, children }: FigProps & FaceProps & { name: string; children?: (g: { ax: number; ay: number; d: Pic }) => React.ReactNode }) {
  const d = P(name), a = at ?? anchorOf(d), eyes = d.eyes as unknown as Eye[] | undefined;
  return (
    <Flat d={d} apx={a[0]} apy={a[1]} x={x} y={y} k={k} rot={rot} sx={sx} sy={sy} order={order} tint={tint} flip={flip}>
      {({ ax, ay }) => (
        <>
          {look && d.eyes && d.pupils && <EyeDots d={d} ax={ax} ay={ay} look={look} mix={mix} order={order + 1} />}
          {talk && d.grin && who && <TalkMouth grin={d.grin} d={d} ax={ax} ay={ay} shape={mouthAt(who, f)} order={order + 2} patch={patch} />}
          {lid > 0.02 && eyes && <EyeLids20 eyes={eyes} d={d} ax={ax} ay={ay} skin={d.skin ?? "#fed38d"} c={lid} order={order + 3} />}
          {children?.({ ax, ay, d })}
        </>
      )}
    </Flat>
  );
}

/** the camper's own movement at his table: a tilt and a dip with every loud syllable (src/x20-sched.ts talkMove), a typing shiver in the shot he types in */
export function camperMove(f: number, typing = false): { rot: number; dy: number; dx: number } {
  const m = talkMove("CAMPER", f), tick = typing ? ((Math.floor(f / 2) * 7) % 3) - 1 : 0;
  return { rot: m.tilt * 0.35, dy: -m.bob * 0.5 + (typing ? 0.8 * Math.abs(tick) : 0), dx: typing ? 0.9 * tick : 0 };
}

/** a plain café chair's back seen from the front, behind the sitter: two posts, a top rail and a lower rail, in the wood of the café's tables; frame px, (x, y) the middle of the top rail, `w` the posts' distance, `h` their height down from the rail */
export function ChairBack({ x, y, w, h, k = 1, order }: { x: number; y: number; w: number; h: number; k?: number; order: number }) {
  const post = 30 * k;
  return (
    <>
      {[-1, 1].map((s) => <Inked key={s} pts={FR(x + s * w / 2 - post / 2, y - 20 * k, x + s * w / 2 + post / 2, y + h)} color="#6b4a26" ink="#2a1a0c" w={4} order={order} />)}
      <Inked pts={FR(x - w / 2 - 12 * k, y - 34 * k, x + w / 2 + 12 * k, y + 34 * k)} color="#7a5530" ink="#2a1a0c" w={4} order={order + 0.2} />
      <Inked pts={FR(x - w / 2, y + 0.55 * h, x + w / 2, y + 0.55 * h + 26 * k)} color="#7a5530" ink="#2a1a0c" w={4} order={order + 0.1} />
    </>
  );
}
