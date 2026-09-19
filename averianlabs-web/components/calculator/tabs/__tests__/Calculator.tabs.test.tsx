import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { calculateReconstitution } from "./__test-utils__"
import { BreakevenTab } from "@/components/calculator/tabs/BreakevenTab"
import { CompareTab } from "@/components/calculator/tabs/CompareTab"
import { DilutionTab } from "@/components/calculator/tabs/DilutionTab"
import { NextIntlClientProvider } from "next-intl"
import { ReconstitutionTab } from "@/components/calculator/tabs/ReconstitutionTab"
import { TitrationTab } from "@/components/calculator/tabs/TitrationTab"
import type { CalculatorFormState } from "@/components/calculator/hooks/use-calculator-state"

const messages = {
  calculator: {
    inputs: "Inputs",
    outputs: "Outputs",
    results: "Results",
    peptideMass: "Peptide mass",
    bacteriostaticWater: "BAC water",
    desiredDose: "Dose",
    product: "Product",
    syringe: "Syringe",
    storage: "Storage",
    concentration: "Concentration",
    volumePerDose: "Volume per dose",
    iuOnSyringe: "IU",
    totalDoses: "Total doses",
    leftoverMcg: "Leftover",
    tabs: {
      reconstitution: "Reconstitution",
      titration: "Titration",
      dilution: "Dilution",
      breakeven: "Breakeven",
      compare: "Compare",
    },
    actions: {
      share: "Share",
      shareCopied: "Copied",
      save: "Save",
      saved: "Saved",
      reset: "Reset",
      print: "Print",
      exportCsv: "Export CSV",
      sendToAveria: "Ask Averia",
      openSaved: "Saved",
      viewHistory: "History",
      clearHistory: "Clear",
      deleteProtocol: "Delete",
    },
    presets: { title: "Presets", subtitle: "Common", empty: "Empty" },
    history: { title: "History", subtitle: "Recent", empty: "Empty", remove: "Remove" },
    titration: {
      title: "Titration",
      subtitle: "Ramp",
      startDose: "Start",
      endDose: "End",
      steps: "Steps",
      duration: "Duration",
      durationWeeks: "{count} w",
      stepLabel: "Step",
      totalConsumed: "Consumed",
      exceedsVial: "Need more",
    },
    dilution: {
      title: "Dilution",
      subtitle: "Chain",
      rawVolume: "Raw",
      minDraw: "Min",
      factor: "Factor",
      step1: "Step 1",
      step2: "Step 2",
      step2Detail: "Add {sourceMl} mL to {diluentMl} mL diluent",
      working: "Working",
      finalDraw: "Final",
    },
    breakeven: {
      title: "Breakeven",
      subtitle: "Compare",
      plan: "Plan",
      price: "Price",
      perMg: "Per mg",
      doses: "Doses",
      leftover: "Leftover",
      waste: "Wasted",
      pickCheapest: "Cheapest",
      pickLeastWaste: "Lowest waste",
      addPlan: "Add",
      removePlan: "Remove",
    },
    compare: {
      title: "Compare",
      subtitle: "Side by side",
      left: "Left",
      right: "Right",
      addProtocol: "Add",
    },
    share: { copyTooltip: "Copy", copied: "Copied", buildFromUrl: "Loaded" },
    disclaimer: { title: "Disclaimer", body: "Body", researchOnly: "Research" },
    aria: { resultSummary: "Result {doses}", resultLabel: "Result" },
    stability: {
      title: "Stability",
      subtitle: "Shelf life",
      shelfLife: "Shelf life",
      refrigerated: "Refrig",
      frozen: "Frozen",
      room: "Room",
    },
    saturation: {
      cautionTitle: "Caution",
      aboveTitle: "Above",
      ceiling: "Ceiling",
      ratio: "Ratio",
    },
    syringes: { title: "Syringes", subtitle: "Choose", "0_3": "0.3 mL", "0_5": "0.5 mL", "1_0": "1 mL" },
    validation: {
      nonPositive: "Must be > 0",
      concentrationTooHigh: "Too high",
      concentrationCaution: "Caution",
      drawTooSmall: "Too small",
      nan: "NaN",
    },
    unitsMcg: "mcg",
    unitsIu: "IU",
    unitsMl: "mL",
    noProductSelected: "None",
    reconstitution: {
      drawLabel: "Draw",
      withSyringe: "On {syringe}",
      vialYield: "Yields {count}",
    },
    studiesCalibrated: "ok",
    dosesCalculation: "calc",
    concentrationUnit: "mg/mL",
    concentrationMcgUnit: "mcg/mL",
    volumePerDoseUnit: "mL",
    leftoverMcgUnit: "mcg",
    researchOnly: "Research only",
  },
  common: {
    share: "Share",
    shareList: "Share",
    copied: "Copied",
    close: "Close",
  },
}

function wrap(node: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  )
}

describe("ReconstitutionTab", () => {
  it("renders the input panel with three CalculatorField inputs", () => {
    const set = vi.fn()
    const state: CalculatorFormState = {
      tab: "reconstitution",
      vialMg: 10,
      solventMl: 2,
      doseMcg: 250,
      syringe: { label: "1.0 mL", barrelMl: 1, ticks: 100, iuPerMl: 100, majorTicks: 10 },
      productSlug: "bpc-157",
      storage: "refrigerated_2to8",
      startMcg: 2500,
      endMcg: 15000,
      steps: 6,
      weekCount: 12,
      dosesPerWeek: 5,
      minPracticalDrawMl: 0.05,
    }
    const derived = calculateReconstitution(state)
    const html = wrap(<ReconstitutionTab state={state} set={set} derived={derived} />)
    expect(html).toContain("Peptide mass")
    expect(html).toContain("BAC water")
    expect(html).toContain("Dose")
  })
})

describe("TitrationTab", () => {
  it("renders the ladder summary", () => {
    const set = vi.fn()
    const state: CalculatorFormState = {
      tab: "titration",
      vialMg: 30,
      solventMl: 2,
      doseMcg: 2500,
      syringe: { label: "1.0 mL", barrelMl: 1, ticks: 100, iuPerMl: 100, majorTicks: 10 },
      productSlug: "retatrutide",
      storage: "refrigerated_2to8",
      startMcg: 2500,
      endMcg: 15000,
      steps: 6,
      weekCount: 12,
      dosesPerWeek: 1,
      minPracticalDrawMl: 0.05,
    }
    const derived = calculateReconstitution(state)
    const html = wrap(<TitrationTab state={state} set={set} derived={derived} />)
    expect(html).toContain("Titration")
    expect(html).toContain("Ramp")
  })
})

describe("DilutionTab", () => {
  it("renders the dilution chain or 'no dilution' message", () => {
    const set = vi.fn()
    const state: CalculatorFormState = {
      tab: "dilution",
      vialMg: 10,
      solventMl: 3,
      doseMcg: 500,
      syringe: { label: "1.0 mL", barrelMl: 1, ticks: 100, iuPerMl: 100, majorTicks: 10 },
      productSlug: "bpc-157",
      storage: "refrigerated_2to8",
      startMcg: 250,
      endMcg: 15000,
      steps: 6,
      weekCount: 12,
      dosesPerWeek: 5,
      minPracticalDrawMl: 0.05,
    }
    const derived = calculateReconstitution(state)
    const html = wrap(<DilutionTab state={state} set={set} derived={derived} />)
    expect(html).toContain("Dilution")
  })
})

describe("BreakevenTab", () => {
  it("renders the table headings", () => {
    const html = wrap(<BreakevenTab vialMg={10} doseMcg={250} />)
    expect(html).toContain("Breakeven")
    expect(html).toContain("Per mg")
  })
})

describe("CompareTab", () => {
  it("renders both columns", () => {
    const html = wrap(<CompareTab base={{ vialMg: 10, solventMl: 2, doseMcg: 250 }} />)
    expect(html).toContain("Left")
    expect(html).toContain("Right")
    expect(html).toContain("Compare")
  })
})
