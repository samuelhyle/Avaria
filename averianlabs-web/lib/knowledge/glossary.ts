/**
 * Static research-peptide glossary — locale-aware.
 *
 * Lives in code rather than CMS so the AI indexer, the `/glossary` page, and
 * inline glossary linking all share a single, dependency-free source of truth.
 * Sanity-backed entries (see `lib/glossary/sanity.ts`) extend this for the
 * blog annotation flow; this file is the *minimum demonstration set* the
 * audit called for (12 terms).
 *
 * Categories are normalised:
 *   - analysis    → HPLC, mass spec, endotoxin, LAL, ISO 17025
 *   - sequence    → BAC water, reconstitution, lyophilization
 *   - formulation → (reserved — future expansion)
 *   - storage     → lyophilization (also reused above intentionally)
 *   - regulatory  → EU/mg threshold, EU-GMP, CAS number
 */

import type { Locale } from "@/lib/products/types"

export type GlossaryCategory = "analysis" | "sequence" | "formulation" | "storage" | "regulatory"

export interface GlossaryTranslation {
  term: string
  short: string
  long: string
  relatedSlugs?: string[]
}

export interface GlossaryTerm {
  slug: string
  category: GlossaryCategory
  translations: Record<Locale, GlossaryTranslation>
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "hplc",
    category: "analysis",
    translations: {
      en: {
        term: "HPLC",
        short: "High-Performance Liquid Chromatography — the workhorse purity assay for peptides.",
        long: "Reverse-phase HPLC with UV detection at 214 nm quantifies peptide content against a certified reference standard. It is the primary purity check used by every AverianLabs batch — acceptance threshold ≥ 98 % by peak area.",
      },
      fi: {
        term: "HPLC",
        short: "Korkean suorituskyvyn nestekromatografia — peptidien puhtauden perusmittaus.",
        long: "Käänteisfaasi-HPLC ja UV-detektio 214 nm:ssä kvantifioi peptidipitoisuuden sertifioitua vertailustandardia vasten. Se on jokaisen AverianLabs-erän ensisijainen puhtaustarkistus — hyväksymisraja ≥ 98 % pinta-alasta.",
      },
      de: {
        term: "HPLC",
        short:
          "Hochleistungsflüssigkeitschromatographie — die zentrale Reinheitsprüfung für Peptide.",
        long: "Umkehrphasen-HPLC mit UV-Detektion bei 214 nm quantifiziert den Peptidgehalt gegen einen zertifizierten Referenzstandard. Sie ist die primäre Reinheitsprüfung für jede AverianLabs-Charge — Akzeptanzgrenze ≥ 98 % Peakfläche.",
      },
      sv: {
        term: "HPLC",
        short: "Högpresterande vätskekromatografi — standardmetoden för peptidrenhet.",
        long: "Omvänd fas-HPLC med UV-detektion vid 214 nm kvantifierar peptidinnehållet mot en certifierad referensstandard. Det är den primära renhetskontrollen för varje AverianLabs-batch — acceptanströskel ≥ 98 % av toppytan.",
      },
      nl: {
        term: "HPLC",
        short:
          "High-performance vloeistofchromatografie — de standaard zuiverheidstest voor peptiden.",
        long: "Reverse-phase HPLC met UV-detectie bij 214 nm kwantificeert peptidegehalte tegen een gecertificeerde referentiestandaard. Het is de primaire zuiverheidscontrole voor elke AverianLabs-batch — acceptatiedrempel ≥ 98 % piekoppervlak.",
      },
    },
  },
  {
    slug: "mass-spectrometry",
    category: "analysis",
    translations: {
      en: {
        term: "Mass spectrometry",
        short: "Identity confirmation by mass-to-charge ratio.",
        long: "ESI-MS (or MALDI-TOF) confirms molecular weight matches theoretical within ±1 Da. Every AverianLabs batch is identity-verified by MS before release.",
      },
      fi: {
        term: "Massaspektrometria",
        short: "Identiteetin varmennus massa-varaus-suhteella.",
        long: "ESI-MS (tai MALDI-TOF) vahvistaa molekyylimassan vastaavuuden teoreettiseen arvoon ±1 Da tarkkuudella. Jokainen AverianLabs-erä tunnistetaan MS:llä ennen julkaisua.",
      },
      de: {
        term: "Massenspektrometrie",
        short: "Identitätsbestätigung über Masse-zu-Ladung-Verhältnis.",
        long: "ESI-MS (oder MALDI-TOF) bestätigt, dass die Molekülmasse innerhalb von ±1 Da mit dem theoretischen Wert übereinstimmt. Jede AverianLabs-Charge wird vor der Freigabe MS-identifiziert.",
      },
      sv: {
        term: "Masspektrometri",
        short: "Identitetsbekräftelse via massa-till-laddningsförhållande.",
        long: "ESI-MS (eller MALDI-TOF) bekräftar att molekylvikten stämmer överens med det teoretiska värdet inom ±1 Da. Varje AverianLabs-batch identifieras med MS före frigörande.",
      },
      nl: {
        term: "Massaspectrometrie",
        short: "Identiteitsbevestiging via massa-lading-verhouding.",
        long: "ESI-MS (of MALDI-TOF) bevestigt dat de molecuulmassa binnen ±1 Da overeenkomt met de theoretische waarde. Elke AverianLabs-batch wordt vóór vrijgave met MS geïdentificeerd.",
      },
    },
  },
  {
    slug: "endotoxin",
    category: "analysis",
    translations: {
      en: {
        term: "Endotoxin (EU/mg)",
        short: "Bacterial lipopolysaccharide quantified in endotoxin units per milligram.",
        long: "Endotoxin from gram-negative bacteria is measured via the LAL assay and reported as EU/mg. Research-grade acceptance is < 5 EU/mg; lower endotoxin is critical for cell-culture work.",
        relatedSlugs: ["lal-assay"],
      },
      fi: {
        term: "Endotoksiini (EU/mg)",
        short: "Gram-negatiivisten bakteerien lipopolysakkaridi, yksikkö EU/mg.",
        long: "Gram-negatiivisten bakteerien endotoksiini mitataan LAL-menetelmällä ja ilmoitetaan EU/mg. Tutkimuslaatuisen peptidin hyväksymisraja on < 5 EU/mg; matalampi pitoisuus on kriittinen soluviljelytöissä.",
        relatedSlugs: ["lal-assay"],
      },
      de: {
        term: "Endotoxin (EU/mg)",
        short:
          "Bakterielles Lipopolysaccharid, quantifiziert in Endotoxin-Einheiten pro Milligramm.",
        long: "Endotoxin aus gramnegativen Bakterien wird per LAL-Test gemessen und in EU/mg angegeben. Die Akzeptanzgrenze für Forschungsqualität liegt bei < 5 EU/mg; niedrigere Werte sind für Zellkulturarbeiten entscheidend.",
        relatedSlugs: ["lal-assay"],
      },
      sv: {
        term: "Endotoxin (EU/mg)",
        short: "Bakteriellt lipopolysackarid, kvantifierat i endotoxin-enheter per milligram.",
        long: "Endotoxin från gramnegativa bakterier mäts med LAL-assay och rapporteras som EU/mg. Acceptansgränsen för forskningskvalitet är < 5 EU/mg; lägre värden är avgörande för cellodlingsarbete.",
        relatedSlugs: ["lal-assay"],
      },
      nl: {
        term: "Endotoxine (EU/mg)",
        short:
          "Bacterieel lipopolysaccharide, gekwantificeerd in endotoxine-eenheden per milligram.",
        long: "Endotoxine uit gramnegatieve bacteriën wordt gemeten via de LAL-test en gerapporteerd als EU/mg. De acceptatiedrempel voor onderzoekskwaliteit is < 5 EU/mg; lagere waarden zijn cruciaal voor celkweekwerk.",
        relatedSlugs: ["lal-assay"],
      },
    },
  },
  {
    slug: "lal-assay",
    category: "analysis",
    translations: {
      en: {
        term: "LAL assay",
        short: "Limulus amebocyte lysate — FDA-recognised endotoxin quantitation method.",
        long: "LAL reagent clots in the presence of bacterial endotoxin. The kinetic chromogenic variant is the most sensitive and is used for every AverianLabs batch above 1 mg.",
        relatedSlugs: ["endotoxin"],
      },
      fi: {
        term: "LAL-määritys",
        short:
          "Limulus-amebosyyttilysaatti — FDA:n hyväksymä endotoksiinin kvantifiointimenetelmä.",
        long: "LAL-reagenssi hyytyy bakteeriperäisen endotoksiinin läsnä ollessa. Kineettinen kromogeeninen variantti on herkin ja sitä käytetään jokaiselle yli 1 mg:n AverianLabs-erälle.",
        relatedSlugs: ["endotoxin"],
      },
      de: {
        term: "LAL-Test",
        short: "Limulus-Amöbozyten-Lysat — FDA-anerkannte Endotoxin-Quantifizierungsmethode.",
        long: "LAL-Reagenz gerinnt in Gegenwart von bakteriellem Endotoxin. Die kinetisch-chromogene Variante ist die empfindlichste und wird für jede AverianLabs-Charge über 1 mg eingesetzt.",
        relatedSlugs: ["endotoxin"],
      },
      sv: {
        term: "LAL-assay",
        short: "Limulus amebocyt-lysat — FDA-godkänd metod för endotoxin-kvantifiering.",
        long: "LAL-reagens koagulerar i närvaro av bakteriellt endotoxin. Den kinetiska kromogena varianten är mest känslig och används för varje AverianLabs-batch över 1 mg.",
        relatedSlugs: ["endotoxin"],
      },
      nl: {
        term: "LAL-test",
        short: "Limulus-amoebocyten-lysaat — FDA-erkende endotoxine-kwantificeringsmethode.",
        long: "LAL-reagens stolt in aanwezigheid van bacterieel endotoxine. De kinetisch-chromogene variant is het meest gevoelig en wordt gebruikt voor elke AverianLabs-batch boven 1 mg.",
        relatedSlugs: ["endotoxin"],
      },
    },
  },
  {
    slug: "iso-17025",
    category: "regulatory",
    translations: {
      en: {
        term: "ISO 17025",
        short: "International standard for testing-lab competence.",
        long: "ISO/IEC 17025 specifies the general requirements for the competence of testing and calibration laboratories. Every AverianLabs batch is re-tested by an ISO 17025-accredited third-party lab in DE, FI or NL before release.",
      },
      fi: {
        term: "ISO 17025",
        short: "Kansainvälinen standardi testauslaboratoriojen pätevyydelle.",
        long: "ISO/IEC 17025 määrittelee testaus- ja kalibrointilaboratorioiden pätevyyden yleiset vaatimukset. Jokainen AverianLabs-erä testautetaan uudelleen ISO 17025 -akkreditoidussa kolmannen osapuolen laboratoriossa DE:ssä, FI:ssä tai NL:ssä ennen julkaisua.",
      },
      de: {
        term: "ISO 17025",
        short: "Internationale Norm für die Kompetenz von Prüflaboratorien.",
        long: "ISO/IEC 17025 legt die allgemeinen Anforderungen an die Kompetenz von Prüf- und Kalibrierlaboratorien fest. Jede AverianLabs-Charge wird vor der Freigabe von einem ISO-17025-akkreditierten Drittlabor in DE, FI oder NL erneut geprüft.",
      },
      sv: {
        term: "ISO 17025",
        short: "Internationell standard för testlaboratoriers kompetens.",
        long: "ISO/IEC 17025 specificerar de allmänna kraven på kompetens för test- och kalibreringslaboratorier. Varje AverianLabs-batch testas på nytt av ett ISO 17025-ackrediterat tredjepartslaboratorium i DE, FI eller NL före frigörande.",
      },
      nl: {
        term: "ISO 17025",
        short: "Internationale norm voor competentie van testlaboratoria.",
        long: "ISO/IEC 17025 specificeert de algemene eisen voor de competentie van test- en kalibratielaboratoria. Elke AverianLabs-batch wordt vóór vrijgave opnieuw getest door een ISO 17025-geaccrediteerd derde partij-laboratorium in DE, FI of NL.",
      },
    },
  },
  {
    slug: "eu-gmp",
    category: "regulatory",
    translations: {
      en: {
        term: "EU-GMP",
        short: "European Union Good Manufacturing Practice for medicinal products.",
        long: "EU-GMP is the body of standards governing the manufacture of medicinal products in the EU. AverianLabs vendors are audited on-site annually against EU-GMP guidelines; research-use peptides are sold strictly outside human-therapeutic channels.",
      },
      fi: {
        term: "EU-GMP",
        short: "Euroopan unionin hyvät tuotantotavat lääkevalmisteille.",
        long: "EU-GMP on lääkevalmisteiden valmistusta EU:ssa säätelevä standardikokonaisuus. AverianLabs-toimittajat auditoidaan vuosittain paikan päällä EU-GMP-ohjeistoa vastaan; tutkimuskäyttöön tarkoitetut peptidit myydään ehdottomasti ihmis-terapeuttisten kanavien ulkopuolella.",
      },
      de: {
        term: "EU-GMP",
        short: "EU-Gute-Herstellungspraxis für Arzneimittel.",
        long: "EU-GMP ist das Regelwerk für die Herstellung von Arzneimitteln in der EU. AverianLabs-Lieferanten werden jährlich vor Ort gegen EU-GMP-Leitlinien auditiert; Forschungspeptide werden strikt außerhalb humantherapeutischer Kanäle verkauft.",
      },
      sv: {
        term: "EU-GMP",
        short: "EU:s goda tillverkningssed för läkemedel.",
        long: "EU-GMP är regelverket som styr tillverkning av läkemedel i EU. AverianLabs-leverantörer granskas årligen på plats mot EU-GMP-riktlinjer; peptider för forskningsbruk säljs strikt utanför humana terapeutiska kanaler.",
      },
      nl: {
        term: "EU-GMP",
        short: "Europese Good Manufacturing Practice voor geneesmiddelen.",
        long: "EU-GMP is het normenstelsel voor de fabricage van geneesmiddelen in de EU. AverianLabs-leveranciers worden jaarlijks ter plaatse geauditeerd tegen EU-GMP-richtlijnen; onderzoekspeptiden worden strikt buiten humane therapeutische kanalen verkocht.",
      },
    },
  },
  {
    slug: "lyophilization",
    category: "storage",
    translations: {
      en: {
        term: "Lyophilization",
        short: "Freeze-drying — converting peptide solutions into stable powder.",
        long: "Lyophilized peptides are stable at -20 °C for 24+ months. We ship every peptide lyophilized unless the customer explicitly orders a pre-reconstituted vial.",
        relatedSlugs: ["reconstitution"],
      },
      fi: {
        term: "Lyofilisointi",
        short: "Pakastekuivaus — peptidiliuosten muuntaminen stabiiliksi jauheeksi.",
        long: "Lyofilisoidut peptidit säilyvät -20 °C:ssa vähintään 24 kuukautta. Toimitamme jokaisen peptidin lyofilisoituna, ellei asiakas tilaa nimenomaisesti esiliuotettua pulloa.",
        relatedSlugs: ["reconstitution"],
      },
      de: {
        term: "Lyophilisation",
        short: "Gefriertrocknung — Umwandlung von Peptidlösungen in stabiles Pulver.",
        long: "Lyophilisierte Peptide sind bei -20 °C 24+ Monate stabil. Wir versenden jedes Peptid lyophilisiert, sofern der Kunde nicht ausdrücklich ein zuvor rekonstituiertes Vial bestellt.",
        relatedSlugs: ["reconstitution"],
      },
      sv: {
        term: "Lyofilisering",
        short: "Frystorkning — omvandling av peptidlösningar till stabilt pulver.",
        long: "Lyofiliserade peptider är stabila vid -20 °C i 24+ månader. Vi levererar alla peptider lyofiliserade om inte kunden uttryckligen beställer en förberedd vial.",
        relatedSlugs: ["reconstitution"],
      },
      nl: {
        term: "Lyofilisatie",
        short: "Vriesdrogen — omzetting van peptideoplossingen in stabiel poeder.",
        long: "Gelyofiliseerde peptiden zijn stabiel bij -20 °C gedurende 24+ maanden. Wij verzenden elke peptide gelyofiliseerd, tenzij de klant expliciet een vooraf gereconstitueerde vial bestelt.",
        relatedSlugs: ["reconstitution"],
      },
    },
  },
  {
    slug: "reconstitution",
    category: "formulation",
    translations: {
      en: {
        term: "Reconstitution",
        short: "Dissolving a lyophilized peptide in sterile diluent before use.",
        long: "Standard practice is to reconstitute in sterile bacteriostatic water (0.9 % benzyl alcohol) for a 1 mg/mL stock. Use the reconstitution calculator to dial in your target concentration.",
        relatedSlugs: ["lyophilization", "bac-water"],
      },
      fi: {
        term: "Liuotus",
        short: "Lyofilisoidun peptidin liuottaminen steriiliin liuottimeen ennen käyttöä.",
        long: "Vakiokäytäntö on liuottaa steriiliin bakteriostaattiseen veteen (0,9 % bentsyylialkoholi) 1 mg/mL kantaliuokseksi. Käytä liuotuslaskuria halutun pitoisuuden säätämiseen.",
        relatedSlugs: ["lyophilization", "bac-water"],
      },
      de: {
        term: "Rekonstitution",
        short:
          "Auflösen eines lyophilisierten Peptids in sterilem Lösungsmittel vor der Verwendung.",
        long: "Standardpraxis ist die Rekonstitution in sterilem bakteriostatischem Wasser (0,9 % Benzylalkohol) für eine 1 mg/mL-Stammlösung. Verwenden Sie den Rekonstitutionsrechner, um die Zielkonzentration exakt einzustellen.",
        relatedSlugs: ["lyophilization", "bac-water"],
      },
      sv: {
        term: "Rekonstitution",
        short: "Upplösning av ett lyofiliserat peptid i sterilt lösningsmedel före användning.",
        long: "Standardpraxis är att rekonstituera i sterilt bakteriostatiskt vatten (0,9 % bensylalkohol) för en 1 mg/mL-stamlösning. Använd rekonstitutionskalkylatorn för att ställa in målkoncentrationen exakt.",
        relatedSlugs: ["lyophilization", "bac-water"],
      },
      nl: {
        term: "Reconstitutie",
        short: "Oplossen van een gelyofiliseerd peptide in steriel oplosmiddel vóór gebruik.",
        long: "Standaardpraktijk is reconstitutie in steriel bacteriostatisch water (0,9 % benzylalcohol) voor een 1 mg/mL-voorraadoplossing. Gebruik de reconstitutiecalculator om de doelconcentratie exact in te stellen.",
        relatedSlugs: ["lyophilization", "bac-water"],
      },
    },
  },
  {
    slug: "bac-water",
    category: "sequence",
    translations: {
      en: {
        term: "BAC water",
        short: "Bacteriostatic water for injection — 0.9 % benzyl alcohol diluent.",
        long: "Sterile 10 mL BAC water vials are sold alongside peptides for reconstitution. The 0.9 % benzyl alcohol bacteriostat allows multi-dose handling for up to 28 days once opened.",
        relatedSlugs: ["reconstitution"],
      },
      fi: {
        term: "BAC-vesi",
        short: "Bakteriostaattinen injektiovesi — 0,9 % bentsyylialkoholi-liuotin.",
        long: "Steriilejä 10 mL:n BAC-vesipulloja myydään peptidien ohessa liuotukseen. 0,9 % bentsyylialkoholin bakteriostaatti mahdollistaa moniannoshoidon enintään 28 päivän ajan avaamisen jälkeen.",
        relatedSlugs: ["reconstitution"],
      },
      de: {
        term: "BAC-Wasser",
        short: "Bakteriostatisches Wasser zur Injektion — 0,9 % Benzylalkohol-Lösungsmittel.",
        long: "Sterile 10-mL-BAC-Wasservials werden zusammen mit Peptiden zur Rekonstitution verkauft. Das Bakteriostatikum mit 0,9 % Benzylalkohol ermöglicht die Mehrfachentnahme über bis zu 28 Tage nach Anbruch.",
        relatedSlugs: ["reconstitution"],
      },
      sv: {
        term: "BAC-vatten",
        short: "Bakteriostatiskt vatten för injektion — 0,9 % bensylalkohol-lösningsmedel.",
        long: "Sterila 10 mL BAC-vattenvials säljs tillsammans med peptider för rekonstitution. Den 0,9 % bensylalkohol-bakteriostaten möjliggör flerdoshantering i upp till 28 dagar efter öppning.",
        relatedSlugs: ["reconstitution"],
      },
      nl: {
        term: "BAC-water",
        short: "Bacteriostatisch water voor injectie — 0,9 % benzylalcohol-oplosmiddel.",
        long: "Steriele 10 mL BAC-watervials worden samen met peptiden voor reconstitutie verkocht. De 0,9 % benzylalcohol-bacteriostat maakt meerdere doseringen mogelijk tot 28 dagen na opening.",
        relatedSlugs: ["reconstitution"],
      },
    },
  },
  {
    slug: "cas-number",
    category: "regulatory",
    translations: {
      en: {
        term: "CAS number",
        short: "Chemical Abstracts Service registry identifier for a chemical substance.",
        long: "Every distinct chemical substance is assigned a unique CAS number by the American Chemical Society. CAS numbers are the canonical cross-database reference for peptide identity — never rely on a synonym.",
      },
      fi: {
        term: "CAS-numero",
        short: "Chemical Abstracts Service -rekisteritunniste kemialliselle aineelle.",
        long: "Jokaiselle kemialliselle aineelle annetaan yksilöllinen CAS-numero American Chemical Society -järjestön toimesta. CAS-numerot ovat peptidi-identiteetin kanoninen ristiviittaus tietokantojen välillä — älä koskaan luota synonyymiin.",
      },
      de: {
        term: "CAS-Nummer",
        short: "Chemical Abstracts Service-Registrierungskennung für eine chemische Substanz.",
        long: "Jeder chemischen Substanz wird von der American Chemical Society eine eindeutige CAS-Nummer zugewiesen. CAS-Nummern sind die kanonische datenbankübergreifende Referenz für Peptididentität — verlassen Sie sich niemals auf ein Synonym.",
      },
      sv: {
        term: "CAS-nummer",
        short: "Chemical Abstracts Service-registreringsidentifierare för en kemisk substans.",
        long: "Varje distinkt kemisk substans tilldelas ett unikt CAS-nummer av American Chemical Society. CAS-nummer är den kanoniska korsdatabasreferensen för peptididentitet — lita aldrig på en synonym.",
      },
      nl: {
        term: "CAS-nummer",
        short:
          "Chemical Abstracts Service-registratie-identificatie voor een chemische substantie.",
        long: "Elke chemische substantie krijgt een uniek CAS-nummer van de American Chemical Society. CAS-nummers zijn de canonieke kruisdatabase-referentie voor peptide-identiteit — vertrouw nooit op een synoniem.",
      },
    },
  },
  {
    slug: "storage",
    category: "storage",
    translations: {
      en: {
        term: "Storage",
        short: "Lyophilized peptide storage temperature and shelf life.",
        long: "Lyophilized peptides are stored at -20 °C (long-term) or 4 °C (short-term, ≤ 6 months). Reconstituted peptides are stable 2–4 weeks at 4 °C depending on sequence. Always protect from light and moisture.",
      },
      fi: {
        term: "Säilytys",
        short: "Lyofilisoidun peptidin säilytyslämpötila ja säilyvyysaika.",
        long: "Lyofilioituja peptidejä säilytetään -20 °C:ssa (pitkäaikainen) tai 4 °C:ssa (lyhytaikainen, ≤ 6 kk). Liuotetut peptidit säilyvät 2–4 viikkoa 4 °C:ssa sekvenssistä riippuen. Suojaa aina valolta ja kosteudelta.",
      },
      de: {
        term: "Lagerung",
        short: "Lagertemperatur und Haltbarkeit lyophilisierter Peptide.",
        long: "Lyophilisierte Peptide werden bei -20 °C (langfristig) oder 4 °C (kurzfristig, ≤ 6 Monate) gelagert. Rekonstituierte Peptide sind je nach Sequenz 2–4 Wochen bei 4 °C stabil. Immer vor Licht und Feuchtigkeit schützen.",
      },
      sv: {
        term: "Förvaring",
        short: "Förvaringstemperatur och hållbarhet för lyofiliserade peptider.",
        long: "Lyofiliserade peptider förvaras vid -20 °C (långsiktigt) eller 4 °C (kortsiktigt, ≤ 6 månader). Rekonstituerade peptider är stabila 2–4 veckor vid 4 °C beroende på sekvens. Skydda alltid från ljus och fukt.",
      },
      nl: {
        term: "Opslag",
        short: "Bewaartemperatuur en houdbaarheid van gelyofiliseerde peptiden.",
        long: "Gelyofiliseerde peptiden worden bewaard bij -20 °C (langetermijn) of 4 °C (kortetermijn, ≤ 6 maanden). Gereconstitueerde peptiden zijn 2–4 weken stabiel bij 4 °C afhankelijk van de sequentie. Altijd beschermen tegen licht en vocht.",
      },
    },
  },
  {
    slug: "purity",
    category: "analysis",
    translations: {
      en: {
        term: "Purity",
        short: "Percentage of target peptide by HPLC peak area.",
        long: "Purity is reported as HPLC peak area percent. The AverianLabs minimum spec is 98 % for research-grade peptides; ≥ 99 % is achievable for most sequences. Below 95 % is rejected at intake.",
        relatedSlugs: ["hplc"],
      },
      fi: {
        term: "Puhtaus",
        short: "Kohdepeptidin prosenttiosuus HPLC-pinta-alasta.",
        long: "Puhtaus ilmoitetaan HPLC-pinta-alaprosenttina. AverianLabs-minimivaatimus on 98 % tutkimuslaatuisille peptideille; ≥ 99 % on saavutettavissa useimmille sekvensseille. Alle 95 % hylätään vastaanotossa.",
        relatedSlugs: ["hplc"],
      },
      de: {
        term: "Reinheit",
        short: "Anteil des Zielpeptids nach HPLC-Peakfläche.",
        long: "Die Reinheit wird als HPLC-Peakflächenprozent angegeben. Die AverianLabs-Mindestspezifikation beträgt 98 % für Forschungsqualität; ≥ 99 % ist für die meisten Sequenzen erreichbar. Unter 95 % wird bei der Annahme abgelehnt.",
        relatedSlugs: ["hplc"],
      },
      sv: {
        term: "Renhet",
        short: "Andel målpeptid enligt HPLC-toppyta.",
        long: "Renhet rapporteras som HPLC-toppytans procentandel. AverianLabs minsta specifikation är 98 % för peptider av forskningskvalitet; ≥ 99 % är uppnåeligt för de flesta sekvenser. Under 95 % avvisas vid mottagningen.",
        relatedSlugs: ["hplc"],
      },
      nl: {
        term: "Zuiverheid",
        short: "Percentage doelpeptide volgens HPLC-piekoppervlak.",
        long: "Zuiverheid wordt gerapporteerd als HPLC-piekoppervlaktepercentage. De AverianLabs-minimumspecificatie is 98 % voor peptiden van onderzoekskwaliteit; ≥ 99 % is haalbaar voor de meeste sequenties. Onder 95 % wordt bij ontvangst afgewezen.",
        relatedSlugs: ["hplc"],
      },
    },
  },
]

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "analysis",
  "sequence",
  "formulation",
  "storage",
  "regulatory",
]
