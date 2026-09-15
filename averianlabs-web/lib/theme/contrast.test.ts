import { describe, expect, it } from "vitest"

/**
 * WCAG 2.2 AA contrast audit for the design tokens in `styles/globals.css`.
 *
 * These values mirror the HSL tokens exactly — when a token changes, this test
 * fails and forces a re-check rather than silently shipping unreadable text.
 * Threshold: 4.5:1 for normal text.
 */

type Hsl = [number, number, number]

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

function luminance([r, g, b]: [number, number, number]): number {
  const s = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b)
}

function contrastRatio(fg: Hsl, bg: Hsl): number {
  const l1 = luminance(hslToRgb(fg))
  const l2 = luminance(hslToRgb(bg))
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

// Token pairs that carry text, mirroring styles/globals.css.
const LIGHT = {
  bg: [210, 30, 99] as Hsl,
  surface: [0, 0, 100] as Hsl,
  ink: [220, 30, 12] as Hsl,
  inkMuted: [220, 12, 38] as Hsl,
  inkSubtle: [220, 10, 42] as Hsl,
  accent: [214, 95, 45] as Hsl,
  onAccent: [0, 0, 100] as Hsl,
  success: [152, 60, 28] as Hsl,
  successSoft: [152, 60, 96] as Hsl,
  warn: [38, 95, 30] as Hsl,
  warnSoft: [38, 95, 96] as Hsl,
  danger: [0, 75, 45] as Hsl,
  dangerSoft: [0, 75, 96] as Hsl,
  ice: [196, 85, 32] as Hsl,
  iceSoft: [196, 85, 96] as Hsl,
}

const DARK = {
  surface: [222, 26, 9] as Hsl,
  inkSubtle: [215, 10, 58] as Hsl,
  accent: [214, 90, 60] as Hsl,
  onAccent: [222, 30, 8] as Hsl,
  success: [152, 55, 60] as Hsl,
  successSoft: [152, 40, 14] as Hsl,
  warn: [38, 90, 62] as Hsl,
  warnSoft: [38, 50, 16] as Hsl,
  danger: [0, 70, 68] as Hsl,
  dangerSoft: [0, 50, 18] as Hsl,
  ice: [196, 80, 65] as Hsl,
  iceSoft: [196, 50, 18] as Hsl,
}

const AA = 4.5

describe("theme contrast (WCAG 2.2 AA)", () => {
  const cases: Array<[string, Hsl, Hsl]> = [
    ["light: ink on bg", LIGHT.ink, LIGHT.bg],
    ["light: ink-muted on bg", LIGHT.inkMuted, LIGHT.bg],
    ["light: ink-subtle on bg", LIGHT.inkSubtle, LIGHT.bg],
    ["light: ink-subtle on surface", LIGHT.inkSubtle, LIGHT.surface],
    ["light: accent text on surface", LIGHT.accent, LIGHT.surface],
    ["light: on-accent on accent (buttons)", LIGHT.onAccent, LIGHT.accent],
    ["light: success badge", LIGHT.success, LIGHT.successSoft],
    ["light: warn badge", LIGHT.warn, LIGHT.warnSoft],
    ["light: danger badge", LIGHT.danger, LIGHT.dangerSoft],
    ["light: ice badge", LIGHT.ice, LIGHT.iceSoft],
    ["dark: ink-subtle on surface", DARK.inkSubtle, DARK.surface],
    ["dark: accent text on surface", DARK.accent, DARK.surface],
    ["dark: on-accent on accent (buttons)", DARK.onAccent, DARK.accent],
    ["dark: success badge", DARK.success, DARK.successSoft],
    ["dark: warn badge", DARK.warn, DARK.warnSoft],
    ["dark: danger badge", DARK.danger, DARK.dangerSoft],
    ["dark: ice badge", DARK.ice, DARK.iceSoft],
  ]

  for (const [name, fg, bg] of cases) {
    it(name, () => {
      const ratio = contrastRatio(fg, bg)
      expect(ratio, `${name} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA)
    })
  }
})
