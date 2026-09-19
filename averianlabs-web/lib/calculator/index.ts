/**
 * `lib/calculator/index.ts` — single import surface for the calculator module.
 *
 * Anywhere in the app that needs the calculator maths reaches in through
 * this barrel so refactors (renames, splits, additions) stay one-place.
 */

export * from "@/lib/calculator/reconstitution"
export * from "@/lib/calculator/syringe"
export * from "@/lib/calculator/dilution"
export * from "@/lib/calculator/titration"
export * from "@/lib/calculator/breakeven"
export * from "@/lib/calculator/saturation"
export * from "@/lib/calculator/stability"
export * from "@/lib/calculator/round"
export * from "@/lib/calculator/url-state"
export * from "@/lib/calculator/presets"
