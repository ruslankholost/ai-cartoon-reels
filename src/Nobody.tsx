import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BEVAN, Bk, Boil, C, FilmFx, f1, popAt, rnd, rrect } from "./nb-kit";
import { SHOTS } from "./nb-shots";
import { FPS, SPEAKER, buildSched, shotAt, type Sched, type Timings } from "./nb-sched";
import timings from "../public/nobody/timings.json";
import amps from "./amp-nobody.json";

// "Nobody Picks Up": one SVG per frame, 1930s rubber-hose look. The schedule comes from the voice takes; every shot is a function
// in nb-shots.tsx; captions and the end card are drawn here. The voices are placed by the schedule, the rest of the sound is mixed later.
export const SCHED = buildSched(timings as unknown as Timings, amps);
export const NOBODY_FRAMES = SCHED.frames;

function Captions({ S, g }: { S: Sched; g: number }) {
  const c = S.caps.find((q) => g >= q.t0 - 1e-6 && g < q.t1 - 1e-6);
  if (!c) return null;
  const n = c.text.length;
  const size = n <= 8 ? 120 : n <= 12 ? 108 : n <= 15 ? 96 : 84; // the widest line stays left of the Instagram buttons (x < 950)
  return (
    <div style={{ position: "absolute", left: 30, right: 130, top: 1290, height: 210, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "0 30px", alignContent: "center" }}>
      {c.words.map((w, i) => {
        const e = (g - w.at) * FPS;
        const sc = e < 0 ? 0.8 : 1 + 0.1 * Math.max(0, 1 - e / 5);
        return (
          <span key={i} style={{ fontFamily: BEVAN, fontSize: size, lineHeight: 1.08, color: SPEAKER[c.who] ?? "#fff", WebkitTextStroke: "14px #14100c", paintOrder: "stroke fill", visibility: g >= w.at - 0.02 ? "visible" : "hidden", transform: `scale(${sc})`, letterSpacing: 1, textTransform: "uppercase" }}>{w.text}</span>
        );
      })}
    </div>
  );
}

export const Nobody: React.FC<{ noCaps?: boolean }> = ({ noCaps }) => {
  const frame = useCurrentFrame();
  const g = frame / FPS;
  const { shot } = shotAt(SCHED, g);
  const t = g - shot.start, d = shot.end - shot.start;
  const k = shot.cuts.filter((c) => g >= c - 1e-6).length;
  const out = SHOTS[shot.key]({ S: SCHED, g, f: frame, t, d, u: Math.min(1, Math.max(0, t / d)), k });
  const cam = out.cam ?? {};
  const zoom = cam.zoom ?? 1, cx = cam.x ?? 540, cy = cam.y ?? 960;
  const sh = out.shake ?? [0, 0];
  const weave: [number, number] = [Math.sin(frame * 0.7) * 2.2 + (rnd(frame, 11) - 0.5) * 2, Math.sin(frame * 0.43 + 1) * 1.8 + (rnd(frame, 12) - 0.5) * 2];
  const card = out.card ?? -1;
  const cs = card >= 0 ? popAt(card, 0, 0.25) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs><Boil f={frame} id="boil" scale={5} /></defs>
        <g transform={`translate(${f1(weave[0] + sh[0])} ${f1(weave[1] + sh[1])})`}>
          <g filter="url(#boil)">
            <g transform={`translate(540 960) rotate(${cam.rot ?? 0}) scale(${f1(zoom * 1000) / 1000}) translate(${-cx} ${-cy})`}>{out.scene}</g>
          </g>
          {card >= 0 && (
            <g transform={`translate(490 1380) scale(${cs}) translate(-490 -1380)`}>
              <Bk d={rrect(110, 1300, 760, 160, 22)} fill={C.cream} sw={16} />
              <Bk d={rrect(128, 1318, 724, 124, 12)} fill="none" sw={5} />
              <text x={490} y={1400} textAnchor="middle" fontFamily={BEVAN} fontSize={80} fill={C.ink} letterSpacing={1}>@get.phantom</text>
            </g>
          )}
        </g>
        <FilmFx f={frame} flash={out.flash ?? 0} />
      </svg>
      {!noCaps && <Captions S={SCHED} g={g} />}
      {SCHED.takes.map((tk, i) => (
        <Sequence key={tk.file} from={Math.round(SCHED.P[i] * FPS)}>
          <Audio src={staticFile(tk.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
