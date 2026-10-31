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
const GUIDANCE_LOCALES = ["en", "fi", "sv", "ru"] as const
type GuidanceLocale = (typeof GUIDANCE_LOCALES)[number]
type GuidanceEntry = { path: string } & Record<GuidanceLocale, string>
const guidance: Record<GuidanceTopic, GuidanceEntry> = {
  nominal_content: {
    path: "lab-tests",
    en: "A nominal quantity, such as 5 mg, is a declared catalogue or label quantity. It does not by itself establish the measured mass of peptide. Quantitative content needs an appropriate analytical measurement with its method, result, unit and sample scope. HPLC area purity alone does not provide that measurement. Do not assume how the material was filled or what an unprovided report contains.",
    fi: "Nimellismäärä, esimerkiksi 5 mg, on tuoteluettelossa tai merkinnässä ilmoitettu määrä. Se ei yksin osoita peptidin mitattua massaa. Sisällön määritys edellyttää asianmukaista kvantitatiivista mittausta sekä tietoa menetelmästä, tuloksesta, yksiköstä ja tutkitusta näytteestä. Pelkkä HPLC:n pinta-alapuhtaus ei ole tällainen mittaus. Täyttömenetelmää tai puuttuvan raportin sisältöä ei pidä olettaa.",
    sv: "En nominell mängd, till exempel 5 mg, är en angiven katalog- eller etikettmängd. Den fastställer inte i sig peptidens uppmätta massa. Kvantitativt innehåll kräver en lämplig analytisk mätning med sin metod, sitt resultat, sin enhet och sitt provomfång. HPLC-arearenhet ensam utgör inte någon sådan mätning. Antag inte hur materialet har fyllts eller vad en rapport som inte tillhandahålls innehåller.",
    ru: "Номинальное количество, например 5 mg, — это заявленное количество по каталогу или этикетке. Само по себе оно не подтверждает измеренную массу пептида. Для количественного содержания необходимо подходящее аналитическое измерение с его методом, результатом, единицей измерения и охватом образцов. Площадная чистота по HPLC сама по себе не является таким измерением. Не предполагайте, как был наполнен материал и что содержит отчёт, который не был предоставлен.",
  },
  hplc_area_purity: {
    path: "lab-tests",
    en: "HPLC area purity describes the relative areas of integrated chromatographic peaks under the reported method. It does not by itself establish the mass of peptide in a vial. A quantitative content assay is a different measurement and must be assessed with its calibration, method and sample scope. Inspect the original report rather than converting an area percentage into material mass.",
    fi: "HPLC:n pinta-alapuhtaus kuvaa integroitujen kromatografisten piikkien suhteellisia pinta-aloja raportoidulla menetelmällä. Se ei yksin osoita näytepullon sisältämän peptidin massaa. Sisällön kvantitatiivinen määritys on eri mittaus, jota arvioidaan kalibroinnin, menetelmän ja tutkitun näytteen perusteella. Tarkista alkuperäinen raportti; pinta-alaprosenttia ei pidä muuntaa suoraan materiaalin massaksi.",
    sv: "HPLC-arearenhet beskriver de relativa areaerna hos integrerade kromatografiska toppar enligt den rapporterade metoden. Den fastställer inte i sig peptidens massa i en flaska. En kvantitativ innehållsanalys är en annan mätning och måste bedömas med sin kalibrering, metod och provomfång. Granska originalrapporten i stället för att omvandla en areaprocent till materialmassa.",
    ru: "Площадная чистота по HPLC описывает относительные площади интегрированных хроматографических пиков при указанном в отчёте методе. Сама по себе она не подтверждает массу пептида во флаконе. Количественное определение содержания — это другое измерение, и его следует оценивать с учётом его калибровки, метода и охвата образцов. Изучите исходный отчёт вместо того, чтобы переводить площадь в процентах в массу материала.",
  },
  dilution_limit: {
    path: "peptide-calculator",
    en: "Adding solvent alone cannot increase concentration. The ideal mass balance is c₁V₁ = c₂V₂. If c₂ > c₁, the equation gives a positive V₂ smaller than V₁; that result cannot be achieved by adding solvent. Dilution by solvent addition requires V₂ ≥ V₁ and c₂ ≤ c₁. These equations do not establish a preparation method, solubility or stability.",
    fi: "Pelkkä liuottimen lisääminen ei voi kasvattaa pitoisuutta. Laskennallinen massatase on c₁V₁ = c₂V₂. Kun c₂ > c₁, yhtälöstä saadaan positiivinen V₂, joka on pienempi kuin V₁. Tällaista lopputilavuutta ei voida saavuttaa lisäämällä liuotinta. Liuottimen lisäämiseen perustuvassa laimennuksessa V₂ ≥ V₁ ja c₂ ≤ c₁. Yhtälöt eivät määritä valmistusmenetelmää, liukoisuutta tai stabiiliutta.",
    sv: "Att bara tillsätta lösningsmedel kan inte öka koncentrationen. Den ideala massbalansen är c₁V₁ = c₂V₂. Om c₂ > c₁ ger ekvationen ett positivt V₂ som är mindre än V₁; ett sådant resultat kan inte uppnås genom att tillsätta lösningsmedel. Spädning genom tillsats av lösningsmedel kräver V₂ ≥ V₁ och c₂ ≤ c₁. Dessa ekvationer fastställer inte beredningsmetod, löslighet eller stabilitet.",
    ru: "Одним добавлением растворителя концентрацию увеличить нельзя. Идеальный материальный баланс имеет вид c₁V₁ = c₂V₂. Если c₂ > c₁, уравнение даёт положительное V₂, меньшее V₁; такой результат невозможно получить добавлением растворителя. Для разбавления добавлением растворителя требуется V₂ ≥ V₁ и c₂ ≤ c₁. Эти уравнения не определяют способ приготовления, растворимость или стабильность.",
  },
  final_volume: {
    path: "peptide-calculator",
    en: "Mass concentration is the material mass divided by the final solution volume: c = m/V. Added solvent volume and final solution volume are different quantities. The calculator needs the final solution volume; it does not infer it from a preparation procedure. The ideal dilution make-up volume also assumes additive volumes. Actual preparation requires an approved research method.",
    fi: "Massapitoisuus on materiaalin massa jaettuna liuoksen lopullisella tilavuudella: c = m/V. Lisätyn liuottimen tilavuus ja liuoksen lopullinen tilavuus ovat eri suureita. Laskuri tarvitsee lopullisen liuostilavuuden eikä päättele sitä valmistusmenetelmästä. Laimennuksen laskennallinen täydennystilavuus olettaa lisäksi tilavuuksien summautuvan. Valmistuksessa on noudatettava hyväksyttyä tutkimusmenetelmää.",
    sv: "Masskoncentrationen är materialmassan dividerad med lösningens slutvolym: c = m/V. Tillsatt lösningsmedelsvolym och lösningens slutvolym är olika storheter. Kalkylatorn behöver lösningens slutvolym; den härleder den inte från en beredningsprocedur. Den ideala volymen att fylla till vid spädning förutsätter också att volymerna är additiva. Faktisk beredning kräver en godkänd forskningsmetod.",
    ru: "Массовая концентрация — это масса материала, делённая на итоговый объём раствора: c = m/V. Объём добавленного растворителя и итоговый объём раствора — разные величины. Калькулятору нужен итоговый объём раствора; он не выводит его из методики приготовления. Идеальный объём добавления при разбавлении также предполагает аддитивность объёмов. Фактическое приготовление требует одобренной исследовательской методики.",
  },
  batch_evidence: {
    path: "quality",
    en: "A report supports only the samples, methods, results and scope it actually describes. A report for a different batch does not establish results for the requested batch. Check the exact SKU and batch association in the original document. A report may cover several variants only when its scope and associations establish that. Do not assume that every vial was individually tested, that all tests passed, or that an unavailable report contains a particular result.",
    fi: "Raportti tukee vain siinä kuvattuja näytteitä, menetelmiä, tuloksia ja soveltamisalaa. Toisen erän raportti ei vahvista pyydetyn erän tuloksia. Tarkista alkuperäisestä asiakirjasta tarkka tuotekoodi ja eräyhteys. Raportti voi kattaa useita tuoteversioita vain, jos sen soveltamisala ja tuotekytkennät osoittavat tämän. Älä oleta, että jokainen pullo olisi testattu erikseen, kaikki testit olisi läpäisty tai puuttuva raportti sisältäisi tietyn tuloksen.",
    sv: "En rapport stöder endast de prover, metoder, resultat och den omfattning som den faktiskt beskriver. En rapport för en annan batch fastställer inte resultat för den begärda batchen. Kontrollera exakt SKU och kopplingen till batchen i originaldokumentet. En rapport kan omfatta flera varianter endast om dess omfång och dess kopplingar visar det. Antag inte att varje flaska har testats ensam, att alla tester har godkänts eller att en otillgänglig rapport innehåller ett visst resultat.",
    ru: "Отчёт подтверждает только те пробы, методы, результаты и ту область применения, которые он действительно описывает. Отчёт по другой партии не устанавливает результаты для запрошенной партии. Проверьте точный SKU и привязку к партии в исходном документе. Отчёт может охватывать несколько вариантов, только если это следует из его области применения и привязок. Не предполагайте, что каждый флакон тестировали по отдельности, что все тесты пройдены или что недоступный отчёт содержит определённый результат.",
  },
  molar_conversion: {
    path: "research-tools",
    en: "Molar conversion is not currently implemented in this calculator. An unspecified peptide blend cannot be assigned a molar concentration without the chemical forms, component composition, appropriate molar masses, quantities and final solution volume. A generic weighted average is insufficient. Use the existing mass-concentration tools only for quantities and units you can establish; original product records are required before adding product-based molar conversion.",
    fi: "Ainemääräpitoisuuden laskenta ei ole tällä hetkellä käytössä tässä laskurissa. Määrittelemättömän peptidiseoksen ainemääräpitoisuutta ei voida määrittää ilman kemiallisia muotoja, aineosien koostumusta, asianmukaisia moolimassoja, määriä ja lopullista liuostilavuutta. Yleinen painotettu keskiarvo ei riitä. Käytä nykyisiä massapitoisuustyökaluja vain määrillä ja yksiköillä, jotka voit osoittaa. Tuotekohtaisen ainemääräpitoisuuden lisääminen edellyttää alkuperäisiä tuotetietoja.",
    sv: "Molare omräkning är inte implementerad i den här kalkylatorn just nu. En peptidblandning utan angiven sammansättning kan inte tilldelas en molär koncentration utan de kemiska formerna, komponenternas sammansättning, lämpliga molmassor, mängderna och lösningens slutvolym. Ett generellt viktat medelvärde räcker inte. Använd de befintliga masskoncentrationsverktygen endast för mängder och enheter som ni kan belägga. Innan produktspecifik molär omräkning läggs till krävs ursprungliga produktuppgifter.",
    ru: "Пересчёт в молярную концентрацию в этом калькуляторе пока не реализован. Смеси пептидов без указанного состава нельзя присвоить молярную концентрацию без химических форм, состава компонентов, соответствующих молярных масс, количеств и итогового объёма раствора. Общее взвешенное среднее недостаточно. Используйте существующие инструменты расчёта массовой концентрации только для тех количеств и единиц, которые вы можете обосновать. Для добавления пересчёта по конкретным продуктам нужны исходные данные о продукте.",
  },
  participation: {
    path: "community",
    en: "Community participation points reflect received reactions. They do not verify a member's scientific qualifications. This site has no researcher-credential certification workflow. Assess scientific claims using their original sources; a participation level or reaction is not scientific approval.",
    fi: "Yhteisön osallistumispisteet perustuvat saatuihin reaktioihin. Ne eivät vahvista jäsenen tieteellistä pätevyyttä. Sivustolla ei ole tutkijan pätevyyden varmentavaa menettelyä. Arvioi tieteelliset väitteet alkuperäisten lähteiden perusteella; osallistumistaso tai reaktio ei ole tieteellinen hyväksyntä.",
    sv: "Communityns deltagarpunkter speglar mottagna reaktioner. De verifierar inte en medlems vetenskapliga kvalifikationer. Den här webbplatsen har ingen verifieringsrutin för forskares meriter. Bedöm vetenskapliga påståenden utifrån deras ursprungliga källor; en deltagarnivå eller en reaktion är inget vetenskapligt godkännande.",
    ru: "Баллы участия в сообществе отражают полученные реакции. Они не подтверждают научную квалификацию участника. На сайте нет процедуры сертификации исследовательских квалификаций. Оценивайте научные утверждения по их исходным источникам; уровень участия или реакция не являются научным одобрением.",
  },
  community_review: {
    path: "community/rules",
    en: "New posts and replies remain private until a human moderator decides to publish them. An AI moderation suggestion neither publishes a post nor certifies scientific correctness. Preparing or saving a community draft is a separate action and does not submit it for publication. Published community content remains attributed discussion, not approved product evidence.",
    fi: "Uudet viestit ja vastaukset pysyvät yksityisinä, kunnes moderaattori päättää niiden julkaisemisesta. Tekoälyn moderointiehdotus ei julkaise viestiä eikä vahvista tieteellistä oikeellisuutta. Yhteisöluonnoksen valmistelu tai tallentaminen on erillinen toiminto eikä lähetä sitä julkaistavaksi. Julkaistu yhteisösisältö on kirjoittajalle kuuluvaa keskustelua, ei hyväksyttyä tuotenäyttöä.",
    sv: "Nya inlägg och svar förblir privata tills en mänsklig moderator beslutar att publicera dem. Ett modereringsförslag från AI varken publicerar ett inlägg eller intygar vetenskaplig korrekthet. Att förbereda eller spara ett communityutkast är en separat åtgärd och lämnar inte in utkastet för publicering. Publicerat communityinnehåll är fortfarande en diskussion med angiven författare, inte godkända produktbevis.",
    ru: "Новые публикации и ответы остаются приватными, пока их не решит опубликовать живой модератор. Предложение ИИ по модерации не публикует пост и не подтверждает научную корректность. Подготовка или сохранение черновика в сообществе — отдельное действие, и оно не отправляет черновик на публикацию. Опубликованное содержимое сообщества остаётся обсуждением с указанием авторства, а не одобренными доказательствами по продукту.",
  },
  memory: {
    path: "legal/privacy",
    en: "Asking a question does not save a preference. Saving a preference requires your explicit confirmation. Conversation history is separate: saving conversations requires its own consent setting. Without that consent, or when no-persistence mode is requested, the chat does not create or append saved conversation history. Support requests and community submissions are separate actions with their own recorded data.",
    fi: "Kysymyksen esittäminen ei tallenna asetusta. Asetuksen tallentaminen edellyttää nimenomaista vahvistustasi. Keskusteluhistoria on erillinen asia: keskustelujen tallentaminen edellyttää omaa suostumusvalintaansa. Ilman tätä suostumusta tai tallentamattomassa tilassa keskustelu ei luo eikä täydennä tallennettua keskusteluhistoriaa. Tukipyynnöt ja yhteisöviestit ovat erillisiä toimintoja, joiden tiedot tallennetaan erikseen.",
    sv: "Att ställa en fråga sparar ingen inställning. För att spara en inställning krävs er uttryckliga bekräftelse. Konversationshistorik är en separat sak: att spara konversationer kräver en egen samtyckesinställning. Utan det samtycke, eller när ett läge utan sparning begärs, skapar eller kompletterar chatten ingen sparad konversationshistorik. Supportärenden och communityinlägg är separata åtgärder med egna registrerade uppgifter.",
    ru: "Сам вопрос не сохраняет настройку. Для сохранения настройки требуется ваше явное подтверждение. История разговоров — отдельная настройка: чтобы разговоры сохранялись, требуется отдельная настройка согласия. Без этого согласия или при включённом режиме без сохранения чат не создаёт и не дополняет сохранённую историю разговоров. Обращения в поддержку и публикации в сообществе — отдельные действия с собственными сохраняемыми данными.",
  },
  assistant_availability: {
    path: "assistant",
    en: "The assistant label describes its role. It is a static label, not a provider heartbeat or health check, and does not prove current availability. A completed response establishes that the service responded to that request. An error or interrupted response needs a retry; the catalogue and calculator can still be used separately.",
    fi: "Avustajan otsikko kuvaa sen tehtävää. Se on staattinen teksti eikä palveluntarjoajan tilatarkistus, joten se ei todista tämänhetkistä käytettävyyttä. Valmis vastaus osoittaa, että palvelu vastasi kyseiseen pyyntöön. Virhe tai keskeytynyt vastaus edellyttää uutta yritystä. Tuoteluetteloa ja laskuria voi käyttää erikseen.",
    sv: "Assistentens etikett beskriver dess roll. Det är en statisk etikett, inte någon pulskontroll eller hälsokontroll av leverantören, och den bevisar inte att assistenten är tillgänglig just nu. Ett slutfört svar visar att tjänsten svarade på den begäran. Ett fel eller ett avbrutet svar kräver ett nytt försök; katalogen och kalkylatorn kan fortfarande användas var för sig.",
    ru: "Метка ассистента описывает его роль. Это статическая метка, а не heartbeat-проверка и не проверка состояния сервиса, и она не доказывает, что ассистент доступен прямо сейчас. Завершённый ответ подтверждает, что сервис ответил на данный запрос. Ошибка или прерванный ответ требуют повторной попытки; каталогом и калькулятором можно продолжать пользоваться отдельно.",
  },
}
/** Locales without a reviewed translation fall back to English rather than an empty answer. */
function guidanceText(entry: GuidanceEntry, locale: string): string {
  return (GUIDANCE_LOCALES as readonly string[]).includes(locale)
    ? entry[locale as GuidanceLocale]
    : entry.en
}
const GUIDANCE_LINK_LABELS: Record<GuidanceLocale, string> = {
  en: "Guidance and scope",
  fi: "Ohje ja rajaukset",
  sv: "Råd och avgränsning",
  ru: "Руководство и границы применимости",
}
function guidanceLinkLabel(locale: string): string {
  return (GUIDANCE_LOCALES as readonly string[]).includes(locale)
    ? GUIDANCE_LINK_LABELS[locale as GuidanceLocale]
    : GUIDANCE_LINK_LABELS.en
}
export function researchGuidance(topic: GuidanceTopic, locale: string) {
  const entry = guidance[topic]
  return {
    topic,
    text: guidanceText(entry, locale),
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
      return `${result.text}\n\n[${guidanceLinkLabel(locale)}](${result.url})`
    })
    .join("\n\n")
}
