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
    vials: [
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mL",
        sku: "BACW-10",
        priceCents: 995,
        stockQty: 240,
        lowStockThreshold: 30,
        purchaseMode: "direct",
      },
    ],
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
      tagline: "Sterile bacteriostatic water (0.9 % benzyl alcohol) for reconstitution",
      description:
        "Sterile bacteriostatic water in a 10 mL ampoule, used to reconstitute lyophilised peptides into solution. The 0.9 % benzyl alcohol suppresses bacterial growth so a reconstituted vial stays usable across a working day.",
    },
    translations: {
      fi: {
        name: "BAC-vesi",
        tagline: "Sterili bakteriostaattinen vesi (0,9 % bentsyylialkoholi) liuotukseen",
        description:
          "Sterili bakteriostaattinen vesi 10 mL:n ampullissa, jolla lyofilisoitu peptidi liuotetaan liuokseksi. 0,9 % bentsyylialkoholi hillitsee bakteerikasvun, joten liuotettu pullo säilyy käyttökelpoisena työpäivän ajan.",
      },
      sv: {
        name: "BAC-vatten",
        tagline: "Sterilt bakteriostatiskt vatten (0,9 % bensylalkohol) för rekonstitution",
        description:
          "Sterilt bakteriostatiskt vatten i en 10 mL-ampull, som används för att rekonstituera lyofiliserade peptider till lösning. Bensylalkoholen på 0,9 % hämmar bakterietillväxt, så en rekonstituerad flaska är användbar en arbetsdag.",
      },
      ru: {
        name: "BAC-вода",
        tagline: "Стериальная бактериостатическая вода (0,9 % бензилового спирта) для разведения",
        description:
          "Стериальная бактериостатическая вода в ампуле 10 мл для разведения лиофилизированных пептидов в раствор. Бензиловый спирт 0,9 % подавляет рост бактерий, поэтому разведённый флакон остаётся пригодным в течение рабочего дня.",
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
      {
        mg: 20,
        sizeValue: 20,
        sizeUnit: "mg",
        sku: "RETA-20",
        priceCents: 9900,
        stockQty: 28,
        lowStockThreshold: 8,
        purchaseMode: "direct",
      },
      {
        mg: 30,
        sizeValue: 30,
        sizeUnit: "mg",
        sku: "RETA-30",
        priceCents: 12900,
        compareAtCents: 13900,
        stockQty: 11,
        lowStockThreshold: 6,
        purchaseMode: "direct",
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
      tagline: "Triple-agonist peptide (GLP-1 / GIP / glucagon) — metabolic research",
      description:
        "A synthetic 41-amino-acid peptide that acts on three receptors at once. It is the most requested compound in the metabolic category and is used as a reference in receptor-signalling and glucose-handling models.",
    },
    translations: {
      fi: {
        name: "Retatrutidi",
        tagline: "Triaginistinen peptidi (GLP-1 / GIP / glukagoni) — ainevaihduntatutkimus",
        description:
          "Synteettinen 41 aminohappoa sisältävä peptidi, joka vaikuttaa kolmeen reseptoriin samanaikaisesti. Ainevaihduntakategorian eniten kysytty yhdiste, jota käytetään referenssinä reseptorisignaalin ja glukoosinsäätelyn malleissa.",
      },
      sv: {
        name: "Retatrutid",
        tagline: "Triagonistpeptid (GLP-1 / GIP / glukagon) — metabolforskning",
        description:
          "Ett syntetiskt peptid med 41 aminosyror som verkar på tre receptorer samtidigt. Det är det mest efterfrågade ämnet i kategorin och används som referens i modeller för receptorsignalering och glukosreglering.",
      },
      ru: {
        name: "Ретатрутид",
        tagline: "Триагонистный пептид (GLP-1 / GIP / глюкагон) — метаболические исследования",
        description:
          "Синтетический пептид из 41 аминокислоты, действующий одновременно на три рецептора. Самое востребованное соединение в метаболической категории; применяется как референс в моделях рецепторной сигнализации и регуляции глюкозы.",
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
      {
        mg: 50,
        sizeValue: 50,
        sizeUnit: "mg",
        sku: "GHKCU-50",
        priceCents: 3990,
        stockQty: 142,
        lowStockThreshold: 20,
        purchaseMode: "direct",
      },
      {
        mg: 100,
        sizeValue: 100,
        sizeUnit: "mg",
        sku: "GHKCU-100",
        priceCents: 6990,
        compareAtCents: 7900,
        stockQty: 58,
        lowStockThreshold: 10,
        purchaseMode: "direct",
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
      tagline: "Copper-binding tripeptide (Gly-His-Lys) — cosmetic and tissue research",
      description:
        "A natural copper-binding tripeptide that occurs in human skin and wound tissue. It is studied for its effect on collagen synthesis and tissue remodelling, and is the reference compound for cosmetic and dermal research.",
    },
    translations: {
      fi: {
        name: "GHK-Cu",
        tagline: "Kuparia sitova tripeptidi (Gly-His-Lys) — kosmeettinen ja kudosresearch",
        description:
          "Luonnollinen kuparia sitova tripeptidi, jota esiintyy ihmisen ihossa ja haavakudoksessa. Sitä tutkitaan kollageenisynteesiin ja kudosten uudistumiseen liittyvissä kokeissa, ja se on kosmeettisen ja ihokudostutkimuksen referenssiyhdiste.",
      },
      sv: {
        name: "GHK-Cu",
        tagline: "Kopparbindande tripeptid (Gly-His-Lys) — kosmetik- och vävnadsforskning",
        description:
          "En naturlig kopparbindande tripeptid som finns i mänsklig hud och sårvävnad. Den studeras för sin effekt på kollagensyntes och vävnadsombyggnad och är referensämnet inom kosmetik- och hudforskning.",
      },
      ru: {
        name: "GHK-Cu",
        tagline:
          "Связывающий медь трипептид (Gly-His-Lys) — косметические исследования и исследования тканей",
        description:
          "Природный связывающий медь трипептид, который содержится в коже и раневой ткани человека. Его изучают как фактор синтеза коллагена и ремоделирования тканей; это референсное соединение в косметических и дерматологических исследованиях.",
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
    vials: [
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "MOTSC-10",
        priceCents: 4200,
        stockQty: 47,
        lowStockThreshold: 10,
        purchaseMode: "direct",
      },
    ],
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
      tagline: "Mitochondrial-derived peptide (16 amino acids) — ageing and metabolic research",
      description:
        "A 16-amino-acid peptide encoded by mitochondrial DNA and expressed in skeletal muscle. It is used in studies of cellular metabolism, exercise adaptation and models of cellular ageing.",
    },
    translations: {
      fi: {
        name: "MOTS-c",
        tagline:
          "Mitokondriaalinen peptidi (16 aminohappoa) — vanhenemis- ja ainevaihduntatutkimus",
        description:
          "Mitochondriaalisesta DNA:stä koodattu 16 aminohapon peptidi, joka ilmaisee luustolihaksessa. Sitä käytetään soluaineenvaihdun, liikuntaadaptation ja solujen vanhenemisen malleissa.",
      },
      sv: {
        name: "MOTS-c",
        tagline: "Mitokondriellt peptid (16 aminosyror) — åldrande och metabolforskning",
        description:
          "Ett peptid med 16 aminosyror kodat av mitokondriellt DNA och uttryckt i skelettmuskulatur. Det används i studier av cellmetabolism, träningsanpassning och modeller för cellåldrande.",
      },
      ru: {
        name: "MOTS-c",
        tagline: "Митохондриальный пептид (16 аминокислот) — исследования старения и метаболизма",
        description:
          "Пептид из 16 аминокислот, кодируемый митохондриальной ДНК и экспрессируемый в скелетной мышце. Применяется в исследованиях клеточного метаболизма, адаптации к нагрузке и моделях клеточного старения.",
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
    vials: [
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "MT2-10",
        priceCents: 1000,
        stockQty: 312,
        lowStockThreshold: 40,
        purchaseMode: "direct",
      },
    ],
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
      tagline: "Synthetic α-MSH analog — melanocortin receptor research",
      description:
        "A synthetic cyclic heptapeptide analog of α-melanocyte-stimulating hormone. It is the standard research compound for melanocortin-1 receptor signalling and pigmentation pathways.",
    },
    translations: {
      fi: {
        name: "Melanotan II",
        tagline: "Synteettinen α-MSH-analogi — melanokortiinireseptoritutkimus",
        description:
          "Synteettinen syklinen heptapeptidianalogi α-melanokyyttistä stimuloivasta hormonista. Se on tutkimuksen vakioyhdiste melanokortiini-1-reseptorin signaloinnin ja pigmentaation tutkimuksessa.",
      },
      sv: {
        name: "Melanotan II",
        tagline: "Syntetisk α-MSH-analog — melanokortinreceptorforskning",
        description:
          "En syntetisk cyklisk heptapeptidanalog av α-melanocytstimulerande hormon. Det är standardämnet inom forskning om melanokortin-1-receptorns signalering och pigmentering.",
      },
      ru: {
        name: "Меланотан II",
        tagline: "Синтетический аналог α-MSH — исследования меланокортиновых рецепторов",
        description:
          "Синтетический циклический гептапептидный аналог α-меланоцитстимулирующего гормона. Стандартное исследовательское соединение для изучения сигналинга рецептора MC1R и пигментации.",
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
    vials: [
      {
        mg: 1000,
        sizeValue: 1000,
        sizeUnit: "mg",
        sku: "NAD-1000",
        priceCents: 9000,
        stockQty: 36,
        lowStockThreshold: 8,
        purchaseMode: "direct",
      },
    ],
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
        "The oxidised form of nicotinamide adenine dinucleotide, a coenzyme present in every living cell. It is supplied as a 1 g research vial and used in studies of cellular energetics and sirtuin-pathway activity.",
    },
    translations: {
      fi: {
        name: "NAD+",
        tagline: "Nikotiiniamidiadeniinidinukleotiidi — solun energia-ainevaihdun tutkimus",
        description:
          "Nikotiiniamidiadeniinidinukleotiidin oksonoitu muoto, koentsyymi joka esiintyy jokaisessa elävässä solussa. Toimitetaan 1 g:n tutkimuspullona ja käytetään soluenergetiikan ja sirtuiinipolun aktiivisuuden tutkimuksissa.",
      },
      sv: {
        name: "NAD+",
        tagline: "Nikotinamidadenindinukleotid — cellenergiforskning",
        description:
          "Den oxiderade formen av nikotinamidadenindinukleotid, ett koenzym som finns i varje levande cell. Levereras som ett 1 g-forskningsämne och används i studier av cellenergi och sirtuinaktivitet.",
      },
      ru: {
        name: "NAD+",
        tagline: "Никотинамидадениндинуклеотид — исследования клеточной энергетики",
        description:
          "Окисленная форма никотинамидадениндинуклеотида — кофермента, присутствующего в каждой живой клетке. Поставляется в исследовательском флаконе 1 г и применяется в исследованиях клеточной энергетики и активности пути сиртуинов.",
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
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "BPC157-5",
        priceCents: 3990,
        stockQty: 124,
        lowStockThreshold: 15,
        purchaseMode: "direct",
      },
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "BPC157-10",
        priceCents: 6900,
        stockQty: 73,
        lowStockThreshold: 12,
        purchaseMode: "direct",
      },
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
      tagline: "Body Protection Compound — a 15-amino-acid sequence for tissue research",
      description:
        "A synthetic 15-amino-acid sequence derived from a gastric protein. It is the reference compound in soft-tissue and gut-mucosa research, where it is studied for its effect on collagen deposition and healing response.",
    },
    translations: {
      fi: {
        name: "BPC-157",
        tagline: "Body Protection Compound — 15 aminohapon järjestelmä kudosresearchiin",
        description:
          "Synteettinen 15 aminohapon järjestelmä, joka on johdettu mahalimakuun proteiinista. Se on referenssiyhdiste pehmytkudos- ja suolen limakalvotutkimuksissa, joissa sitä tutkitaan kollageenisaostumisen ja paranemisvasteen vaikutuksen osalta.",
      },
      sv: {
        name: "BPC-157",
        tagline:
          "Body Protection Compound — en aminosyrussekvens på 15 aminosyror för vävnadsforskning",
        description:
          "En syntetisk aminosyrussekvens på 15 aminosyror som härletts från ett mageprotein. Det är referensämnet inom forskning om mjukvävnad och tarmlimhinna, där dess effekt på kollagenavsättning och läkningssvar studeras.",
      },
      ru: {
        name: "BPC-157",
        tagline:
          "Body Protection Compound — последовательность из 15 аминокислот для исследований тканей",
        description:
          "Синтетическая последовательность из 15 аминокислот, полученная из желудочного белка. Это референсное соединение в исследованиях мягких тканей и слизистой кишечника, где изучают его влияние на отложение коллагена и заживление.",
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
    vials: [
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "MT1-10",
        priceCents: 3900,
        stockQty: 86,
        lowStockThreshold: 12,
        purchaseMode: "direct",
      },
    ],
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
        "A linear 13-amino-acid analog of α-MSH with a stabilising C-terminal extension. It is used in melanocortin-1 receptor signalling studies alongside Melanotan II as a comparison compound.",
    },
    translations: {
      fi: {
        name: "Melanotan I",
        tagline: "Afamelanotidi — melanokortiini-1-reseptoritutkimus",
        description:
          "Lineaarinen 13 aminohapon α-MSH-analogi, jossa on stabiloiva C-terminaalinen laajennus. Sitä käytetään melanokortiini-1-reseptorin signaalintutkimuksissa Melanotan II:n vertailuaineena.",
      },
      sv: {
        name: "Melanotan I",
        tagline: "Afamelanotid — melanokortin-1-receptorforskning",
        description:
          "En linjär α-MSH-analog med 13 aminosyror och en stabiliserande C-terminal förlängning. Den används i studier av melanokortin-1-receptorns signalering, som jämförelseämne mot Melanotan II.",
      },
      ru: {
        name: "Меланотан I",
        tagline: "Афамеланотид — исследования рецептора MC1R",
        description:
          "Линейный 13-аминокислотный аналог α-MSH со стабилизирующим С-концевым расширением. Применяется в исследованиях сигналинга рецептора MC1R как соединение для сравнения с Меланотаном II.",
      },
    },
  },

  {
    slug: "klow",
    category: "blend",
    hue: 280,
    storageTemp: "−20 °C, desiccated",
    vials: [
      {
        mg: 80,
        sizeValue: 80,
        sizeUnit: "mg",
        sku: "KLOW-80",
        priceCents: 13000,
        stockQty: 18,
        lowStockThreshold: 6,
        purchaseMode: "direct",
      },
    ],
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
      tagline: "KPV + BPC-157 + GHK-Cu — a pre-formulated 80 mg research blend",
      description:
        "A single vial containing KPV, BPC-157 and GHK-Cu in one lyophilised 80 mg dose. It is used when a study needs all three components in a fixed ratio rather than three separate vials.",
    },
    translations: {
      fi: {
        name: "KLOW-sekoitus",
        tagline: "KPV + BPC-157 + GHK-Cu — valmis 80 mg:n tutkimussekoitus",
        description:
          "Yksi pullo, jossa on KPV, BPC-157 ja GHK-Cu yhtenä lyofilisoituna 80 mg:n annoksena. Sitä käytetään, kun tutkimuksessa tarvitaan kaikki kolme ainetta kiinteässä suhteessa eikä kolmena erillisenä pullona.",
      },
      sv: {
        name: "KLOW-blandning",
        tagline: "KPV + BPC-157 + GHK-Cu — färdigblandat 80 mg forskningsblandning",
        description:
          "En flaska som innehåller KPV, BPC-157 och GHK-Cu i en lyofiliserad dos på 80 mg. Används när en studie behöver alla tre komponenterna i fast proportion i stället för i tre separata flaskor.",
      },
      ru: {
        name: "Смесь KLOW",
        tagline: "KPV + BPC-157 + GHK-Cu — готовая исследовательская смесь 80 мг",
        description:
          "Один флакон, содержащий KPV, BPC-157 и GHK-Cu в виде единой лиофилизированной дозы 80 мг. Используется, когда исследованию нужны все три компонента в фиксированном соотношении, а не в трёх отдельных флаконах.",
      },
    },
  },

  {
    slug: "bpc-tb-blend",
    category: "blend",
    hue: 210,
    storageTemp: "−20 °C, desiccated",
    vials: [
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "BPC-TB-10",
        priceCents: 6000,
        stockQty: 64,
        lowStockThreshold: 10,
        purchaseMode: "direct",
      },
    ],
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
      tagline: "Pre-mixed BPC-157 and Thymosin β4 fragment — tissue research",
      description:
        "A pre-formulated vial combining BPC-157 with the TB-500 fragment of Thymosin β4. It is used in soft-tissue research where both sequences are studied together in the same model.",
    },
    translations: {
      fi: {
        name: "BPC-157 + TB-500 -sekoitus",
        tagline: "Valmiiksi sekoitettu BPC-157 ja tymosiini β4 -fragmentti — kudosresearch",
        description:
          "Valmiiksi formuloidu pullo, joka yhdistää BPC-157:n tymosiini β4:n TB-500-fragmenttiin. Sitä käytetään pehmytkudosresearchissa, jossa molemmat järjestelmät tutkitaan samassa mallissa.",
      },
      sv: {
        name: "BPC-157 + TB-500-blandning",
        tagline: "Förblandad BPC-157 och tymosin β4-fragment — vävnadsforskning",
        description:
          "En förformulerad flaska som kombinerar BPC-157 med TB-500-fragmentet av tymosin β4. Används inom mjukvävnadsforskning där båda sekvenserna studeras i samma modell.",
      },
      ru: {
        name: "Смесь BPC-157 + TB-500",
        tagline: "Готовая смесь BPC-157 и фрагмента тимозина β4 — исследования тканей",
        description:
          "Предварительно сформулированный флакон, объединяющий BPC-157 и фрагмент тимозина β4 (TB-500). Применяется в исследованиях мягких тканей, где обе последовательности изучаются в одной модели.",
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
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "SELK-5",
        priceCents: 2200,
        stockQty: 132,
        lowStockThreshold: 18,
        purchaseMode: "direct",
      },
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "SELK-10",
        priceCents: 3900,
        stockQty: 51,
        lowStockThreshold: 10,
        purchaseMode: "direct",
      },
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
      tagline: "Synthetic tuftsin analog — cognitive and anxiolytic research",
      description:
        "A synthetic heptapeptide analog of the immunomodulatory peptide tuftsin. It is studied for its influence on BDNF expression and serotonin signalling in neurobiology models.",
    },
    translations: {
      fi: {
        name: "Selank",
        tagline: "Synteettinen tuftsuiinianalogi — kognitiivinen ja anksiolyyttinen tutkimus",
        description:
          "Synteettinen heptapeptidianalogi immunomoduloivasta tuftsuiinipeptidistä. Sitä tutkitaan BDNF:n ilmentymisen ja serotoniinisignaalin vaikutuksesta neurobiologisissa malleissa.",
      },
      sv: {
        name: "Selank",
        tagline: "Syntetisk tuftsinanalog — kognitiv och anxiolytisk forskning",
        description:
          "En syntetisk heptapeptidanalog av det immunomodulerande peptidet tuftsin. Den studeras för sitt inflytande på BDNF-uttryck och serotoninsignalering i neurobiologiska modeller.",
      },
      ru: {
        name: "Селанк",
        tagline:
          "Синтетический аналог туфтсина — когнитивные исследования и исследования анксиолитических эффектов",
        description:
          "Синтетический гептапептидный аналог иммуномодулирующего пептида туфтсина. Изучается как фактор влияния на экспрессию BDNF и серотониновую сигнализацию в нейробиологических моделях.",
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
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "SEMX-5",
        priceCents: 2200,
        stockQty: 58,
        lowStockThreshold: 10,
        purchaseMode: "direct",
      },
      {
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        sku: "SEMX-10",
        priceCents: 3900,
        compareAtCents: 4400,
        stockQty: 22,
        lowStockThreshold: 8,
        purchaseMode: "direct",
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
      tagline: "ACTH 4–10 fragment — neuroprotection and cognition research",
      description:
        "A synthetic melanocortin derivative corresponding to the ACTH 4–10 fragment. It is used in neuroprotection studies and as a comparison compound in BDNF-expression research.",
    },
    translations: {
      fi: {
        name: "Semax",
        tagline: "ACTH 4–10 -fragmentti — neuroprotektio- ja kognitiotutkimus",
        description:
          "Synteettinen melakortiinijohdannainen, joka vastaa ACTH 4–10 -fragmenttia. Sitä käytetään neuroprotektiotutkimuksissa ja vertailuaineena BDDF:n ilmentymistä koskevissa kokeissa.",
      },
      sv: {
        name: "Semax",
        tagline: "ACTH 4–10-fragment — neuroprotektion och kognitionsforskning",
        description:
          "En syntetisk melanokortinderivat som motsvarar ACTH 4–10-fragmentet. Används i neuroprotektionsstudier och som jämförelseämne i forskning om BDNF-uttryck.",
      },
      ru: {
        name: "Семакс",
        tagline: "Фрагмент АКТГ 4–10 — исследования нейропротекции и когнитивных функций",
        description:
          "Синтетический производный меланокортина, соответствующий фрагменту АКТГ 4–10. Применяется в исследованиях нейропротекции и как соединение для сравнения при изучении экспрессии BDNF.",
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
    vials: [
      {
        mg: 1,
        sizeValue: 1,
        sizeUnit: "mg",
        sku: "CJC-1",
        priceCents: 5990,
        stockQty: 41,
        lowStockThreshold: 10,
        purchaseMode: "direct",
      },
    ],
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
        "A 30-amino-acid synthetic analog of growth-hormone-releasing hormone without the drug-affinity complex. It is the standard compound for studying pulsatile growth-hormone signalling and receptor response.",
    },
    translations: {
      fi: {
        name: "CJC-1295",
        tagline: "Muokattu GHRH-analogi (ei DAC) — kasvuhormonitutkimus",
        description:
          "Synteettinen 30 aminohapon kasvuhormonin vapauttajahormonin (GHRH) analogi ilman drug-affinity complexia. Se on vakioyhdiste pulssittaisen kasvuhormonisignaalin ja reseptorivasteen tutkimuksessa.",
      },
      sv: {
        name: "CJC-1295",
        tagline: "Modifierad GHRH-analog (utan DAC) — tillväxthormonforskning",
        description:
          "En syntetisk analog på 30 aminosyror av tillväxthormonfrisättande hormon (GHRH) utan drug-affinity-komplex. Det är standardämnet för studier av pulserande tillväxthormonsignalering och receptorrespons.",
      },
      ru: {
        name: "CJC-1295",
        tagline: "Модифицированный аналог GHRH (без DAC) — исследования гормона роста",
        description:
          "Синтетический 30-аминокислотный аналог гормона, высвобождающего гормон роста (GHRH), без drug-affinity-комплекса. Это стандартное соединение для изучения пульсирующей сигнализации гормона роста и ответа рецептора.",
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
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "AOD-5",
        priceCents: 0,
        stockQty: 0,
        lowStockThreshold: null,
        purchaseMode: "quotation",
        contactOnly: true,
      },
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
      tagline: "Modified hGH fragment 176–191 — metabolic research",
      description:
        "A modified C-terminal fragment of human growth hormone, supplied on request only. Contact us for current batch availability and pricing for this compound.",
    },
    translations: {
      fi: {
        name: "AOD-9604",
        tagline: "Muokattu hGH-fragmentti 176–191 — ainevaihduntatutkimus",
        description:
          "Ihmisen kasvuhormonin muokattu C-terminaalinen fragmentti, toimitetaan vain pyynnöstä. Pyydä meiltä yhteyttä nykyisen erän saatavuuteen ja hintaan.",
      },
      sv: {
        name: "AOD-9604",
        tagline: "Modifierat hGH-fragment 176–191 — metabolforskning",
        description:
          "Ett modifierat C-terminalt fragment av mänskligt tillväxthormon, som endast levereras på begäran. Kontakta oss för aktuell batchtillgänglighet och pris.",
      },
      ru: {
        name: "AOD-9604",
        tagline: "Модифицированный фрагмент hGH 176–191 — исследования метаболизма",
        description:
          "Модифицированный С-концевой фрагмент гормона роста человека, поставляемый только по запросу. Свяжитесь с нами по поводу наличия партии и цены.",
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
    vials: [
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "HGHFR-5",
        priceCents: 4500,
        stockQty: 72,
        lowStockThreshold: 12,
        purchaseMode: "direct",
      },
    ],
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
      name: "HGH Frag 176–191",
      tagline: "Native hGH lipolytic fragment — metabolic research",
      description:
        "The native 16-residue C-terminal fragment of human growth hormone, also called AOD-9604 without modification. It is studied in lipolysis and metabolic models as a reference for the modified and unmodified forms.",
    },
    translations: {
      fi: {
        name: "HGH-fragmentti 176–191",
        tagline: "Luonnollinen hGH:n lipolyysifragmentti — ainevaihduntatutkimus",
        description:
          "Ihmisen kasvuhormonin luonnollinen 16 jääkkeen C-terminaalinen fragmentti, jota kutsutaan myös modifioimattomaksi AOD-9604:ksi. Sitä tutkitaan lipolyysi- ja ainevaihduntamalleissa referenssinä modifioituun ja modifioimattomaan muotoon.",
      },
      sv: {
        name: "HGH-frag 176–191",
        tagline: "Nativt hGH-lipolytiskt fragment — metabolforskning",
        description:
          "Det nativa C-terminala fragmentet med 16 aminosyror ur mänskligt tillväxthormon, även kallat AOD-9604 utan modifiering. Det studeras i lipolys- och metabolmodeller som referens för de modifierade och omoderade formerna.",
      },
      ru: {
        name: "Фрагмент гормона роста 176–191",
        tagline: "Нативный липолитический фрагмент гормона роста — исследования метаболизма",
        description:
          "Нативный С-концевой фрагмент гормона роста человека из 16 аминокислот, также известный как AOD-9604 без модификации. Изучается в моделях липолиза и метаболизма как референс модифицированной и немодифицированной форм.",
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

/**
 * The six products shown in the homepage hero 3D carousel. The selection
 * is curated, not just `slice(0, 6)`, to keep the carousel visually varied
 * (different hues, different categories) and to omit supplies like
 * `bac-water` which are not the marquee peptides.
 *
 * Used by `app/[locale]/page.tsx` to drive the hero chips and the floating
 * product card. The order here is the canonical rotation order.
 */
const HERO_HERO_SLUGS = ["bpc-157", "tb-500", "ghk-cu", "ipamorelin", "semax", "nad-plus"] as const

export function getFeaturedHeroProducts(): Product[] {
  const out: Product[] = []
  for (const slug of HERO_HERO_SLUGS) {
    const p = products.find((x) => x.slug === slug)
    if (p) out.push(p)
  }
  // Fall back to the first N products if the curated list is missing slugs
  // (so the hero never renders empty after a catalogue edit).
  if (out.length < 6) {
    for (const p of products) {
      if (out.length >= 6) break
      if (!out.includes(p)) out.push(p)
    }
  }
  return out
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category)
}
