import { painted } from "./Painted";
import timings from "../public/triple-a/timings.json";
import edit from "../public/triple-a/edit.json";

// Season 1, episode 1 "Triple-A", the ~45 s cut (docs/s1e01-triple-a.md, episodes/triple-a.jsonc)
export const { Episode: TripleA, frames: TRIPLE_A_FRAMES } = painted(timings, edit);
