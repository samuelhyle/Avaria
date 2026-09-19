/**
 * `lib/calculator/round.ts` — defensible rounding for the calculator.
 *
 * Floating-point error can drive a 0.1 mL draw to 0.09999999... mL. We
 * expose two rounding modes so callers can pick the one that matches the
 * physical instrument:
 *
 *   - `roundLiquid(n, places)` — bankers-rounding (a.k.a. round-half-to-even)
 *     to a fixed number of decimal places. Use for volumes and concentrations
 *     because the eye and the syringe tick-mark both expect familiar decimal
 *     endings.
 *
 *   - `roundMcg(n)` — round to integer microgram. Most bench scales can't
 *     resolve below 1 mcg of peptide mass; reporting 250.4 mcg implies false
 *     precision.
 *
 *   - `roundIu(n, ticks = 0.5)` — round to the nearest syringe tick (default
 *     half-IU, which matches 1 mL / 100 IU insulin syringes). Set
 *     `ticks = 0.2` for 0.5 mL / 50 IU syringes.
 *
 * Everything returns a Number; callers that need to display the original
 * precision downstream should snap to display precision at the render layer,
 * not here.
 */

/**
 * Round-half-to-even ("banker's") rounding to a fixed number of decimals.
 *
 * Avoids the systematic upward bias of `Math.round` and matches how lab
 * spreadsheets reconcile dilutions across many vials.
 *
 * Examples:
 *   roundLiquid(0.125, 2) === 0.12   // half-to-even
 *   roundLiquid(0.135, 2) === 0.14
 *   roundLiquid(-0.125, 2) === -0.12
 */
export function roundLiquid(n: number, decimals = 3): number {
  if (!Number.isFinite(n)) return n
  if (decimals < 0) throw new RangeError("decimals must be >= 0")
  const factor = 10 ** decimals
  // Standard bankers-rounding implementation (see IEEE 754 §4).
  const truncated = Math.trunc(n * factor)
  const remainder = n * factor - truncated
  let rounded = truncated
  if (Math.abs(remainder) > 0.5) {
    rounded += remainder > 0 ? 1 : -1
  } else if (Math.abs(remainder) === 0.5) {
    // round half to even
    if (rounded % 2 !== 0) rounded += remainder > 0 ? 1 : -1
  }
  return rounded / factor
}

/** Round to whole micrograms (1 mcg resolution). */
export function roundMcg(n: number): number {
  if (!Number.isFinite(n)) return n
  return Math.round(n)
}

/** Round to the nearest syringe-tick size. Defaults to 0.5 IU (1 mL / 100 IU). */
export function roundIu(n: number, tickSize = 0.5): number {
  if (!Number.isFinite(n)) return n
  if (tickSize <= 0) throw new RangeError("tickSize must be > 0")
  return Math.round(n / tickSize) * tickSize
}

/** Round to whole milligrams. */
export function roundMg(n: number): number {
  if (!Number.isFinite(n)) return n
  return Math.round(n)
}

/**
 * Trim a numeric string to N significant digits without forcing a particular
 * decimal length. Useful for UI strings like "0.075 mL" — we want 2 sig
 * figs of left-of-zero precision. Returns the input verbatim if it's not
 * finite, an integer, or n === 0.
 */
export function significant(n: number, digits = 3): number {
  if (!Number.isFinite(n) || n === 0) return n
  const sign = Math.sign(n)
  const abs = Math.abs(n)
  const order = Math.floor(Math.log10(abs))
  const factor = 10 ** (digits - 1 - order)
  return (sign * Math.round(abs * factor)) / factor
}
