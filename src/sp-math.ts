// Number helpers of the effects kit (src/sp-fx.tsx) and of the schedule (src/nv3-sched.ts): seeded hashes and noise, smoothsteps, springs. Pure functions;
// nothing here reads a clock or Math.random.
export const fract = (x: number) => x - Math.floor(x);
export const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** value noise in -1..1, smooth, closed form */
export function vnoise(x: number, seed = 0): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), o = seed * 17.3;
  return (hash(i + o) * (1 - u) + hash(i + 1 + o) * u) * 2 - 1;
}
/** three octaves of it, still in -1..1 */
export const fbm = (x: number, seed = 0) => (vnoise(x, seed) + 0.5 * vnoise(x * 2.13 + 7.1, seed + 1) + 0.25 * vnoise(x * 4.37 + 13.3, seed + 2)) / 1.75;
/** step response of a spring (damping ratio zeta < 1, natural frequency omega rad/s): 0 -> 1 with an overshoot that depends on zeta */
export function spring(t: number, zeta: number, omega: number): number {
  if (t <= 0) return 0;
  const k = Math.sqrt(1 - zeta * zeta), e = Math.exp(-zeta * omega * t);
  return 1 - e * (Math.cos(omega * k * t) + (zeta / k) * Math.sin(omega * k * t));
}
/** when the spring first reaches 1 (the landing) */
export const springLand = (zeta: number, omega: number) => (Math.PI - Math.acos(zeta)) / (omega * Math.sqrt(1 - zeta * zeta));
