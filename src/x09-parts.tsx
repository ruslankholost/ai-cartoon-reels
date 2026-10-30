import { BLUR_T, BOARD1_T, SLAM_T, boardOne, boardTax, line11Words, noteHeart, noteHire, noteMmf, noteUnder, FPS, type ShotId } from "./x09-sched";
import type { BoardState, NoteState } from "./x09-ui";

// The state of what is written on the board and in the notebook, by the clock of the voices (src/x09-ui.tsx draws it, src/x09-scenes.tsx places it).
const t = (f: number) => f / FPS;

/** the board's state in every shot that shows it: how much of each line is written, by the clock of the voices. The title while he says "Real habits of rich people" (10.35-11.45); line 1 in two goes ("1." on "One", "TAX EVASION" on "Tax evasion");
 * lines 2 and 3 while he says them (under the inserts of the washing machine and the handshake); lines 4-10 in a blur (BLUR_T to the slam), line 11 from the slam */
export function boardState(f: number): BoardState {
  const tt = t(f), wr = (t0: number, d: number) => Math.max(0, Math.min(1, (tt - t0) / d));
  const line1 = tt < BOARD1_T[1] ? 0.17 * boardOne(f) : 0.17 + 0.83 * boardTax(f);
  return {
    title: wr(10.35, 1.1),
    lines: [line1, wr(16.1, 0.7), wr(17.75, 0.6), ...Array.from({ length: 7 }, (_, i) => wr(BLUR_T + 0.07 * i, 0.14))],
    eleven: wr(SLAM_T, 0.5), lit: line11Words(f), blur: tt >= BLUR_T && tt < SLAM_T ? 1 : 0,
  };
}
/** the notebook's state: what is written when (shots 5 and 18) */
export function noteState(f: number): NoteState {
  return { mmf: [0, 1, 2].map((i) => noteMmf(i, f)), under: [0, 1].map((i) => noteUnder(i, f)), hire: noteHire(f), heart: noteHeart(f) };
}
