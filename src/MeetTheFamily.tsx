import { painted } from "./Painted";
import timings from "../public/meet-the-family/timings.json";
import edit from "../public/meet-the-family/edit.json";

// Season 1, episode 1 "Meet the Family" (docs/s1e01-meet-the-family.md)
export const { Episode: MeetTheFamily, frames: MEET_THE_FAMILY_FRAMES } = painted(timings, edit);
