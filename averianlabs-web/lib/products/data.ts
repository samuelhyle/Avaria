import type { Product } from "./types"
export type { Product } from "./types"

const labs = ["Eurofins Biolab", "Biolab GmbH", "Synlab Analytics"] as const

function batchCode(prefix: string, month: string, year = "2026", seq = "A") {
  return `${prefix}-${year}-${month}-${seq}`
}

export const products: Product[] = [
  {
    slug: "bac-water",
    category: "supplies",
    hue: 198,
    storageTemp: "Room temperature, away from light",
    vials: [{ mg: 10, sku: "BACW-10", priceCents: 995, stockQty: 240, lowStockThreshold: 30 }],
    latestBatch: {
      code: batchCode("BAC", "08"),
      manufacturedAt: "2026-08-04",
      expiresAt: "2028-08-04",
      hplcPurity: 0,
      endotoxinEUPerMg: 0.2,
      msConfirmed: true,
      lab: labs[2],
    },
    defaultTranslation: {
      name: "BAC water",
      tagline: "Bacteriostatic water for reconstitution — 0.9% benzyl alcohol",
      description:
        "Sterile bacteriostatic water (10 mL) for laboratory reconstitution of research peptides.",
    },
    translations: {
      fi: {
        name: "BAC-vesi",
        tagline: "Bakteriostaattinen vesi liuotukseen — 0,9 % bentsyylialkoholi",
        description:
          "Steriili bakteriostaattinen vesi (10 mL) tutkimuspeptidien liuottamiseen laboratoriossa.",
      },
      de: {
        name: "BAC-Wasser",
        tagline: "Bakteriostatisches Wasser zur Rekonstitution — 0,9 % Benzylalkohol",
        description:
          "Steriles bakteriostatisches Wasser (10 mL) zur Rekonstitution von Forschungspeptiden.",
      },
      sv: {
        name: "BAC-vatten",
        tagline: "Bakteriostatiskt vatten för rekonstitution — 0,9 % bensylalkohol",
        description:
          "Sterilt bakteriostatiskt vatten (10 mL) för rekonstitution av forskningspeptider.",
      },
      nl: {
        name: "BAC-water",
        tagline: "Bacteriostatisch water voor reconstitutie — 0,9% benzylalcohol",
        description:
          "Steriel bacteriostatisch water (10 mL) voor reconstitutie van onderzoekspeptiden.",
      },
    },
  },

  {
    slug: "retatrutide",
    category: "metabolic",
    hue: 232,
    casNumber: "2381089-83-2",
    molecularFormula: "C₂₂₃H₃₄₂N₄₆O₆₈",
    molecularWeight: 4731.6,
    sequence: "Triple agonist (GLP-1 / GIP / glucagon R)",
    storageTemp: "2–8 °C",
    purityPercent: 98.7,
    vials: [
      { mg: 20, sku: "RETA-20", priceCents: 9900, stockQty: 28, lowStockThreshold: 8 },
      {
        mg: 30,
        sku: "RETA-30",
        priceCents: 12900,
        compareAtCents: 13900,
        stockQty: 11,
        lowStockThreshold: 6,
      },
    ],
    latestBatch: {
      code: batchCode("RETA", "07"),
      manufacturedAt: "2026-07-18",
      expiresAt: "2027-07-18",
      hplcPurity: 98.9,
      endotoxinEUPerMg: 2.4,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "Retatrutide",
      tagline: "Triple-agonist (GLP-1 / GIP / glucagon) — metabolic research",
      description:
        "A synthetic triple-receptor agonist peptide studied in metabolic regulation research.",
    },
    translations: {
      fi: {
        name: "Retatrutidi",
        tagline: "Tripla-agonisti (GLP-1 / GIP / glukagoni) — metabolinen tutkimus",
        description: "Synteettinen tripla-reseptoriagonistipeptidi metabolian tutkimukseen.",
      },
      de: {
        name: "Retatrutid",
        tagline: "Trippelagonist (GLP-1 / GIP / Glucagon) — Stoffwechselforschung",
        description: "Synthetisches Trippelrezeptor-Agonist-Peptid für Stoffwechselforschung.",
      },
      sv: {
        name: "Retatrutid",
        tagline: "Trippelagonist (GLP-1 / GIP / glukagon) — metabol forskning",
        description: "Syntetisk trippelreceptoragonistpeptid för metabol forskning.",
      },
      nl: {
        name: "Retatrutide",
        tagline: "Triple-agonist (GLP-1 / GIP / glucagon) — metabolisch onderzoek",
        description: "Synthetische triplereceptoragonistpeptide voor metabolisch onderzoek.",
      },
    },
  },

  {
    slug: "ghk-cu",
    category: "cosmetic",
    hue: 188,
    casNumber: "89030-95-5",
    molecularFormula: "C₁₄H₂₂CuN₆O₄",
    molecularWeight: 401.9,
    sequence: "Gly-His-Lys • Cu²⁺",
    storageTemp: "2–8 °C",
    purityPercent: 99.5,
    vials: [
      { mg: 50, sku: "GHKCU-50", priceCents: 3990, stockQty: 142, lowStockThreshold: 20 },
      {
        mg: 100,
        sku: "GHKCU-100",
        priceCents: 6990,
        compareAtCents: 7900,
        stockQty: 58,
        lowStockThreshold: 10,
      },
    ],
    latestBatch: {
      code: batchCode("GHK", "08"),
      manufacturedAt: "2026-08-02",
      expiresAt: "2027-08-02",
      hplcPurity: 99.6,
      endotoxinEUPerMg: 3.1,
      msConfirmed: true,
      lab: labs[1],
    },
    defaultTranslation: {
      name: "GHK-Cu",
      tagline: "Copper-binding tripeptide — cosmetic & recovery research",
      description:
        "A copper-binding tripeptide (Gly-His-Lys) studied in dermal and tissue-recovery research.",
    },
    translations: {
      fi: {
        name: "GHK-Cu",
        tagline: "Kuparia sitova tripeptidi — kosmeettinen ja toipumistutkimus",
        description:
          "Kuparia sitova tripeptidi (Gly-His-Lys), tutkittu ihon ja kudosten palautumisen malleissa.",
      },
      de: {
        name: "GHK-Cu",
        tagline: "Kupferbindendes Tripeptid — kosmetische & Erholungsforschung",
        description:
          "Kupferbindendes Tripeptid (Gly-His-Lys) für Haut- und Gewebeerholungsforschung.",
      },
      sv: {
        name: "GHK-Cu",
        tagline: "Kopparbindande tripeptid — kosmetisk & återhämtningsforskning",
        description:
          "Kopparbindande tripeptid (Gly-His-Lys) för hud- och vävnadsåterhämtningsforskning.",
      },
      nl: {
        name: "GHK-Cu",
        tagline: "Koperbindend tripeptide — cosmetisch & herstelonderzoek",
        description: "Koperbindend tripeptide (Gly-His-Lys) voor huid- en weefselherstelonderzoek.",
      },
    },
  },

  {
    slug: "mots-c",
    category: "longevity",
    hue: 260,
    casNumber: "1627580-64-6",
    molecularFormula: "C₁₀₁H₁₅₂N₂₈O₃₂S₂",
    molecularWeight: 2174.6,
    sequence: "MRWQEMGYIFYPRKLR",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 99.1,
    vials: [{ mg: 10, sku: "MOTSC-10", priceCents: 4200, stockQty: 47, lowStockThreshold: 10 }],
    latestBatch: {
      code: batchCode("MOTS", "07"),
      manufacturedAt: "2026-07-22",
      expiresAt: "2028-07-22",
      hplcPurity: 99.3,
      endotoxinEUPerMg: 2.0,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "MOTS-c",
      tagline: "Mitochondrial-derived peptide — longevity & metabolic research",
      description:
        "A 16-amino-acid mitochondrial-derived peptide studied in cellular metabolism and longevity models.",
    },
    translations: {
      fi: {
        name: "MOTS-c",
        tagline: "Mitokondrioperäinen peptidi — pitkäikäisyys ja metabolia",
        description:
          "16-aminohapon mitokondrioperäinen peptidi, tutkittu soluaineenvaihdunnan ja ikääntymisen malleissa.",
      },
      de: {
        name: "MOTS-c",
        tagline: "Mitochondriales Peptid — Langlebigkeits- & Stoffwechselforschung",
        description:
          "16-Aminosäure-Peptid aus Mitochondrien, erforscht in Stoffwechsel- und Alterungsmodellen.",
      },
      sv: {
        name: "MOTS-c",
        tagline: "Mitokondriellt peptid — livslängd & metabolism",
        description: "16-aminosyramitokondriellt peptid för metabolism- och åldringsforskning.",
      },
      nl: {
        name: "MOTS-c",
        tagline: "Mitochondriaal peptide — levensduur & metabolisme",
        description:
          "16-aminozuur mitochondriaal peptide voor metabolisme- en verouderingsonderzoek.",
      },
    },
  },

  {
    slug: "melanotan-ii",
    category: "cosmetic",
    hue: 332,
    casNumber: "121062-08-6",
    molecularFormula: "C₅₀H₆₉N₁₅O₉",
    molecularWeight: 1024.2,
    sequence: "Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-NH₂",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 99.0,
    vials: [{ mg: 10, sku: "MT2-10", priceCents: 1000, stockQty: 312, lowStockThreshold: 40 }],
    latestBatch: {
      code: batchCode("MT2", "08"),
      manufacturedAt: "2026-08-08",
      expiresAt: "2028-02-08",
      hplcPurity: 99.2,
      endotoxinEUPerMg: 2.6,
      msConfirmed: true,
      lab: labs[2],
    },
    defaultTranslation: {
      name: "Melanotan II",
      tagline: "Synthetic melanocortin analog — pigmentation research",
      description:
        "A synthetic cyclic heptapeptide analog of α-MSH studied in melanocortin receptor research.",
    },
    translations: {
      fi: {
        name: "Melanotan II",
        tagline: "Synteettinen melanokortiinianalogi — pigmentaatiotutkimus",
        description:
          "Synteettinen syklinen heptapeptidi-α-MSH-analogi, tutkittu melanokortiinireseptorimalleissa.",
      },
      de: {
        name: "Melanotan II",
        tagline: "Synthetisches Melanocortin-Analogon — Pigmentierungsforschung",
        description:
          "Synthetisches zyklisches Heptapeptid-α-MSH-Analogon für Melanocortin-Rezeptorforschung.",
      },
      sv: {
        name: "Melanotan II",
        tagline: "Syntetisk melanokortinanalog — pigmenteringsforskning",
        description:
          "Syntetisk cyklisk heptapeptid-α-MSH-analog för melanokortinreceptorforskning.",
      },
      nl: {
        name: "Melanotan II",
        tagline: "Synthetisch melanocortine-analoog — pigmentatieonderzoek",
        description:
          "Synthetisch cyclisch heptapeptide-α-MSH-analoog voor melanocortinereceptoronderzoek.",
      },
    },
  },

  {
    slug: "nad-plus",
    category: "longevity",
    hue: 196,
    casNumber: "53-84-9",
    molecularFormula: "C₂₁H₂₇N₇O₁₄P₂",
    molecularWeight: 663.4,
    sequence: "Nicotinamide adenine dinucleotide (oxidised)",
    storageTemp: "−20 °C, desiccated, dark",
    purityPercent: 99.8,
    vials: [{ mg: 1000, sku: "NAD-1000", priceCents: 9000, stockQty: 36, lowStockThreshold: 8 }],
    latestBatch: {
      code: batchCode("NAD", "07"),
      manufacturedAt: "2026-07-30",
      expiresAt: "2027-07-30",
      hplcPurity: 99.9,
      endotoxinEUPerMg: 0.8,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "NAD+",
      tagline: "Nicotinamide adenine dinucleotide — cellular energy research",
      description:
        "Oxidised nicotinamide adenine dinucleotide studied in cellular energetics and sirtuin-pathway research.",
    },
    translations: {
      fi: {
        name: "NAD+",
        tagline: "Nikotiiniamidiadeniinidinukleotidi — solujen energiatutkimus",
        description:
          "Oksidoitu NAD+, tutkittu solujen energiantuotannon ja sirtuiinireittien malleissa.",
      },
      de: {
        name: "NAD+",
        tagline: "Nicotinamidadenindinukleotid — zelluläre Energieforschung",
        description:
          "Oxidiertes NAD für Forschung zu zellulärer Energetik und Sirtuin-Signalwegen.",
      },
      sv: {
        name: "NAD+",
        tagline: "Nikotinamidadenindinukleotid — cellulär energiforskning",
        description: "Oxiderat NAD för forskning om cellulär energetik och sirtuinsignalering.",
      },
      nl: {
        name: "NAD+",
        tagline: "Nicotinamide-adenine-dinucleotide — cellulair energieonderzoek",
        description: "Geoxideerd NAD voor onderzoek naar cellulaire energie en sirtuine-routes.",
      },
    },
  },

  {
    slug: "bpc-157",
    category: "recovery",
    hue: 214,
    casNumber: "137525-50-9",
    molecularFormula: "C₆₂H₉₈N₁₆O₂₂",
    molecularWeight: 1419.5,
    sequence: "GEPPPGKPADDAGLV",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 99.2,
    vials: [
      { mg: 5, sku: "BPC157-5", priceCents: 3990, stockQty: 124, lowStockThreshold: 15 },
      { mg: 10, sku: "BPC157-10", priceCents: 6900, stockQty: 73, lowStockThreshold: 12 },
    ],
    latestBatch: {
      code: batchCode("BPC", "07"),
      manufacturedAt: "2026-07-12",
      expiresAt: "2028-07-12",
      hplcPurity: 99.4,
      endotoxinEUPerMg: 2.1,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "BPC-157",
      tagline: "Body Protection Compound — recovery & tissue research",
      description:
        "A synthetic 15-amino-acid fragment studied in tissue-recovery and gut-mucosa research models.",
    },
    translations: {
      fi: {
        name: "BPC-157",
        tagline: "Body Protection Compound — toipumis- ja kudostutkimus",
        description:
          "Synteettinen 15-aminohapon fragmentti, tutkittu kudosten ja suolen limakalvon tutkimusmalleissa.",
      },
      de: {
        name: "BPC-157",
        tagline: "Body Protection Compound — Erholungs- & Gewebeforschung",
        description: "Synthetisches 15-Aminosäure-Fragment für Gewebe- und Schleimhautforschung.",
      },
      sv: {
        name: "BPC-157",
        tagline: "Body Protection Compound — återhämtning & vävnadsforskning",
        description:
          "Syntetiskt 15-aminosyrafragment för vävnadsåterhämtnings- och slemhinneforskning.",
      },
      nl: {
        name: "BPC-157",
        tagline: "Body Protection Compound — herstel- en weefselonderzoek",
        description:
          "Synthetisch 15-aminozuurfragment voor weefselherstel- en slijmvliesonderzoek.",
      },
    },
  },

  {
    slug: "melanotan-i",
    category: "cosmetic",
    hue: 340,
    casNumber: "75921-69-6",
    molecularFormula: "C₇₈H₁₁₁N₂₁O₁₉",
    molecularWeight: 1646.9,
    sequence: "Ac-Ser-Tyr-Ser-Nle-Glu-His-D-Phe-Arg-Trp-Gly-Lys-Pro-Val-NH₂",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 98.9,
    vials: [{ mg: 10, sku: "MT1-10", priceCents: 3900, stockQty: 86, lowStockThreshold: 12 }],
    latestBatch: {
      code: batchCode("MT1", "07"),
      manufacturedAt: "2026-07-25",
      expiresAt: "2028-01-25",
      hplcPurity: 99.1,
      endotoxinEUPerMg: 2.3,
      msConfirmed: true,
      lab: labs[1],
    },
    defaultTranslation: {
      name: "Melanotan I",
      tagline: "Afamelanotide — melanocortin-1 receptor research",
      description:
        "A synthetic 13-amino-acid α-MSH analog studied in MC1R signalling and pigmentation research.",
    },
    translations: {
      fi: {
        name: "Melanotan I",
        tagline: "Afamelanotidi — MC1R-reseptoritutkimus",
        description: "Synteettinen 13-aminohapon α-MSH-analogi, tutkittu MC1R-signaloinnissa.",
      },
      de: {
        name: "Melanotan I",
        tagline: "Afamelanotid — MC1R-Rezeptorforschung",
        description: "Synthetisches 13-Aminosäure-α-MSH-Analogon für MC1R-Signalforschung.",
      },
      sv: {
        name: "Melanotan I",
        tagline: "Afamelanotid — MC1R-receptorforskning",
        description: "Syntetisk 13-aminosyra-α-MSH-analog för MC1R-signaleringsforskning.",
      },
      nl: {
        name: "Melanotan I",
        tagline: "Afamelanotide — MC1R-receptoronderzoek",
        description: "Synthetisch 13-aminozuur-α-MSH-analoog voor MC1R-signaleringsonderzoek.",
      },
    },
  },

  {
    slug: "klow",
    category: "blend",
    hue: 280,
    storageTemp: "−20 °C, desiccated",
    vials: [{ mg: 80, sku: "KLOW-80", priceCents: 13000, stockQty: 18, lowStockThreshold: 6 }],
    latestBatch: {
      code: batchCode("KLOW", "08"),
      manufacturedAt: "2026-08-12",
      expiresAt: "2027-08-12",
      hplcPurity: 99.0,
      endotoxinEUPerMg: 2.7,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "KLOW blend",
      tagline: "KPV + BPC-157 + GHK-Cu — 80 mg multi-compound research blend",
      description:
        "A pre-formulated blend of KPV, BPC-157, and GHK-Cu researched together in gut-immune-tissue models.",
    },
    translations: {
      fi: {
        name: "KLOW-seos",
        tagline: "KPV + BPC-157 + GHK-Cu — 80 mg moniyhdisteen tutkimusseos",
        description:
          "Esiformuloitu KPV:n, BPC-157:n ja GHK-Cu:n seos suoliston ja kudosten tutkimusmalleihin.",
      },
      de: {
        name: "KLOW-Mischung",
        tagline: "KPV + BPC-157 + GHK-Cu — 80 mg Mehrkomponenten-Forschungsmischung",
        description: "Vormischung aus KPV, BPC-157 und GHK-Cu für Darm- und Gewebeforschung.",
      },
      sv: {
        name: "KLOW-blandning",
        tagline: "KPV + BPC-157 + GHK-Cu — 80 mg flerkomponentforskning",
        description:
          "Förformulerad blandning av KPV, BPC-157 och GHK-Cu för tarm- och vävnadsforskning.",
      },
      nl: {
        name: "KLOW-mengsel",
        tagline: "KPV + BPC-157 + GHK-Cu — 80 mg multicomponent onderzoeksmengsel",
        description:
          "Voorgeformuleerd mengsel van KPV, BPC-157 en GHK-Cu voor darm- en weefselonderzoek.",
      },
    },
  },

  {
    slug: "bpc-tb-blend",
    category: "blend",
    hue: 210,
    storageTemp: "−20 °C, desiccated",
    vials: [{ mg: 10, sku: "BPC-TB-10", priceCents: 6000, stockQty: 64, lowStockThreshold: 10 }],
    latestBatch: {
      code: batchCode("BPCTB", "07"),
      manufacturedAt: "2026-07-28",
      expiresAt: "2028-07-28",
      hplcPurity: 99.2,
      endotoxinEUPerMg: 2.2,
      msConfirmed: true,
      lab: labs[1],
    },
    defaultTranslation: {
      name: "BPC-157 + TB-500 blend",
      tagline: "Pre-mixed BPC-157 + Thymosin β4 fragment — tissue-recovery research",
      description:
        "A blended vial of BPC-157 and the TB-500 fragment of Thymosin β4 for combined-recovery research.",
    },
    translations: {
      fi: {
        name: "BPC-157 + TB-500 -seos",
        tagline: "Esisekoitus BPC-157 + tymosiini β4 -fragmentti — kudosten palautumistutkimus",
        description:
          "BPC-157:n ja tymosiini β4:n TB-500-fragmentin esisekoitus yhdistettyyn palautumistutkimukseen.",
      },
      de: {
        name: "BPC-157 + TB-500 Mischung",
        tagline: "Vorgemischtes BPC-157 + Thymosin-β4-Fragment — Gewebeerholungsforschung",
        description:
          "Vorgemischtes Vial aus BPC-157 und TB-500-Fragment für kombinierte Erholungsforschung.",
      },
      sv: {
        name: "BPC-157 + TB-500 blandning",
        tagline: "Förblandad BPC-157 + tymosin β4-fragment — vävnadsåterhämtning",
        description:
          "Förblandad injektionsflaska med BPC-157 och TB-500-fragment för kombinerad återhämtningsforskning.",
      },
      nl: {
        name: "BPC-157 + TB-500 mengsel",
        tagline: "Voorgemengd BPC-157 + Thymosine β4-fragment — weefselherstelonderzoek",
        description:
          "Voorgemengde flacon BPC-157 en TB-500-fragment voor gecombineerd herstelonderzoek.",
      },
    },
  },

  {
    slug: "selank",
    category: "cognitive",
    hue: 250,
    casNumber: "129954-34-3",
    molecularFormula: "C₃₃H₅₇N₁₁O₁₂",
    molecularWeight: 787.9,
    sequence: "Thr-Lys-Pro-Arg-Pro-Gly-Pro",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 99.3,
    vials: [
      { mg: 5, sku: "SELK-5", priceCents: 2200, stockQty: 132, lowStockThreshold: 18 },
      { mg: 10, sku: "SELK-10", priceCents: 3900, stockQty: 51, lowStockThreshold: 10 },
    ],
    latestBatch: {
      code: batchCode("SELK", "08"),
      manufacturedAt: "2026-08-05",
      expiresAt: "2028-02-05",
      hplcPurity: 99.5,
      endotoxinEUPerMg: 2.4,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "Selank",
      tagline: "Synthetic tuftsin analog — cognitive & anxiolytic research",
      description:
        "A synthetic heptapeptide analog of tuftsin studied in serotonin and BDNF pathway research.",
    },
    translations: {
      fi: {
        name: "Selank",
        tagline: "Synteettinen tuftsiinianalogi — kognitiivinen ja ahdistuneisuustutkimus",
        description:
          "Synteettinen heptapeptidi-tuftsiinianalogi, tutkittu serotoniini- ja BDNF-reittimalleissa.",
      },
      de: {
        name: "Selank",
        tagline: "Synthetisches Tuftsin-Analogon — kognitive & anxiolytische Forschung",
        description:
          "Synthetisches Heptapeptid-Tuftsin-Analogon für Serotonin- und BDNF-Signalwegforschung.",
      },
      sv: {
        name: "Selank",
        tagline: "Syntetisk tuftsinanalog — kognitiv & ångestforskning",
        description:
          "Syntetisk heptapeptid-tuftsinanalog för serotonin- och BDNF-signaleringsforskning.",
      },
      nl: {
        name: "Selank",
        tagline: "Synthetisch tuftsine-analoog — cognitief en anxiolytisch onderzoek",
        description:
          "Synthetisch heptapeptide-tuftsine-analoog voor serotonine- en BDNF-routeonderzoek.",
      },
    },
  },

  {
    slug: "semax",
    category: "cognitive",
    hue: 268,
    casNumber: "80714-61-0",
    molecularFormula: "C₃₇H₅₁N₉O₁₀S",
    molecularWeight: 813.9,
    sequence: "Met-Glu-His-Phe-Pro-Gly-Pro",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 99.1,
    vials: [
      { mg: 5, sku: "SEMX-5", priceCents: 2200, stockQty: 58, lowStockThreshold: 10 },
      {
        mg: 10,
        sku: "SEMX-10",
        priceCents: 3900,
        compareAtCents: 4400,
        stockQty: 22,
        lowStockThreshold: 8,
      },
    ],
    latestBatch: {
      code: batchCode("SEMX", "07"),
      manufacturedAt: "2026-07-30",
      expiresAt: "2027-09-30",
      hplcPurity: 99.3,
      endotoxinEUPerMg: 2.2,
      msConfirmed: true,
      lab: labs[1],
    },
    defaultTranslation: {
      name: "Semax",
      tagline: "ACTH 4-10 fragment — neuroprotection & cognition research",
      description:
        "A synthetic melanocortin derivative studied in neuroprotection and BDNF-expression research.",
    },
    translations: {
      fi: {
        name: "Semax",
        tagline: "ACTH 4-10 -fragmentti — neuroprotektio- ja kognitiotutkimus",
        description:
          "Synteettinen melanokortiinijohdannainen, tutkittu neuroprotektio- ja BDNF-ilmentymismalleissa.",
      },
      de: {
        name: "Semax",
        tagline: "ACTH 4-10 Fragment — Neuroprotektion & Kognitionsforschung",
        description:
          "Synthetisches Melanocortin-Derivat für Neuroprotektion und BDNF-Expressionsforschung.",
      },
      sv: {
        name: "Semax",
        tagline: "ACTH 4-10-fragment — neuroprotektion & kognitionsforskning",
        description:
          "Syntetiskt melanokortinderivat för neuroprotektions- och BDNF-uttrycksforskning.",
      },
      nl: {
        name: "Semax",
        tagline: "ACTH 4-10 fragment — neuroprotectie en cognitieonderzoek",
        description:
          "Synthetisch melanocortine-derivaat voor neuroprotectie- en BDNF-expressieonderzoek.",
      },
    },
  },

  {
    slug: "cjc-1295",
    category: "metabolic",
    hue: 220,
    casNumber: "863288-34-0",
    molecularFormula: "C₁₅₂H₂₅₂N₄₄O₄₃",
    molecularWeight: 3367.8,
    sequence:
      "Tyr-Glu-Ala-Ile-Asp-Val-Ile-Thr-Lys-Ala-Ser-Gln-Lys-Glu-Phe-Ile-Ala-Trp-Leu-Glu-Asp-Gly-Glu-Lys (no DAC)",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 98.8,
    vials: [{ mg: 1, sku: "CJC-1", priceCents: 5990, stockQty: 41, lowStockThreshold: 10 }],
    latestBatch: {
      code: batchCode("CJC", "08"),
      manufacturedAt: "2026-08-01",
      expiresAt: "2028-02-01",
      hplcPurity: 99.0,
      endotoxinEUPerMg: 2.5,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "CJC-1295",
      tagline: "Modified GHRH analog (no DAC) — growth-hormone research",
      description:
        "A 30-amino-acid synthetic GHRH analog without the drug-affinity complex, studied in pulsatile GH research.",
    },
    translations: {
      fi: {
        name: "CJC-1295",
        tagline: "Muokattu GHRH-analogi (ei DAC:ia) — kasvuhormonitutkimus",
        description:
          "30-aminohapon synteettinen GHRH-analogi ilman DAC-kompleksia, tutkittu pulssittaisen GH:n malleissa.",
      },
      de: {
        name: "CJC-1295",
        tagline: "Modifiziertes GHRH-Analogon (ohne DAC) — Wachstumshormonforschung",
        description: "30-Aminosäure-GHRH-Analogon ohne DAC, erforscht in pulsatiler GH-Forschung.",
      },
      sv: {
        name: "CJC-1295",
        tagline: "Modifierad GHRH-analog (utan DAC) — tillväxthormonforskning",
        description: "30-aminosyramodifierad GHRH-analog utan DAC för pulserande GH-forskning.",
      },
      nl: {
        name: "CJC-1295",
        tagline: "Gemodificeerd GHRH-analoog (zonder DAC) — groeihormoononderzoek",
        description:
          "30-aminozuur synthetisch GHRH-analoog zonder DAC voor pulserend GH-onderzoek.",
      },
    },
  },

  {
    slug: "aod-9604",
    category: "metabolic",
    hue: 195,
    casNumber: "386264-39-7",
    molecularFormula: "Modified hGH(176-191)",
    molecularWeight: 1815.1,
    sequence: "hGH fragment 176-191, AOD-9604 analog",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 98.6,
    vials: [
      { mg: 5, sku: "AOD-5", priceCents: 0, stockQty: 0, lowStockThreshold: 0, contactOnly: true },
    ],
    latestBatch: {
      code: batchCode("AOD", "Q3"),
      manufacturedAt: "2026-07-15",
      expiresAt: "2028-07-15",
      hplcPurity: 98.8,
      endotoxinEUPerMg: 2.0,
      msConfirmed: true,
      lab: labs[1],
    },
    defaultTranslation: {
      name: "AOD-9604",
      tagline: "Modified hGH fragment 176-191 — metabolic research (contact for pricing)",
      description:
        "A modified fragment of human growth hormone studied in lipid-metabolism research. Contact for current batch availability.",
    },
    translations: {
      fi: {
        name: "AOD-9604",
        tagline: "Muokattu hGH-fragmentti 176-191 — metaboliatutkimus (kysy hinta)",
        description:
          "Muokattu ihmisen kasvuhormonin fragmentti, tutkittu lipidien metabolian malleissa. Kysy saatavuus.",
      },
      de: {
        name: "AOD-9604",
        tagline: "Modifiziertes hGH-Fragment 176-191 — Stoffwechselforschung (Preis auf Anfrage)",
        description:
          "Modifiziertes Fragment des menschlichen Wachstumshormons für Lipidstoffwechselforschung.",
      },
      sv: {
        name: "AOD-9604",
        tagline: "Modifierad hGH-fragment 176-191 — metabolismforskning (kontakta för pris)",
        description: "Modifierad fragment av humant tillväxthormon för lipidmetabolismforskning.",
      },
      nl: {
        name: "AOD-9604",
        tagline: "Gemodificeerd hGH-fragment 176-191 — metabolisch onderzoek (prijs op aanvraag)",
        description:
          "Gemodificeerd fragment van humaan groeihormoon voor lipidenmetabolismeonderzoek.",
      },
    },
  },

  {
    slug: "hgh-frag-176-191",
    category: "metabolic",
    hue: 200,
    casNumber: "66004-57-3",
    molecularFormula: "C₇₈H₁₂₃N₂₃O₂₃S₂",
    molecularWeight: 1815.1,
    sequence: "hGH(176-191)",
    storageTemp: "−20 °C, desiccated",
    purityPercent: 98.9,
    vials: [{ mg: 5, sku: "HGHFR-5", priceCents: 4500, stockQty: 72, lowStockThreshold: 12 }],
    latestBatch: {
      code: batchCode("HGHFR", "08"),
      manufacturedAt: "2026-08-10",
      expiresAt: "2028-02-10",
      hplcPurity: 99.1,
      endotoxinEUPerMg: 2.3,
      msConfirmed: true,
      lab: labs[0],
    },
    defaultTranslation: {
      name: "HGH Frag 176-191",
      tagline: "Native hGH lipolytic fragment — metabolic research",
      description:
        "The native 16-residue C-terminal fragment of human growth hormone, studied in lipolysis research.",
    },
    translations: {
      fi: {
        name: "HGH Frag 176-191",
        tagline: "Natiivi hGH:n lipolyyttinen fragmentti — metaboliatutkimus",
        description:
          "Ihmisen kasvuhormonin natiivi 16-jäännöksen C-terminaalinen fragmentti, tutkittu lipolyysimalleissa.",
      },
      de: {
        name: "HGH Frag 176-191",
        tagline: "Natives lipolytisches hGH-Fragment — Stoffwechselforschung",
        description:
          "Natives 16-Rest-C-terminales Fragment des menschlichen Wachstumshormons für Lipolyseforschung.",
      },
      sv: {
        name: "HGH Frag 176-191",
        tagline: "Nativt lipolytiskt hGH-fragment — metabolismforskning",
        description:
          "Nativt 16-rest C-terminalt fragment av humant tillväxthormon för lipolysforskning.",
      },
      nl: {
        name: "HGH Frag 176-191",
        tagline: "Native lipolytische hGH-fragment — metabolisch onderzoek",
        description:
          "Native 16-residu C-terminale fragment van humaan groeihormoon voor lipolyseonderzoek.",
      },
    },
  },
]

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getFeaturedProducts(): Product[] {
  return products.slice(0, 7)
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category)
}
