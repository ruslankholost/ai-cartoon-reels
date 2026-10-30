import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FPS, STAR_TAPS, T, REVIEW, TYPE_TIMES, POST_TAP, capAt, ease, scrollY } from "./nv3-sched";

// The DOM parts of "Nobody Picks Up" v3: the phone screens (a flat South Park-like UI, big bold text), the captions and the end card.
// Everything is a function of the frame; nothing reads a clock. The right 130 px and the bottom 400 px of the 1080x1920 frame stay free of anything
// that matters (Instagram covers them): the phones end at y 1270 and left of x 940, the captions and the end card sit at y 1295-1455 on the backdrop.
const FONT = "Arial, Helvetica, sans-serif";
const INK = "#16120e";
const GOLD = "#ffc62a";
const BLUE = "#1a73e8";

export function Caption({ f, split }: { f: number; split: boolean }) {
  const c = capAt(f);
  if (!c) return null;
  const size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  const top = split ? 854 + 6 - 80 : 1295;
  return (
    <div style={{ position: "absolute", left: 30, width: 920, top, height: 160, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", whiteSpace: "nowrap", fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: "#fff", WebkitTextStroke: "13px #000", paintOrder: "stroke fill" }}>
      {c.text}
    </div>
  );
}

// the end card: a flat plate over the last shot, fading in over 6 frames
export function EndCard({ f }: { f: number }) {
  const k = ease((f / FPS - T.card) / 0.2);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 90, width: 800, top: 1310, height: 150, opacity: k, transform: `translateY(${(1 - k) * 14}px)`, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff8e6", border: `10px solid ${INK}`, borderRadius: 36, fontFamily: FONT, fontWeight: 900, fontSize: 84, color: INK, letterSpacing: 1 }}>
      @get.phantom
    </div>
  );
}

// ── a star: gold with an outline, `fill` 0..1 from the left (4.8 stars = four full and a nearly full fifth)
function Star({ size, fill, id }: { size: number; fill: number; id: string }) {
  const pts = "50,6 62,38 96,38 68,58 79,92 50,71 21,92 32,58 4,38 38,38";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs><clipPath id={id}><rect x="0" y="0" width={100 * fill} height="100" /></clipPath></defs>
      <polygon points={pts} fill="#e4e4e4" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <polygon points={pts} fill={GOLD} stroke="none" clipPath={`url(#${id})`} />
      <polygon points={pts} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
function Stars({ rating, size, id }: { rating: number; size: number; id: string }) {
  return (
    <div style={{ display: "flex", gap: size * 0.08 }}>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} fill={Math.max(0, Math.min(1, rating - i))} id={`${id}${i}`} />)}
    </div>
  );
}

// ── the phone: a dark body with a thick outline, a white screen
const PH = { left: 70, top: 80, w: 840, h: 1190 }; // the whole phone; the screen is 24 px inside
const SCR = { w: PH.w - 2 * 24 - 2 * 10 - 12, h: PH.h - 2 * 24 - 2 * 10 - 12 }; // what the screen's children are laid out in (inside its own 6 px border)
function PhoneShell({ children, bg = "#ffffff" }: { children: React.ReactNode; bg?: string }) {
  return (
    <div style={{ position: "absolute", left: PH.left, top: PH.top, width: PH.w, height: PH.h, background: "#2b2b31", border: `10px solid ${INK}`, borderRadius: 96, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 24, top: 24, right: 24, bottom: 24, background: bg, borderRadius: 70, overflow: "hidden", border: `6px solid ${INK}`, boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}
// a touch: a soft grey disc where a finger is, shrinking as it lands
function Touch({ x, y, k, on = true }: { x: number; y: number; k: number; on?: boolean }) {
  if (!on || k <= 0) return null;
  return <div style={{ position: "absolute", left: x - 46, top: y - 46, width: 92, height: 92, borderRadius: 46, background: "rgba(70,70,80,0.38)", border: "5px solid rgba(40,40,50,0.5)", transform: `scale(${0.7 + 0.3 * k})`, opacity: Math.min(1, k * 2) }} />;
}
function Backdrop({ file, dim = 0.55 }: { file: string; dim?: number }) {
  return (
    <AbsoluteFill style={{ background: "#2a3a35" }}>
      <Img src={staticFile(file)} style={{ position: "absolute", left: -40, top: 0, width: 1160, height: 1920, objectFit: "cover", filter: `blur(14px) brightness(${dim})` }} />
    </AbsoluteFill>
  );
}

// ── the search list (shots 2 and 6)
type Biz = { name: string; rating: number; sub: string };
const BIZ: Biz[] = [
  { name: "AquaPro", rating: 5.0, sub: "Plumber · Open now" },
  { name: "Premier Plumbing", rating: 4.9, sub: "Plumber · Open now" },
  { name: "Flow Bros", rating: 4.8, sub: "Plumber · Open now" },
];
const GARY: Biz = { name: "Gary's Plumbing", rating: 2.1, sub: "Plumber · Open now" };
const CARD = 180, GAP = 12, DOTS = 40, SKEL = 92;
function Card({ b, hot, id, flash }: { b: Biz; hot?: boolean; id: string; flash?: number }) {
  return (
    <div style={{ height: CARD, margin: `0 18px ${GAP}px`, padding: "12px 30px", boxSizing: "border-box", background: flash ? "#cfd6dd" : "#fff", border: `${hot ? 9 : 5}px solid ${hot ? BLUE : INK}`, borderRadius: 30, fontFamily: FONT }}>
      <div style={{ fontSize: 54, fontWeight: 900, color: INK, lineHeight: 1.1 }}>{b.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: INK, lineHeight: 1 }}>{b.rating.toFixed(1)}</div>
        <Stars rating={b.rating} size={42} id={id} />
      </div>
      <div style={{ fontSize: 30, color: "#5b6168", marginTop: 5, fontWeight: 700, lineHeight: 1.1 }}>{b.sub}</div>
    </div>
  );
}
function Skeleton() {
  return (
    <div style={{ height: SKEL, margin: `0 18px ${GAP}px`, padding: "20px 30px", boxSizing: "border-box", border: "5px solid #c9cdd2", borderRadius: 30 }}>
      <div style={{ height: 20, width: "46%", background: "#dfe2e6", borderRadius: 10 }} />
      <div style={{ height: 16, width: "30%", background: "#e8eaed", borderRadius: 8, marginTop: 12 }} />
    </div>
  );
}
function Dots() {
  return <div style={{ height: DOTS, textAlign: "center", fontSize: 56, lineHeight: "26px", color: "#8a9097", fontWeight: 900, letterSpacing: 10 }}>· · ·</div>;
}
export function CallScreen({ name }: { name: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#23394a", fontFamily: FONT, color: "#fff", textAlign: "center" }}>
      <div style={{ marginTop: 270, fontSize: 52, fontWeight: 700, color: "#b9d3e6" }}>calling...</div>
      <div style={{ margin: "30px 40px 0", fontSize: 100, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
      <div style={{ position: "absolute", left: SCR.w / 2 - 100, bottom: 130, width: 200, height: 200, borderRadius: 100, background: "#e23d3d", border: `9px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 96, height: 30, background: "#fff", borderRadius: 15 }} />
      </div>
    </div>
  );
}
// the list rows start 150 px under the top of the screen; Gary's card is the 4th card after the dots and one skeleton
const ROW0 = 150;
const GARY_Y = 3 * (CARD + GAP) + DOTS + (SKEL + GAP); // the top of Gary's card inside the list
const SCROLL_PX = 250;
export function PhoneList({ f, which }: { f: number; which: "list" | "scroll" }) {
  const t = f / FPS;
  const scroll = which === "scroll" ? scrollY(f) * SCROLL_PX : 0;
  const tapAt = which === "list" ? T.aquaTap : T.gTap;
  const callAt = which === "list" ? T.aquaCall : T.gTap + 0.3;
  const tapK = Math.max(0, 1 - Math.abs(t - tapAt - 0.05) / 0.13);
  const showCall = t >= callAt;
  // the thumb drags the list up (shot 6): a touch that moves with the content, lifting when the scroll is done
  const dragK = which === "scroll" && t >= T.scrollA - 0.1 && t < T.scrollB + 0.05 ? 1 : 0;
  const dragY = 900 - scroll;
  return (
    <AbsoluteFill>
      <Backdrop file="sp/bg-bathroom.jpg" />
      <PhoneShell>
        {showCall ? <CallScreen name={which === "list" ? "AquaPro" : "Gary's Plumbing"} /> : (
          <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
            <div style={{ position: "absolute", left: 22, right: 22, top: 22, height: 100, background: "#eceef1", borderRadius: 50, border: `5px solid ${INK}`, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 34px", fontSize: 48, fontWeight: 700, color: INK, zIndex: 2 }}>
              <svg width="50" height="50" viewBox="0 0 52 52" style={{ marginRight: 22 }}><circle cx="22" cy="22" r="15" fill="none" stroke={INK} strokeWidth="6" /><line x1="33" y1="33" x2="47" y2="47" stroke={INK} strokeWidth="7" strokeLinecap="round" /></svg>
              plumber near me
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: ROW0, bottom: 0, overflow: "hidden" }}>
              <div style={{ transform: `translateY(${-scroll}px)` }}>
                {BIZ.map((b, i) => <Card key={b.name} b={b} id={`s${which}${i}`} flash={i === 0 && which === "list" && tapK > 0 ? 1 : 0} />)}
                <Dots />
                <Skeleton />
                <Card b={GARY} id={`g${which}`} hot={which === "scroll" && t > T.scrollB + 0.1} flash={which === "scroll" && tapK > 0 ? 1 : 0} />
                {which === "scroll" && <div style={{ height: 300, textAlign: "center", fontSize: 38, color: "#8a9097", fontWeight: 700, paddingTop: 36 }}>No more results</div>}
              </div>
            </div>
            {which === "list" && <Touch x={SCR.w - 180} y={ROW0 + CARD / 2} k={tapK} />}
            {which === "scroll" && <Touch x={SCR.w - 70} y={dragY} k={dragK} />}
            {which === "scroll" && <Touch x={SCR.w / 2} y={ROW0 + GARY_Y - scroll + CARD / 2} k={tapK} />}
          </div>
        )}
      </PhoneShell>
    </AbsoluteFill>
  );
}

// ── the review (shot 8): five stars tapped one by one, the text typed with the words, then Post
const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
function Keyboard({ pressed }: { pressed: string }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 330, background: "#d4d8de", padding: "20px 10px", boxSizing: "border-box", fontFamily: FONT }}>
      {KEYS.map((row, r) => (
        <div key={r} style={{ display: "flex", justifyContent: "center", gap: 9, marginBottom: 14, paddingLeft: r === 1 ? 20 : r === 2 ? 64 : 0 }}>
          {row.split("").map((k) => <div key={k} style={{ width: 66, height: 80, borderRadius: 15, background: pressed === k ? "#9aa4b0" : "#f1f3f6", border: "4px solid #aeb6c0", boxSizing: "border-box", fontSize: 32, fontWeight: 800, color: "#8a929c", textAlign: "center", lineHeight: "72px" }}>{k}</div>)}
        </div>
      ))}
      <div style={{ margin: "0 96px", height: 76, borderRadius: 15, background: "#f1f3f6", border: "4px solid #aeb6c0", boxSizing: "border-box" }} />
    </div>
  );
}
const STAR_X = (i: number) => 97 + i * 130; // the centre of star i in the screen
export function PhoneReview({ f }: { f: number }) {
  const t = f / FPS;
  const stars = STAR_TAPS.filter((s) => t >= s + 0.03).length;
  const typed = TYPE_TIMES.filter((s) => t >= s).length;
  const text = REVIEW.slice(0, typed);
  const last = text.length ? text[text.length - 1].toUpperCase() : "";
  const keyOn = TYPE_TIMES.some((s) => t >= s && t < s + 0.07) ? last : "";
  const starTap = STAR_TAPS.findIndex((s) => t >= s - 0.02 && t < s + 0.1);
  const posted = t >= POST_TAP + 0.05;
  const postTap = t >= POST_TAP - 0.02 && t < POST_TAP + 0.14;
  const typing = t >= TYPE_TIMES[0] - 0.05;
  return (
    <AbsoluteFill>
      <Backdrop file="sp/bg-living.jpg" dim={0.5} />
      <PhoneShell>
        <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: INK }}>
          <div style={{ padding: "24px 38px 0", fontSize: 32, fontWeight: 700, color: "#5b6168" }}>Review</div>
          <div style={{ padding: "2px 38px 0", fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>Gary's Plumbing</div>
          <div style={{ display: "flex", gap: 12, padding: "22px 38px 0" }}>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={118} fill={i < stars ? 1 : 0} id={`rv${i}`} />)}
          </div>
          <div style={{ margin: "26px 38px 0", height: 200, border: `6px solid ${posted ? "#9aa1a8" : typing ? BLUE : INK}`, borderRadius: 30, padding: "22px 30px", boxSizing: "border-box", fontSize: 76, fontWeight: 900, lineHeight: 1.1, background: "#fff" }}>
            {text.length === 0 && !typing ? <span style={{ fontSize: 42, fontWeight: 700, color: "#9aa1a8" }}>Share details of your experience</span> : <>{text}{!posted && <span style={{ display: "inline-block", width: 6, height: 74, background: BLUE, marginLeft: 6, verticalAlign: "-8px" }} />}</>}
          </div>
          <div style={{ position: "absolute", left: 38, right: 38, top: 586, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 240, height: 94, borderRadius: 47, background: posted ? "#34a853" : postTap ? "#1558b8" : BLUE, border: `6px solid ${INK}`, color: "#fff", fontSize: 50, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 34px", boxSizing: "border-box" }}>{posted ? "Posted" : "Post"}</div>
          </div>
          {starTap >= 0 && <Touch x={STAR_X(starTap)} y={212} k={1 - (t - STAR_TAPS[starTap]) / 0.14} />}
          {postTap && <Touch x={SCR.w - 38 - 130} y={586 + 47} k={1 - (t - POST_TAP) / 0.16} />}
          <Keyboard pressed={keyOn} />
        </div>
      </PhoneShell>
    </AbsoluteFill>
  );
}
