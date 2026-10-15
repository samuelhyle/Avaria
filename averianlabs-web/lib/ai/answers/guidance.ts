/** Reviewed site guidance. These explanations are not product/batch evidence. */
export const GUIDANCE_TOPICS = [
  "nominal_content",
  "hplc_area_purity",
  "dilution_limit",
  "final_volume",
  "batch_evidence",
  "molar_conversion",
  "participation",
  "community_review",
  "memory",
  "assistant_availability",
] as const
export type GuidanceTopic = (typeof GUIDANCE_TOPICS)[number]
const guidance: Record<GuidanceTopic, { path: string; en: string; fi: string }> = {
  nominal_content: {
    path: "lab-tests",
    en: "A nominal quantity, such as 5 mg, is a declared catalogue or label quantity. It does not by itself establish the measured mass of peptide. Quantitative content needs an appropriate analytical measurement with its method, result, unit and sample scope. HPLC area purity alone does not provide that measurement. Do not assume how the material was filled or what an unprovided report contains.",
    fi: "Nimellismäärä, esimerkiksi 5 mg, on tuoteluettelossa tai merkinnässä ilmoitettu määrä. Se ei yksin osoita peptidin mitattua massaa. Sisällön määritys edellyttää asianmukaista kvantitatiivista mittausta sekä tietoa menetelmästä, tuloksesta, yksiköstä ja tutkitusta näytteestä. Pelkkä HPLC:n pinta-alapuhtaus ei ole tällainen mittaus. Täyttömenetelmää tai puuttuvan raportin sisältöä ei pidä olettaa.",
  },
  hplc_area_purity: {
    path: "lab-tests",
    en: "HPLC area purity describes the relative areas of integrated chromatographic peaks under the reported method. It does not by itself establish the mass of peptide in a vial. A quantitative content assay is a different measurement and must be assessed with its calibration, method and sample scope. Inspect the original report rather than converting an area percentage into material mass.",
    fi: "HPLC:n pinta-alapuhtaus kuvaa integroitujen kromatografisten piikkien suhteellisia pinta-aloja raportoidulla menetelmällä. Se ei yksin osoita näytepullon sisältämän peptidin massaa. Sisällön kvantitatiivinen määritys on eri mittaus, jota arvioidaan kalibroinnin, menetelmän ja tutkitun näytteen perusteella. Tarkista alkuperäinen raportti; pinta-alaprosenttia ei pidä muuntaa suoraan materiaalin massaksi.",
  },
  dilution_limit: {
    path: "peptide-calculator",
    en: "Adding solvent alone cannot increase concentration. The ideal mass balance is c₁V₁ = c₂V₂. If c₂ > c₁, the equation gives a positive V₂ smaller than V₁; that result cannot be achieved by adding solvent. Dilution by solvent addition requires V₂ ≥ V₁ and c₂ ≤ c₁. These equations do not establish a preparation method, solubility or stability.",
    fi: "Pelkkä liuottimen lisääminen ei voi kasvattaa pitoisuutta. Laskennallinen massatase on c₁V₁ = c₂V₂. Kun c₂ > c₁, yhtälöstä saadaan positiivinen V₂, joka on pienempi kuin V₁. Tällaista lopputilavuutta ei voida saavuttaa lisäämällä liuotinta. Liuottimen lisäämiseen perustuvassa laimennuksessa V₂ ≥ V₁ ja c₂ ≤ c₁. Yhtälöt eivät määritä valmistusmenetelmää, liukoisuutta tai stabiiliutta.",
  },
  final_volume: {
    path: "peptide-calculator",
    en: "Mass concentration is the material mass divided by the final solution volume: c = m/V. Added solvent volume and final solution volume are different quantities. The calculator needs the final solution volume; it does not infer it from a preparation procedure. The ideal dilution make-up volume also assumes additive volumes. Actual preparation requires an approved research method.",
    fi: "Massapitoisuus on materiaalin massa jaettuna liuoksen lopullisella tilavuudella: c = m/V. Lisätyn liuottimen tilavuus ja liuoksen lopullinen tilavuus ovat eri suureita. Laskuri tarvitsee lopullisen liuostilavuuden eikä päättele sitä valmistusmenetelmästä. Laimennuksen laskennallinen täydennystilavuus olettaa lisäksi tilavuuksien summautuvan. Valmistuksessa on noudatettava hyväksyttyä tutkimusmenetelmää.",
  },
  batch_evidence: {
    path: "quality",
    en: "A report supports only the samples, methods, results and scope it actually describes. A report for a different batch does not establish results for the requested batch. Check the exact SKU and batch association in the original document. A report may cover several variants only when its scope and associations establish that. Do not assume that every vial was individually tested, that all tests passed, or that an unavailable report contains a particular result.",
    fi: "Raportti tukee vain siinä kuvattuja näytteitä, menetelmiä, tuloksia ja soveltamisalaa. Toisen erän raportti ei vahvista pyydetyn erän tuloksia. Tarkista alkuperäisestä asiakirjasta tarkka tuotekoodi ja eräyhteys. Raportti voi kattaa useita tuoteversioita vain, jos sen soveltamisala ja tuotekytkennät osoittavat tämän. Älä oleta, että jokainen pullo olisi testattu erikseen, kaikki testit olisi läpäisty tai puuttuva raportti sisältäisi tietyn tuloksen.",
  },
  molar_conversion: {
    path: "research-tools",
    en: "Molar conversion is not currently implemented in this calculator. An unspecified peptide blend cannot be assigned a molar concentration without the chemical forms, component composition, appropriate molar masses, quantities and final solution volume. A generic weighted average is insufficient. Use the existing mass-concentration tools only for quantities and units you can establish; original product records are required before adding product-based molar conversion.",
    fi: "Ainemääräpitoisuuden laskenta ei ole tällä hetkellä käytössä tässä laskurissa. Määrittelemättömän peptidiseoksen ainemääräpitoisuutta ei voida määrittää ilman kemiallisia muotoja, aineosien koostumusta, asianmukaisia moolimassoja, määriä ja lopullista liuostilavuutta. Yleinen painotettu keskiarvo ei riitä. Käytä nykyisiä massapitoisuustyökaluja vain määrillä ja yksiköillä, jotka voit osoittaa. Tuotekohtaisen ainemääräpitoisuuden lisääminen edellyttää alkuperäisiä tuotetietoja.",
  },
  participation: {
    path: "community",
    en: "Community participation points reflect received reactions. They do not verify a member's scientific qualifications. This site has no researcher-credential certification workflow. Assess scientific claims using their original sources; a participation level or reaction is not scientific approval.",
    fi: "Yhteisön osallistumispisteet perustuvat saatuihin reaktioihin. Ne eivät vahvista jäsenen tieteellistä pätevyyttä. Sivustolla ei ole tutkijan pätevyyden varmentavaa menettelyä. Arvioi tieteelliset väitteet alkuperäisten lähteiden perusteella; osallistumistaso tai reaktio ei ole tieteellinen hyväksyntä.",
  },
  community_review: {
    path: "community/rules",
    en: "New posts and replies remain private until a human moderator decides to publish them. An AI moderation suggestion neither publishes a post nor certifies scientific correctness. Preparing or saving a community draft is a separate action and does not submit it for publication. Published community content remains attributed discussion, not approved product evidence.",
    fi: "Uudet viestit ja vastaukset pysyvät yksityisinä, kunnes moderaattori päättää niiden julkaisemisesta. Tekoälyn moderointiehdotus ei julkaise viestiä eikä vahvista tieteellistä oikeellisuutta. Yhteisöluonnoksen valmistelu tai tallentaminen on erillinen toiminto eikä lähetä sitä julkaistavaksi. Julkaistu yhteisösisältö on kirjoittajalle kuuluvaa keskustelua, ei hyväksyttyä tuotenäyttöä.",
  },
  memory: {
    path: "legal/privacy",
    en: "Asking a question does not save a preference. Saving a preference requires your explicit confirmation. Conversation history is separate: saving conversations requires its own consent setting. Without that consent, or when no-persistence mode is requested, the chat does not create or append saved conversation history. Support requests and community submissions are separate actions with their own recorded data.",
    fi: "Kysymyksen esittäminen ei tallenna asetusta. Asetuksen tallentaminen edellyttää nimenomaista vahvistustasi. Keskusteluhistoria on erillinen asia: keskustelujen tallentaminen edellyttää omaa suostumusvalintaansa. Ilman tätä suostumusta tai tallentamattomassa tilassa keskustelu ei luo eikä täydennä tallennettua keskusteluhistoriaa. Tukipyynnöt ja yhteisöviestit ovat erillisiä toimintoja, joiden tiedot tallennetaan erikseen.",
  },
  assistant_availability: {
    path: "assistant",
    en: "The assistant label describes its role. It is a static label, not a provider heartbeat or health check, and does not prove current availability. A completed response establishes that the service responded to that request. An error or interrupted response needs a retry; the catalogue and calculator can still be used separately.",
    fi: "Avustajan otsikko kuvaa sen tehtävää. Se on staattinen teksti eikä palveluntarjoajan tilatarkistus, joten se ei todista tämänhetkistä käytettävyyttä. Valmis vastaus osoittaa, että palvelu vastasi kyseiseen pyyntöön. Virhe tai keskeytynyt vastaus edellyttää uutta yritystä. Tuoteluetteloa ja laskuria voi käyttää erikseen.",
  },
}
export function researchGuidance(topic: GuidanceTopic, locale: string) {
  const entry = guidance[topic]
  return {
    topic,
    text: locale === "fi" ? entry.fi : entry.en,
    url: `/${locale}/${entry.path}`,
    scope: "site_guidance_not_product_evidence",
    version: "site-guidance-2026-10-15",
  }
}
export function renderGuidanceAnswer(
  trace: Array<{ name: string; result?: unknown }>,
  locale: string,
) {
  const compatible = new Set([
    "getResearchGuidance",
    "getProduct",
    "getDocuments",
    "getBatches",
    "searchProducts",
    "compareProducts",
    "calculateLaboratory",
    "getReconstitution",
  ])
  if (trace.some((item) => !compatible.has(item.name))) return null
  const topics = new Set<GuidanceTopic>()
  for (const item of trace) {
    if (item.name !== "getResearchGuidance") continue
    const topic = (item.result as { topic?: unknown } | undefined)?.topic
    if (GUIDANCE_TOPICS.includes(topic as GuidanceTopic)) topics.add(topic as GuidanceTopic)
  }
  if (!topics.size) return null
  return [...topics]
    .map((topic) => {
      const result = researchGuidance(topic, locale)
      return `${result.text}\n\n[${locale === "fi" ? "Ohje ja rajaukset" : "Guidance and scope"}](${result.url})`
    })
    .join("\n\n")
}
