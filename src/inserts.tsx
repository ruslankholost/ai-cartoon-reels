import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { FPS, SPEAKER, TYPED, mouthAt, typedAt, type Sched } from "./sched";

// Everything flat that is drawn over the picture: the phone close-ups (a flat phone with a screen you can read, a
// mitten tapping), the speaker-coloured captions, the stamps and the end card. Plain DOM, so the text stays crisp.
export const { fontFamily: OSWALD } = loadOswald("normal", { weights: ["500", "700"] });
const UI = "Arial, Helvetica, sans-serif";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;
const pop = (t: number) => { const u = clamp(t, 0, 1); return u < 1 ? 1 + 0.18 * Math.sin(u * Math.PI) * (1 - u) * 2.2 : 1; };

// ── the phone ──
function Goo() {
  return (
    <svg width="600" height="1010" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <g fill="#7FA83A" stroke="none">
        <ellipse cx="505" cy="190" rx="46" ry="66" transform="rotate(-18 505 190)" />
        <rect x="486" y="226" width="20" height="96" rx="10" />
        <ellipse cx="34" cy="640" rx="30" ry="54" transform="rotate(-10 34 640)" />
        <rect x="24" y="680" width="18" height="84" rx="9" />
      </g>
    </svg>
  );
}
function PhoneShell({ children, tilt = 0, scale = 1, goo = false, y = 0 }: { children: React.ReactNode; tilt?: number; scale?: number; goo?: boolean; y?: number }) {
  return (
    <div style={{ position: "absolute", left: 240, top: 300 + y, width: 600, height: 1010, transform: `rotate(${tilt}deg) scale(${scale})`, transformOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", inset: 0, background: "#171820", border: "7px solid #000", borderRadius: 78, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: 26, top: 30, right: 26, bottom: 30, background: "#fff", border: "5px solid #000", borderRadius: 52, overflow: "hidden", boxSizing: "border-box" }}>{children}</div>
      <div style={{ position: "absolute", left: 292, top: 12, width: 16, height: 16, borderRadius: 8, background: "#000" }} />
      {goo && <Goo />}
    </div>
  );
}
function Backdrop({ color }: { color: string }) {
  return <AbsoluteFill style={{ background: color }} />;
}
// a mitten: the thumb that taps
function Thumb({ x, y, press = 0 }: { x: number; y: number; press?: number }) {
  const s = 1 - 0.12 * press;
  return (
    <svg width="240" height="240" style={{ position: "absolute", left: x - 120, top: y - 120, transform: `scale(${s})`, filter: "none" }}>
      <ellipse cx="170" cy="84" rx="34" ry="58" transform="rotate(-30 170 84)" fill="#F4CDA6" stroke="#000" strokeWidth="6" />
      <circle cx="120" cy="130" r="86" fill="#F4CDA6" stroke="#000" strokeWidth="7" />
    </svg>
  );
}
const Caret = ({ g }: { g: number }) => <span style={{ display: "inline-block", width: 4, height: "1em", background: "#111", marginLeft: 3, verticalAlign: "-0.12em", opacity: Math.floor(g * 3) % 2 ? 0 : 1 }} />;
const Bubble = ({ side, color, text, size = 36, style }: { side: "l" | "r"; color: string; text: string; size?: number; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", justifyContent: side === "r" ? "flex-end" : "flex-start", ...style }}>
    <div style={{ maxWidth: 400, background: color, color: side === "r" ? "#fff" : "#111", fontFamily: UI, fontWeight: 700, fontSize: size, lineHeight: 1.15, padding: "16px 24px", borderRadius: 34, border: "5px solid #000" }}>{text}</div>
  </div>
);
const Stars = () => <span style={{ color: "#F5A623", letterSpacing: 2 }}>★★★★★</span>;

// ── the screens ──
function SearchScreen({ typed, results, press }: { typed: string; results: number; press: number }) {
  const row = (title: string, rating: string, status: React.ReactNode, sub: string, hot: boolean) => (
    <div style={{ padding: "20px 30px", borderBottom: "4px solid #E1E4EA", background: hot && press > 0 ? "#CFE0FF" : "#fff" }}>
      <div style={{ fontFamily: UI, fontWeight: 800, fontSize: 44, color: "#1A55D6" }}>{title}</div>
      <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 30, color: "#333", marginTop: 4 }}><Stars /> {rating}</div>
      <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 30, color: "#555", marginTop: 2 }}>{status}</div>
      <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 30, color: "#555", marginTop: 0 }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff" }}>
      <div style={{ position: "absolute", left: 30, top: 24, fontFamily: UI, fontWeight: 800, fontSize: 32 }}>9:04</div>
      <div style={{ position: "absolute", right: 30, top: 28, width: 48, height: 22, border: "4px solid #000", borderRadius: 6, boxSizing: "border-box" }}><div style={{ width: "70%", height: "100%", background: "#000" }} /></div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 84, height: 104, background: "#EEF1F5", border: "5px solid #000", borderRadius: 52, display: "flex", alignItems: "center", padding: "0 26px", gap: 16, boxSizing: "border-box" }}>
        <svg width="46" height="46" viewBox="0 0 46 46" style={{ flexShrink: 0 }}><circle cx="19" cy="19" r="13" fill="none" stroke="#000" strokeWidth="6" /><line x1="29" y1="29" x2="42" y2="42" stroke="#000" strokeWidth="7" strokeLinecap="round" /></svg>
        <div style={{ fontFamily: UI, fontWeight: 800, fontSize: 44, color: "#111", whiteSpace: "nowrap" }}>{typed}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 220, opacity: results, transform: `translateY(${(1 - results) * 40}px)` }}>
        {row("Dave's Plumbing", "4.8 (212)", <>Plumber · <span style={{ color: "#D93025" }}>Closed</span></>, "Opens Mon 8 AM", true)}
        {row("Chad's Plumbing", "4.9 (87)", <>Plumber · <span style={{ color: "#188038" }}>Open 24 hours</span></>, "Call now", false)}
        <svg width="538" height="300" viewBox="0 0 538 300" style={{ display: "block" }}>
          <rect width="538" height="300" fill="#CFE8C8" />
          <path d="M-10 220 L200 120 L360 170 L560 60" stroke="#fff" strokeWidth="26" fill="none" />
          <path d="M120 320 L180 -10" stroke="#fff" strokeWidth="18" fill="none" />
          <rect x="300" y="190" width="150" height="90" fill="#A9D4EE" />
          {[[170, 130], [330, 160], [440, 80]].map(([px, py], i) => <path key={i} d={`M${px} ${py} c-22 -28 -30 -40 -30 -56 a30 30 0 1 1 60 0 c0 16 -8 28 -30 56 z`} fill={i === 0 ? "#D93025" : "#E86A9A"} stroke="#000" strokeWidth="5" />)}
        </svg>
      </div>
    </div>
  );
}
function ComposeScreen({ typed, send, who, old, newLabel, g }: { typed: string; send: number; who: React.ReactNode; old?: boolean; newLabel?: string; g: number }) {
  const sent = ease(send);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F4F5F8" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, background: "#fff", borderBottom: "5px solid #000", padding: "24px 28px 0", boxSizing: "border-box", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 26, color: "#777", paddingTop: 12 }}>To:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{who}</div>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 196, display: "flex", flexDirection: "column", gap: 16 }}>
        {old && (
          <>
            <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 24, color: "#888", textAlign: "center" }}>Fri 9:04 PM</div>
            <Bubble side="l" color="#E5E7EB" text="My basement is flooding! How soon can you come?" size={34} />
          </>
        )}
        {newLabel && send > 0 && <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 24, color: "#888", textAlign: "center", marginTop: 10, opacity: sent }}>{newLabel}</div>}
        {send > 0 && <div style={{ opacity: sent, transform: `translateY(${(1 - sent) * 380}px)` }}><Bubble side="r" color="#1A6DF0" text={typed} size={36} /><div style={{ fontFamily: UI, fontWeight: 700, fontSize: 24, color: "#888", textAlign: "right", marginTop: 6 }}>{sent >= 1 ? "Delivered" : ""}</div></div>}
      </div>
      <div style={{ position: "absolute", left: 20, right: 20, bottom: 22, minHeight: 130, background: "#fff", border: "5px solid #000", borderRadius: 48, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px 14px 28px", boxSizing: "border-box", opacity: send > 0 ? 0.4 : 1 }}>
        <div style={{ flex: 1, fontFamily: UI, fontWeight: 700, fontSize: 40, lineHeight: 1.15, color: "#111" }}>{send > 0 ? "" : typed}{send > 0 ? null : <Caret g={g} />}</div>
        <div style={{ width: 84, height: 84, borderRadius: 42, background: "#1A6DF0", border: "5px solid #000", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.14 * (send > 0 && send < 0.3 ? 1 : 0)})` }}>
          <svg width="40" height="44" viewBox="0 0 40 44"><path d="M20 38 V8 M8 20 L20 8 L32 20" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  );
}
const Chip = ({ text }: { text: string }) => <div style={{ fontFamily: UI, fontWeight: 800, fontSize: 30, background: "#D6E4FF", border: "4px solid #000", borderRadius: 30, padding: "6px 18px", color: "#123" }}>{text}</div>;

function Smiley({ mouth, wink = 0, size = 190 }: { mouth: number; wink?: number; size?: number }) {
  const o = clamp(mouth, 0, 1);
  return (
    <svg width={size} height={size} viewBox="0 0 170 170">
      <circle cx="85" cy="85" r="76" fill="#FFD43B" stroke="#000" strokeWidth="7" />
      <ellipse cx="58" cy="66" rx="9" ry="15" fill="#111" />
      {wink > 0.5 ? <path d="M96 70 Q112 56 128 70" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" /> : <ellipse cx="112" cy="66" rx="9" ry="15" fill="#111" />}
      {o < 0.08 ? <path d="M42 100 Q85 138 128 100" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" /> : (
        <>
          <path d={`M42 98 Q85 ${112} 128 98 Q85 ${98 + 24 + 46 * o} 42 98 Z`} fill="#111" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
          {o > 0.45 && <ellipse cx="85" cy={98 + 20 + 30 * o} rx="20" ry="9" fill="#E8737C" />}
        </>
      )}
    </svg>
  );
}
function ChadScreen({ typed, mouth, booked, wink }: { typed: string; mouth: number; booked: number; wink: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F4F5F8" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 210, background: "#fff", borderBottom: "5px solid #000", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, boxSizing: "border-box" }}>
        <Smiley mouth={mouth} wink={wink} size={140} />
        <div style={{ fontFamily: UI, fontWeight: 800, fontSize: 26, color: "#333", marginTop: 2 }}>Chad's Plumbing</div>
      </div>
      <div style={{ position: "absolute", left: 22, right: 22, top: 236, display: "flex", flexDirection: "column", gap: 14 }}>
        <Bubble side="l" color="#E5E7EB" text="My basement is flooding! How soon can you come?" size={30} />
        {typed && <Bubble side="r" color="#1A6DF0" text={typed} size={34} />}
        {booked > 0.1 && <div style={{ transform: `scale(${pop((booked - 0.1) / 0.3)})`, transformOrigin: "left center", opacity: clamp(booked * 6, 0, 1) }}><Bubble side="l" color="#E5E7EB" text="Yes!" size={38} /></div>}
        {booked > 0.5 && (
          <div style={{ transform: `scale(${pop((booked - 0.5) / 0.4)})`, display: "flex", justifyContent: "center", marginTop: 6 }}>
            <div style={{ background: "#2BB24C", border: "6px solid #000", borderRadius: 36, color: "#fff", fontFamily: UI, fontWeight: 900, fontSize: 70, padding: "10px 44px", whiteSpace: "nowrap" }}>Booked ✓</div>
          </div>
        )}
      </div>
    </div>
  );
}
function ReplyScreen({ popT }: { popT: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F4F5F8" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: "#fff", borderBottom: "5px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI, fontWeight: 800, fontSize: 40 }}>Linda</div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 150, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 24, color: "#888", textAlign: "center" }}>Fri 9:04 PM</div>
        <Bubble side="l" color="#E5E7EB" text="My basement is flooding! How soon can you come?" size={32} />
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 24, color: "#888", textAlign: "center", marginTop: 6 }}>Mon 8:01 AM</div>
        <Bubble side="r" color="#1A6DF0" text="Hi Linda! Still need help?" size={36} />
        {popT > 0 && <div style={{ transform: `scale(${pop(popT / 0.35)})`, transformOrigin: "left center" }}><Bubble side="l" color="#E5E7EB" text="Who is this?" size={50} /></div>}
      </div>
    </div>
  );
}

// ── the inserts, one per shot ──
export type InsertProps = { S: Sched; g: number; t: number; d: number };
const who2 = <><Chip text="Dave's Plumbing" /><Chip text="Chad's Plumbing" /></>;

export function InsSearch({ S, g, t }: InsertProps) {
  const typed = typedAt(S, TYPED.search.k, g, TYPED.search.text, TYPED.search.from);
  const typedDone = S.P[0] + S.takes[0].words[3].e;
  const results = ease((g - typedDone) / 0.25);
  const tap = S.P[0] + S.takes[0].words[4].t + 0.12;
  const press = g >= tap && g < tap + 0.3 ? 1 : 0;
  const thumbIn = ease((g - (tap - 0.55)) / 0.45);
  return (
    <>
      <Backdrop color="#3A4658" />
      <PhoneShell tilt={-3} scale={1.1 + 0.03 * clamp(t / 2, 0, 1)}>
        <SearchScreen typed={typed + (typed.length < 15 ? "|" : "")} results={results} press={press} />
      </PhoneShell>
      {thumbIn > 0 && <Thumb x={lerpN(900, 760, thumbIn)} y={lerpN(1300, 700, thumbIn)} press={press} />}
    </>
  );
}
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

export function InsCompose({ S, g, t, k, text, send, thumb }: InsertProps & { k: number; text: string; send: number; thumb?: boolean }) {
  const typed = typedAt(S, k, g, text);
  const sendT = clamp((g - send) / 0.4, 0, 1);
  return (
    <>
      <Backdrop color="#3A4658" />
      <PhoneShell tilt={2} scale={1.1 + 0.03 * clamp(t / 2, 0, 1)}>
        <ComposeScreen typed={typed} send={sendT} who={who2} g={g} />
      </PhoneShell>
      {thumb && <Thumb x={lerpN(820, 700, ease((g - (send - 0.4)) / 0.4))} y={lerpN(1330, 1228, ease((g - (send - 0.4)) / 0.4))} press={g >= send - 0.02 && g < send + 0.2 ? 1 : 0} />}
    </>
  );
}

export function InsChad({ S, g, t }: InsertProps) {
  const k = 6;
  const typed = typedAt(S, k, g, TYPED.chad.text);
  return (
    <>
      <Backdrop color="#2B2A4A" />
      <PhoneShell tilt={-2} scale={1.1 + 0.03 * clamp(t / 2.4, 0, 1)}>
        <ChadScreen typed={typed} mouth={mouthAt(S, "phone", g)} booked={0} wink={0} />
      </PhoneShell>
    </>
  );
}
export function InsBooked({ S, g, t }: InsertProps) {
  return (
    <>
      <Backdrop color="#2B2A4A" />
      <PhoneShell tilt={2} scale={1.1 + 0.03 * clamp(t / 1, 0, 1)}>
        <ChadScreen typed="Hi Linda! We can be there in 40 min. Want to book?" mouth={0} booked={clamp(t / 0.32, 0, 1)} wink={t > 0.3 ? 1 : 0} />
      </PhoneShell>
    </>
  );
}
export function InsDaveMsg({ S, g, t }: InsertProps) {
  const k = 10;
  const typed = typedAt(S, k, g, TYPED.dave.text);
  const send = S.P[k] + S.takes[k].end + 0.1;
  const sendT = clamp((g - send) / 0.4, 0, 1);
  return (
    <>
      <Backdrop color="#E9D9B4" />
      <PhoneShell tilt={-2} goo scale={1.1 + 0.03 * clamp(t / 1.6, 0, 1)}>
        <ComposeScreen typed={typed} send={sendT} g={g} old newLabel="Mon 8:01 AM" who={<Chip text="Linda" />} />
      </PhoneShell>
      <Thumb x={lerpN(840, 706, ease((g - (send - 0.4)) / 0.4))} y={lerpN(1340, 1230, ease((g - (send - 0.4)) / 0.4))} press={g >= send - 0.02 && g < send + 0.2 ? 1 : 0} />
    </>
  );
}
export function InsReply({ t }: InsertProps) {
  return (
    <>
      <Backdrop color="#E9D9B4" />
      <PhoneShell tilt={1.5} goo scale={1.1 + 0.03 * clamp(t / 1, 0, 1)}>
        <ReplyScreen popT={t - 0.12} />
      </PhoneShell>
    </>
  );
}

// ── captions (speaker colour, word by word) and stamps ──
export function Captions({ S, g }: { S: Pick<Sched, "caps">; g: number }) {
  const c = S.caps.find((q) => g >= q.t0 - 1e-6 && g < q.t1 - 1e-6);
  if (!c) return null;
  const n = c.text.length;
  const size = n <= 12 ? 128 : n <= 16 ? 112 : n <= 18 ? 100 : n <= 21 ? 96 : n <= 26 ? 90 : 84; // the widest line stays left of the Instagram buttons (x < 950)
  return (
    <div style={{ position: "absolute", left: 30, right: 130, top: 1270, height: 230, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "0 38px", alignContent: "center" }}>
      {c.words.map((w, i) => {
        const e = (g - w.at) * FPS;
        const sc = e < 0 ? 0.8 : 1 + 0.1 * Math.max(0, 1 - e / 5);
        return (
          <span key={i} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: size, lineHeight: 1.04, color: SPEAKER[c.who], WebkitTextStroke: "11px #000", paintOrder: "stroke fill", visibility: g >= w.at - 0.02 ? "visible" : "hidden", transform: `scale(${sc})`, letterSpacing: 1, textTransform: "uppercase" }}>{w.text}</span>
        );
      })}
    </div>
  );
}
export function Stamps({ S, g }: { S: Pick<Sched, "stamps">; g: number }) {
  const s = S.stamps.find((q) => g >= q.t0 && g < q.t1);
  if (!s) return null;
  const u = clamp((g - s.t0) / 0.2, 0, 1);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", transform: `scale(${0.7 + 0.3 * ease(u)})`, opacity: clamp(u * 3, 0, 1) }}>
      <div style={{ transform: "rotate(-2deg)", background: "#FFFFFF", border: "8px solid #000", borderRadius: 18, padding: "10px 36px", fontFamily: OSWALD, fontWeight: 700, fontSize: 76, letterSpacing: 3, color: "#14233F" }}>{s.text}</div>
    </div>
  );
}

// overlay: the card's text sits on the last shot under a dark veil instead of a black screen (viewers left on the black card, Insights 10-19)
export function EndCard({ t, lines = ["It worked.", "For Chad."], size = 150, overlay }: { t: number; lines?: string[]; size?: number; overlay?: boolean }) {
  const a = (t0: number) => ease((t - t0) / 0.14);
  return (
    // overlay: text in the lower half under a bottom gradient, so the face on the last shot stays visible (v1 covered Phantom's face)
    <AbsoluteFill style={{ background: overlay ? `linear-gradient(to top, rgba(0,0,0,${0.8 * a(0)}) 0%, rgba(0,0,0,${0.6 * a(0)}) 50%, rgba(0,0,0,0) 72%)` : "#000", alignItems: "center", justifyContent: overlay ? "flex-end" : "center", paddingBottom: overlay ? 400 : 0, flexDirection: "column", gap: 10 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: size, color: "#fff", textTransform: "uppercase", lineHeight: 1, textAlign: "center", maxWidth: 940, transform: `scale(${0.8 + 0.2 * a(0.04 + 0.34 * i)})`, opacity: a(0.04 + 0.34 * i), ...(overlay ? { WebkitTextStroke: "10px #000", paintOrder: "stroke fill" } : {}) }}>{l}</div>
      ))}
      <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 56, color: "#5FE0D6", letterSpacing: 4, marginTop: 40, opacity: a(0.75) }}>@get.phantom</div>
    </AbsoluteFill>
  );
}
