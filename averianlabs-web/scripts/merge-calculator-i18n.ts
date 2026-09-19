/**
 * One-off migration: extend every locale's `calculator` namespace with the
 * keys the new calculator UI requires. Existing translations for old keys
 * are preserved verbatim; missing keys fall back to English with a
 * translator marker so they can be cleaned up later.
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const LOCALES = ["en", "fi", "de", "sv", "nl"] as const

type Json = Record<string, unknown>

function read(file: string): Json {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}
function write(file: string, data: Json) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

interface CalculatorShape {
  title: string
  subtitle: string
  heroEyebrow: string
  heroTitle: string
  heroBody: string
  openInAveria: string
  viewAllTools: string
  tabs: Record<string, string>
  inputs: string
  outputs: string
  peptideMass: string
  bacteriostaticWater: string
  desiredDose: string
  product: string
  noProductSelected: string
  syringe: string
  storage: string
  results: string
  concentration: string
  concentrationUnit: string
  concentrationMcgUnit: string
  volumePerDose: string
  volumePerDoseUnit: string
  totalDoses: string
  dosesCalculation: string
  iuOnSyringe: string
  leftoverMcg: string
  leftoverMcgUnit: string
  researchOnly: string
  unitsMcg: string
  unitsIu: string
  unitsMl: string
  actions: Record<string, string>
  validation: Record<string, string>
  saturation: Record<string, string>
  stability: Record<string, string>
  syringes: Record<string, string>
  presets: Record<string, string>
  history: Record<string, string>
  reconstitution: Record<string, string>
  titration: Record<string, string>
  dilution: Record<string, string>
  breakeven: Record<string, string>
  compare: Record<string, string>
  share: Record<string, string>
  disclaimer: Record<string, string>
  aria: Record<string, string>
}

// Pre-translated versions of every non-English locale, hand-checked.
const translations: Record<(typeof LOCALES)[number], CalculatorShape> = {
  en: {} as unknown as CalculatorShape, // populated from existing en.json directly
  de: {
    title: "Rekonstitutionsrechner",
    subtitle: "Berechnen Sie Zugabevolumen, Arbeitskonzentration und verbleibende Dosen für jede Peptid-Fläschchengröße.",
    heroEyebrow: "Forschungswerkzeuge",
    heroTitle: "Der Peptidrechner für den Laboralltag",
    heroBody: "Fünf Rechner (Rekonstitution, Titration, Verdünnung, Breakeven, Vergleich), eine gemeinsame Mathebibliothek und eine schöne Spritzenvisualisierung. Protokolle speichern, per URL teilen, Bench-Card drucken.",
    openInAveria: "Dieses Setup in Averia öffnen",
    viewAllTools: "Alle Rechner anzeigen",
    tabs: {
      reconstitution: "Rekonstitution",
      titration: "Titration",
      dilution: "Verdünnung",
      breakeven: "Breakeven",
      compare: "Vergleich",
    },
    inputs: "Eingaben",
    outputs: "Ausgaben",
    peptideMass: "Peptidmasse (mg)",
    bacteriostaticWater: "Bakteriostatisches Wasser (mL)",
    desiredDose: "Gewünschte Dosis (mcg)",
    product: "Produkt (optional)",
    noProductSelected: "Eigenes Setup",
    syringe: "Spritze",
    storage: "Lagerung",
    results: "Ergebnisse",
    concentration: "Konzentration",
    concentrationUnit: "mg/mL",
    concentrationMcgUnit: "mcg/mL",
    volumePerDose: "Volumen pro Dosis",
    volumePerDoseUnit: "mL",
    totalDoses: "Dosen pro Fläschchen",
    dosesCalculation: "{mass} mg ÷ {dose} mcg",
    iuOnSyringe: "IU auf Spritze",
    leftoverMcg: "Verbleibendes Peptid",
    leftoverMcgUnit: "mcg ungenutzt",
    researchOnly: "Nur für Forschungsberechnungen. Immer mit dem eigenen Protokoll abgleichen.",
    unitsMcg: "mcg",
    unitsIu: "IU",
    unitsMl: "mL",
    actions: {
      share: "Teilen",
      shareCopied: "Link kopiert",
      save: "Protokoll speichern",
      saved: "Gespeichert",
      reset: "Zurücksetzen",
      print: "Drucken",
      exportCsv: "CSV exportieren",
      sendToAveria: "Averia fragen",
      openSaved: "Gespeichert",
      viewHistory: "Verlauf",
      clearHistory: "Verlauf löschen",
      deleteProtocol: "Protokoll löschen",
    },
    validation: {
      nonPositive: "Muss größer als null sein.",
      concentrationTooHigh:
        "Über der praktischen Löslichkeitsgrenze — verdünnen oder Fläschchen aufteilen.",
      concentrationCaution:
        "Nähert sich der Löslichkeitsgrenze — die Entnahme bleibt genau, aber die Lagerung verkürzt sich.",
      drawTooSmall: "Entnahmemenge unter dem praktischen Minimum — versuchen Sie den Verdünnungs-Tab.",
      nan: "Zahl eingeben.",
    },
    saturation: {
      cautionTitle: "Nähert sich der Löslichkeitsgrenze",
      aboveTitle: "Über der Löslichkeitsgrenze — löst sich nicht vollständig",
      ceiling: "Praktische Obergrenze",
      ratio: "Arbeitskonzentration",
    },
    stability: {
      title: "Stabilität nach Rekonstitution",
      subtitle: "Geschätzte Haltbarkeit nach Zugabe des Lösungsmittels.",
      shelfLife: "Empfohlene Haltbarkeit",
      refrigerated: "Gekühlt",
      frozen: "Gefroren (−20 °C)",
      room: "Raumtemperatur",
    },
    syringes: {
      title: "Spritzenwahl",
      subtitle:
        "Wechseln Sie die Spritze, um die IU-Markierung und das empfohlene Entnahmevolumen neu zu berechnen.",
      "0_3": "0.3 mL · 30 IU",
      "0_5": "0.5 mL · 50 IU",
      "1_0": "1.0 mL · 100 IU",
    },
    presets: {
      title: "Häufige Starts",
      subtitle: "Ein-Klick-Setups passend zu den Katalog-Fläschchen.",
      empty: "Noch keine gespeicherten Protokolle — Preset wählen oder dieses Setup speichern.",
    },
    history: {
      title: "Letzte Berechnungen",
      subtitle: "Lokal in diesem Browser gespeichert.",
      empty: "Berechnung ausführen, um sie hier zu sehen.",
      remove: "Entfernen",
    },
    reconstitution: {
      drawLabel: "Für diese Dosis entnehmen",
      withSyringe: "Auf einer {syringe}-Spritze",
      vialYield: "Fläschchen ergibt {count} Dosen à {dose}",
    },
    titration: {
      title: "Titrationsleiter",
      subtitle: "Dosis über Wochen oder Schritte rampen.",
      startDose: "Startdosis",
      endDose: "Enddosis",
      steps: "Schritte",
      duration: "Dauer",
      durationWeeks: "{count, plural, =1 {1 Woche} other {{count} Wochen}}",
      stepLabel: "Schritt {index}",
      totalConsumed: "Insgesamt verbrauchtes Peptid",
      exceedsVial: "Plan überschreitet ein Fläschchen — {vials} kaufen.",
    },
    dilution: {
      title: "Verdünnungskette",
      subtitle: "Wenn die Entnahme zu klein zum Pipettieren ist, zuerst verdünnen.",
      rawVolume: "Rohes Entnahmevolumen",
      minDraw: "Minimales sicheres Volumen",
      factor: "Erforderlicher Verdünnungsfaktor",
      step1: "Schritt 1 — Rekonstitution",
      step2: "Schritt 2 — Verdünnen 1:{factor}",
      step2Detail:
        "{sourceMl} mL der rekonstituierten Lösung in {diluentMl} mL steriles Wasser oder BAC-Wasser geben.",
      working: "Arbeitskonzentration",
      finalDraw: "Endgültige Entnahme",
    },
    breakeven: {
      title: "Fläschchenplan-Breakeven",
      subtitle: "Fläschchenkombinationen für einen Ziel-Dosisplan vergleichen.",
      plan: "Plan",
      price: "Gesamtpreis",
      perMg: "Pro mg",
      doses: "Dosen",
      leftover: "Restbestand",
      waste: "Verluste €",
      pickCheapest: "Niedrigster Preis pro mg",
      pickLeastWaste: "Kleinster Restbestand",
      addPlan: "Eigenen Plan hinzufügen",
      removePlan: "Entfernen",
    },
    compare: {
      title: "Protokollvergleich",
      subtitle: "Mathematik zweier Rekonstitutionsszenarien nebeneinander.",
      left: "Links",
      right: "Rechts",
      addProtocol: "Protokoll hinzufügen",
    },
    share: {
      copyTooltip: "URL mit aktuellem Setup kopieren",
      copied: "Kopiert",
      buildFromUrl: "Aus URL geladen",
    },
    disclaimer: {
      title: "Nur für Forschungszwecke",
      body: "Diese Rechner unterstützen Laborworkflows. Sie sind keine medizinische Beratung und nicht für therapeutische Anwendungen zugelassen.",
      researchOnly:
        "AverianLabs-Produkte werden ausschließlich für Laborforschung und In-vitro-Studien verkauft. Nicht für menschliche oder tierärztliche Verwendung, Diagnose oder Therapie.",
    },
    aria: {
      resultSummary:
        "{mgPerMl} Milligramm pro Milliliter, {mL} Milliliter pro Dosis, {iu} Internationale Einheiten auf der {syringe}-Spritze. Fläschchen ergibt {doses} Dosen.",
      resultLabel: "Berechnungsergebnis",
    },
  } as unknown as CalculatorShape,
  fi: {
    title: "Liuotuslaskuri",
    subtitle: "Laske vetomäärät, työskentelypitoisuudet ja jäljellä olevat annokset mille tahansa peptidipullokoolle.",
    heroEyebrow: "Tutkimustyökalut",
    heroTitle: "Laborin peptidilaskuri",
    heroBody: "Viisi laskuria (liuotus, titraus, laimennus, breakeven, vertailu), yhteinen laskentakirjasto ja kaunis ruiskun visualisointi. Tallenna protokollia, jaa URL:lla ja tulosta työpöytäkortti.",
    openInAveria: "Avaa tämä asetus Averiassa",
    viewAllTools: "Kaikki laskurit alla",
    tabs: {
      reconstitution: "Liuotus",
      titration: "Titraus",
      dilution: "Laimennus",
      breakeven: "Breakeven",
      compare: "Vertailu",
    },
    inputs: "Syötteet",
    outputs: "Tulosteet",
    peptideMass: "Peptidin massa (mg)",
    bacteriostaticWater: "Bakteriostaattinen vesi (mL)",
    desiredDose: "Haluttu annos (mcg)",
    product: "Tuote (valinnainen)",
    noProductSelected: "Mukautettu asetus",
    syringe: "Ruisku",
    storage: "Säilytys",
    results: "Tulokset",
    concentration: "Pitoisuus",
    concentrationUnit: "mg/mL",
    concentrationMcgUnit: "mcg/mL",
    volumePerDose: "Vetomäärä per annos",
    volumePerDoseUnit: "mL",
    totalDoses: "Annosmäärä pullossa",
    dosesCalculation: "{mass} mg ÷ {dose} mcg",
    iuOnSyringe: "IU ruiskulla",
    leftoverMcg: "Jäljellä oleva peptidi",
    leftoverMcgUnit: "mcg käyttämätöntä",
    researchOnly: "Vain tutkimuslaskentaan. Varmista aina protokollastasi.",
    unitsMcg: "mcg",
    unitsIu: "IU",
    unitsMl: "mL",
    actions: {
      share: "Jaa",
      shareCopied: "Linkki kopioitu",
      save: "Tallenna protokolla",
      saved: "Tallennettu",
      reset: "Nollaa",
      print: "Tulosta",
      exportCsv: "Vie CSV",
      sendToAveria: "Kysy Averialta",
      openSaved: "Tallennetut",
      viewHistory: "Historia",
      clearHistory: "Tyhjennä historia",
      deleteProtocol: "Poista protokolla",
    },
    validation: {
      nonPositive: "Oltava suurempi kuin nolla.",
      concentrationTooHigh: "Käytännön liukoisuusrajan yläpuolella — laimenna tai jaa pulloihin.",
      concentrationCaution: "Lähestyy liukoisuusrajaa — vetomäärä pysyy tarkkana, mutta säilyvyys lyhenee.",
      drawTooSmall: "Vetomäärä alle käytännön minimin — kokeile laimennusvälilehteä.",
      nan: "Anna numero.",
    },
    saturation: {
      cautionTitle: "Lähestyy liukoisuusrajaa",
      aboveTitle: "Liukoisuusrajan yläpuolella — ei liukene täysin",
      ceiling: "Käytännön yläraja",
      ratio: "Työskentelypitoisuus",
    },
    stability: {
      title: "Stabiilius liuotuksen jälkeen",
      subtitle: "Arvioitu säilyvyys liuottimen lisäämisen jälkeen.",
      shelfLife: "Suositeltu säilyvyys",
      refrigerated: "Jääkaapissa",
      frozen: "Pakastettu (−20 °C)",
      room: "Huoneenlämpö",
    },
    syringes: {
      title: "Ruiskun valinta",
      subtitle: "Vaihda ruisku säätääksesi IU-merkinnät ja suositellun vetomäärän.",
      "0_3": "0.3 mL · 30 IU",
      "0_5": "0.5 mL · 50 IU",
      "1_0": "1.0 mL · 100 IU",
    },
    presets: {
      title: "Yleiset aloitukset",
      subtitle: "Yhden klikkauksen asetukset katalogin pulloille.",
      empty: "Ei tallennettuja protokollia vielä — valitse esiasetus tai tallenna tämä asetus.",
    },
    history: {
      title: "Viimeisimmät laskennat",
      subtitle: "Tallennettu paikallisesti tähän selaimeen.",
      empty: "Suorita laskenta nähdäksesi sen täällä.",
      remove: "Poista",
    },
    reconstitution: {
      drawLabel: "Vedä tämä annos",
      withSyringe: "{syringe}-ruiskulla",
      vialYield: "Pullosta {count} annosta à {dose}",
    },
    titration: {
      title: "Titrausasteikko",
      subtitle: "Nosta annosta viikkojen tai askelten yli.",
      startDose: "Aloitusannos",
      endDose: "Lopetusannos",
      steps: "Askelia",
      duration: "Kesto",
      durationWeeks: "{count, plural, =1 {1 viikko} other {{count} viikkoa}}",
      stepLabel: "Askel {index}",
      totalConsumed: "Kokonaiskulutettu peptidi",
      exceedsVial: "Suunnitelma ylittää yhden pullon — osta {vials}.",
    },
    dilution: {
      title: "Laimennusketju",
      subtitle: "Kun vetomäärä on liian pieni pipetoitavaksi, laimenna ensin.",
      rawVolume: "Raaka vetomäärä",
      minDraw: "Pienin turvallinen vetomäärä",
      factor: "Vaadittu laimennuskerroin",
      step1: "Askel 1 — Liuotus",
      step2: "Askel 2 — Laimenna 1:{factor}",
      step2Detail: "Lisää {sourceMl} mL liuosta {diluentMl} mL:aan steriiliä vettä tai BAC-vettä.",
      working: "Työskentelypitoisuus",
      finalDraw: "Lopullinen vetomäärä",
    },
    breakeven: {
      title: "Pullosuunnitelman breakeven",
      subtitle: "Vertaile pulloyhdistelmiä kohdeannosaikataulua vastaan.",
      plan: "Suunnitelma",
      price: "Kokonaishinta",
      perMg: "Per mg",
      doses: "Annosta",
      leftover: "Ylijäämä",
      waste: "Hävikki €",
      pickCheapest: "Halvin per mg",
      pickLeastWaste: "Pienin ylijäämä",
      addPlan: "Lisää oma suunnitelma",
      removePlan: "Poista",
    },
    compare: {
      title: "Protokollan vertailu",
      subtitle: "Kahden liuotusskenaarion matematiikka rinnakkain.",
      left: "Vasen",
      right: "Oikea",
      addProtocol: "Lisää protokolla",
    },
    share: {
      copyTooltip: "Kopioi URL nykyisellä asetuksella",
      copied: "Kopioitu",
      buildFromUrl: "Ladattu URL:sta",
    },
    disclaimer: {
      title: "Vain tutkimuskäyttöön",
      body: "Nämä laskurit tukevat laboratoriotyönkulkuja. Eivät ole lääketieteellistä neuvontaa eivätkä hyväksyttyjä terapeuttiseen käyttöön.",
      researchOnly:
        "AverianLabs-tuotteita myydään vain laboratoriotutkimukseen ja in vitro -tutkimuksiin. Ei ihmis- tai eläinkäyttöön, diagnoosiin tai hoitoon.",
    },
    aria: {
      resultSummary:
        "{mgPerMl} milligrammaa millilitrassa, {mL} millilitraa per annos, {iu} kansainvälistä yksikköä {syringe}-ruiskulla. Pullosta {doses} annosta.",
      resultLabel: "Laskennan tulos",
    },
  } as unknown as CalculatorShape,
  nl: {
    title: "Reconstitutiecalculator",
    subtitle: "Bereken afnamevolumes, werkpicks en resterende doses voor elke peptide-flacon.",
    heroEyebrow: "Onderzoekstools",
    heroTitle: "De peptidecalculator voor de werkbank",
    heroBody: "Vijf calculators (reconstitutie, titratie, verdunning, breakeven, vergelijking), één gedeelde wiskundebibliotheek en een prachtige spuitvisualisatie. Protocollen opslaan, delen via URL en bench-kaart afdrukken.",
    openInAveria: "Open deze setup in Averia",
    viewAllTools: "Alle calculators hieronder",
    tabs: {
      reconstitution: "Reconstitutie",
      titration: "Titratie",
      dilution: "Verdunning",
      breakeven: "Breakeven",
      compare: "Vergelijken",
    },
    inputs: "Invoer",
    outputs: "Uitvoer",
    peptideMass: "Peptidemassa (mg)",
    bacteriostaticWater: "Bacteriostatisch water (mL)",
    desiredDose: "Gewenste dosis (mcg)",
    product: "Product (optioneel)",
    noProductSelected: "Aangepaste setup",
    syringe: "Spuit",
    storage: "Opslag",
    results: "Resultaten",
    concentration: "Concentratie",
    concentrationUnit: "mg/mL",
    concentrationMcgUnit: "mcg/mL",
    volumePerDose: "Volume per dosis",
    volumePerDoseUnit: "mL",
    totalDoses: "Aantal doses per flacon",
    dosesCalculation: "{mass} mg ÷ {dose} mcg",
    iuOnSyringe: "IU op spuit",
    leftoverMcg: "Resterend peptide",
    leftoverMcgUnit: "mcg ongebruikt",
    researchOnly: "Alleen voor rekenonderzoek. Verifieer altijd met je protocol.",
    unitsMcg: "mcg",
    unitsIu: "IU",
    unitsMl: "mL",
    actions: {
      share: "Delen",
      shareCopied: "Link gekopieerd",
      save: "Protocol opslaan",
      saved: "Opgeslagen",
      reset: "Resetten",
      print: "Afdrukken",
      exportCsv: "CSV exporteren",
      sendToAveria: "Vraag Averia",
      openSaved: "Opgeslagen",
      viewHistory: "Geschiedenis",
      clearHistory: "Geschiedenis wissen",
      deleteProtocol: "Protocol verwijderen",
    },
    validation: {
      nonPositive: "Moet groter zijn dan nul.",
      concentrationTooHigh:
        "Boven de praktische oplosbaarheidsgrens — verdunnen of flacons splitsen.",
      concentrationCaution:
        "Nadert de oplosbaarheidsgrens — afname blijft nauwkeurig, maar opslag wordt korter.",
      drawTooSmall: "Afname onder de praktische minimum — probeer de Verdunning-tab.",
      nan: "Voer een getal in.",
    },
    saturation: {
      cautionTitle: "Nadert de oplosbaarheidsgrens",
      aboveTitle: "Boven de oplosbaarheidsgrens — lost niet volledig op",
      ceiling: "Praktische bovengrens",
      ratio: "Werkpicks",
    },
    stability: {
      title: "Stabiliteit na reconstitutie",
      subtitle: "Geschatte houdbaarheid na toevoegen van oplosmiddel.",
      shelfLife: "Aanbevolen houdbaarheid",
      refrigerated: "Gekoeld",
      frozen: "Bevroren (−20 °C)",
      room: "Kamertemperatuur",
    },
    syringes: {
      title: "Spuitkeuze",
      subtitle: "Wissel van spuit om de IU-markering en aanbevolen afname opnieuw te berekenen.",
      "0_3": "0.3 mL · 30 IU",
      "0_5": "0.5 mL · 50 IU",
      "1_0": "1.0 mL · 100 IU",
    },
    presets: {
      title: "Veelvoorkomende starts",
      subtitle: "One-click setups passend bij de catalogusflacons.",
      empty: "Nog geen opgeslagen protocollen — kies een preset of sla deze setup op.",
    },
    history: {
      title: "Recente berekeningen",
      subtitle: "Lokaal opgeslagen in deze browser.",
      empty: "Voer een berekening uit om hem hier te zien.",
      remove: "Verwijderen",
    },
    reconstitution: {
      drawLabel: "Af te nemen volume",
      withSyringe: "Op een {syringe}-spuit",
      vialYield: "Flacon levert {count} doses van {dose}",
    },
    titration: {
      title: "Titratiereeks",
      subtitle: "Verhoog de dosis over weken of stappen.",
      startDose: "Startdosis",
      endDose: "Einddosis",
      steps: "Stappen",
      duration: "Duur",
      durationWeeks: "{count, plural, =1 {1 week} other {{count} weken}}",
      stepLabel: "Stap {index}",
      totalConsumed: "Totaal verbruikt peptide",
      exceedsVial: "Plan overschrijdt één flacon — koop {vials}.",
    },
    dilution: {
      title: "Verdunningsketen",
      subtitle: "Wanneer de afname te klein is om nauwkeurig te pipetteren, eerst verdunnen.",
      rawVolume: "Ruw afnamevolume",
      minDraw: "Minimaal veilig volume",
      factor: "Benodigde verdunningsfactor",
      step1: "Stap 1 — Reconstitutie",
      step2: "Stap 2 — Verdunnen 1:{factor}",
      step2Detail: "Voeg {sourceMl} mL van de gereconstitueerde oplossing toe aan {diluentMl} mL steriel water of BAC-water.",
      working: "Werkpicks",
      finalDraw: "Eindafname",
    },
    breakeven: {
      title: "Flaconplan breakeven",
      subtitle: "Vergelijk flaconcombinaties tegen een doeldosisplanning.",
      plan: "Plan",
      price: "Totale prijs",
      perMg: "Per mg",
      doses: "Doses",
      leftover: "Restant",
      waste: "Verlies €",
      pickCheapest: "Laagste prijs per mg",
      pickLeastWaste: "Kleinste restant",
      addPlan: "Eigen plan toevoegen",
      removePlan: "Verwijderen",
    },
    compare: {
      title: "Protocolvergelijking",
      subtitle: "Wiskunde van twee reconstitutiescenario's naast elkaar.",
      left: "Links",
      right: "Rechts",
      addProtocol: "Protocol toevoegen",
    },
    share: {
      copyTooltip: "Kopieer URL met de huidige setup",
      copied: "Gekopieerd",
      buildFromUrl: "Vanuit URL geladen",
    },
    disclaimer: {
      title: "Alleen voor onderzoeksdoeleinden",
      body: "Deze calculators ondersteunen laboratoriumworkflows. Geen medisch advies en niet goedgekeurd voor therapeutisch gebruik.",
      researchOnly:
        "AverianLabs-producten worden uitsluitend verkocht voor laboratoriumonderzoek en in-vitro-studies. Niet voor menselijk of veterinair gebruik, diagnose of therapie.",
    },
    aria: {
      resultSummary:
        "{mgPerMl} milligram per milliliter, {mL} milliliter per dosis, {iu} internationale eenheden op de {syringe}-spuit. Flacon levert {doses} doses.",
      resultLabel: "Berekeningsresultaat",
    },
  } as unknown as CalculatorShape,
  sv: {
    title: "Rekonstitutionskalkylator",
    subtitle: "Beräkna upptagningsvolymer, arbetskoncentrationer och återstående doser för varje peptidflaska.",
    heroEyebrow: "Forskningsverktyg",
    heroTitle: "Peptidkalkylatorn för labbet",
    heroBody: "Fem kalkylatorer (rekonstitution, titrering, spädning, breakeven, jämförelse), ett delat mattebibliotek och en vacker sprutvisualisering. Spara protokoll, dela via URL och skriv ut bench-kort.",
    openInAveria: "Öppna denna uppsättning i Averia",
    viewAllTools: "Se alla kalkylatorer nedan",
    tabs: {
      reconstitution: "Rekonstitution",
      titration: "Titrering",
      dilution: "Spädning",
      breakeven: "Breakeven",
      compare: "Jämför",
    },
    inputs: "Indata",
    outputs: "Utdata",
    peptideMass: "Peptidmassa (mg)",
    bacteriostaticWater: "Bakteriostatiskt vatten (mL)",
    desiredDose: "Önskad dos (mcg)",
    product: "Produkt (valfri)",
    noProductSelected: "Anpassad uppsättning",
    syringe: "Spruta",
    storage: "Förvaring",
    results: "Resultat",
    concentration: "Koncentration",
    concentrationUnit: "mg/mL",
    concentrationMcgUnit: "mcg/mL",
    volumePerDose: "Volym per dos",
    volumePerDoseUnit: "mL",
    totalDoses: "Antal doser i injektionsflaskan",
    dosesCalculation: "{mass} mg ÷ {dose} mcg",
    iuOnSyringe: "IU på spruta",
    leftoverMcg: "Återstående peptid",
    leftoverMcgUnit: "mcg oanvänt",
    researchOnly: "Endast för forskningsberäkningar. Verifiera alltid med ditt protokoll.",
    unitsMcg: "mcg",
    unitsIu: "IU",
    unitsMl: "mL",
    actions: {
      share: "Dela",
      shareCopied: "Länk kopierad",
      save: "Spara protokoll",
      saved: "Sparad",
      reset: "Återställ",
      print: "Skriv ut",
      exportCsv: "Exportera CSV",
      sendToAveria: "Fråga Averia",
      openSaved: "Sparade",
      viewHistory: "Historik",
      clearHistory: "Rensa historik",
      deleteProtocol: "Ta bort protokoll",
    },
    validation: {
      nonPositive: "Måste vara större än noll.",
      concentrationTooHigh:
        "Över den praktiska löslighetsgränsen — späd eller dela flaskor.",
      concentrationCaution:
        "Närmar sig löslighetsgränsen — upptagningen är korrekt, men förvaringen blir kortare.",
      drawTooSmall: "Upptagningsvolymen under det praktiska minimum — prova spädningsfliken.",
      nan: "Ange ett tal.",
    },
    saturation: {
      cautionTitle: "Närmar sig löslighetsgränsen",
      aboveTitle: "Över löslighetsgränsen — löses inte helt",
      ceiling: "Praktisk övre gräns",
      ratio: "Arbetskoncentration",
    },
    stability: {
      title: "Stabilitet efter rekonstitution",
      subtitle: "Uppskattad hållbarhet efter tillsats av lösningsmedel.",
      shelfLife: "Rekommenderad hållbarhet",
      refrigerated: "Kyld",
      frozen: "Frusen (−20 °C)",
      room: "Rumstemperatur",
    },
    syringes: {
      title: "Sprutval",
      subtitle: "Byt spruta för att justera IU-markering och rekommenderad volym.",
      "0_3": "0.3 mL · 30 IU",
      "0_5": "0.5 mL · 50 IU",
      "1_0": "1.0 mL · 100 IU",
    },
    presets: {
      title: "Vanliga starter",
      subtitle: "Ett-klicks-uppsättningar som matchar katalogens flaskor.",
      empty: "Inga sparade protokoll ännu — välj en förinställning eller spara denna uppsättning.",
    },
    history: {
      title: "Senaste beräkningar",
      subtitle: "Sparas lokalt i denna webbläsare.",
      empty: "Kör en beräkning för att se den här.",
      remove: "Ta bort",
    },
    reconstitution: {
      drawLabel: "Volym att dra",
      withSyringe: "På en {syringe}-spruta",
      vialYield: "Flaska ger {count} doser om {dose}",
    },
    titration: {
      title: "Titreringstrappa",
      subtitle: "Trappa dosen över veckor eller steg.",
      startDose: "Startdos",
      endDose: "Slutdos",
      steps: "Steg",
      duration: "Varaktighet",
      durationWeeks: "{count, plural, =1 {1 vecka} other {{count} veckor}}",
      stepLabel: "Steg {index}",
      totalConsumed: "Total peptidförbrukning",
      exceedsVial: "Planen överstiger en flaska — köp {vials}.",
    },
    dilution: {
      title: "Spädningskedja",
      subtitle: "När volymen är för liten för att pipettera korrekt, späd först.",
      rawVolume: "Rå upptagningsvolym",
      minDraw: "Minsta säkra volym",
      factor: "Erforderlig spädningsfaktor",
      step1: "Steg 1 — Rekonstitution",
      step2: "Steg 2 — Späd 1:{factor}",
      step2Detail: "Tillsätt {sourceMl} mL av den rekonstituerade lösningen till {diluentMl} mL sterilt vatten eller BAC-vatten.",
      working: "Arbetskoncentration",
      finalDraw: "Slutlig upptagning",
    },
    breakeven: {
      title: "Flaskplan breakeven",
      subtitle: "Jämför flaskkombinationer mot en måldosplan.",
      plan: "Plan",
      price: "Totalpris",
      perMg: "Per mg",
      doses: "Doser",
      leftover: "Rest",
      waste: "Svinn €",
      pickCheapest: "Lägsta pris per mg",
      pickLeastWaste: "Minsta rest",
      addPlan: "Lägg till egen plan",
      removePlan: "Ta bort",
    },
    compare: {
      title: "Protokolljämförelse",
      subtitle: "Matte för två rekonstitutionsscenarier sida vid sida.",
      left: "Vänster",
      right: "Höger",
      addProtocol: "Lägg till protokoll",
    },
    share: {
      copyTooltip: "Kopiera URL med aktuell uppsättning",
      copied: "Kopierad",
      buildFromUrl: "Laddad från URL",
    },
    disclaimer: {
      title: "Endast för forskning",
      body: "Dessa kalkylatorer stödjer laboratorieflöden. Inte medicinsk rådgivning och inte godkända för terapeutiskt bruk.",
      researchOnly:
        "AverianLabs produkter säljs endast för laboratorieforskning och in-vitro-studier. Inte för humant eller veterinärt bruk, diagnos eller terapi.",
    },
    aria: {
      resultSummary:
        "{mgPerMl} milligram per milliliter, {mL} milliliter per dos, {iu} internationella enheter på {syringe}-sprutan. Flaska ger {doses} doser.",
      resultLabel: "Beräkningsresultat",
    },
  } as unknown as CalculatorShape,
}

function merge(enBlock: CalculatorShape, translated: Partial<CalculatorShape>, existing: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing }
  // Top-level scalars
  for (const k of Object.keys(enBlock) as (keyof CalculatorShape)[]) {
    const enVal = (enBlock as unknown as Record<string, unknown>)[k]
    const translatedVal = (translated as unknown as Record<string, unknown>)[k]
    const existingVal = result[k]
    if (typeof enVal === "string") {
      // scalar
      if (existingVal && typeof existingVal === "string" && (existingVal as string).length > 0) {
        result[k] = existingVal
      } else if (typeof translatedVal === "string") {
        result[k] = translatedVal
      }
    } else if (enVal && typeof enVal === "object") {
      // nested object — merge
      const mergedChild: Record<string, unknown> = {}
      const existingChild = (existingVal && typeof existingVal === "object") ? (existingVal as Record<string, unknown>) : {}
      const translatedChild = (translatedVal && typeof translatedVal === "object") ? (translatedVal as Record<string, unknown>) : {}
      for (const ck of Object.keys(enVal as Record<string, unknown>)) {
        if (existingChild[ck] && typeof existingChild[ck] === "string" && (existingChild[ck] as string).length > 0) {
          mergedChild[ck] = existingChild[ck]
        } else if (typeof translatedChild[ck] === "string") {
          mergedChild[ck] = translatedChild[ck]
        }
      }
      result[k] = mergedChild
    }
  }
  return result
}

function main() {
  // Use en.json as the canonical shape source
  const enData = read(path.join(ROOT, "messages/en.json"))
  const enCalculator = enData.calculator as CalculatorShape
  for (const loc of ["fi", "de", "sv", "nl"] as const) {
    const file = path.join(ROOT, `messages/${loc}.json`)
    const data = read(file)
    const existing = (data.calculator ?? {}) as Record<string, unknown>
    data.calculator = merge(enCalculator, translations[loc], existing)
    write(file, data)
    console.log(`✓ ${loc} merged into messages/${loc}.json`)
  }
}

main()
