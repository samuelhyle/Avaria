import type { GuidanceTopic } from "./guidance"

/** Narrow routing to existing reviewed guidance; this never infers quantities or chemistry. */
export function requiredGuidanceTopic(message: string): GuidanceTopic | null {
  const molarQuantity =
    /\bmolar(?:ity|\s+(?:concentration|mass))?\b|ainemääräpito|moolipito|moolimass/iu
  const missingInformation =
    /\b(?:without|missing|unknown|unspecified|no)\s+(?:(?:an?|the|appropriate|known|peptide)\s+)*(?:molar\s+mass|composition|chemical\s+forms?|blend)|\bilman\s+(?:moolimass|koostum|kemiallis)|määrittelemätt\p{L}*\s+(?:peptidi)?seok/iu
  const conversionQuestion =
    /\b(?:calculate|compute|convert|conversion|why|can)\b|\b(?:laske|miksi|voiko)\b|muunta|muunno/iu
  return molarQuantity.test(message) &&
    missingInformation.test(message) &&
    conversionQuestion.test(message)
    ? "molar_conversion"
    : null
}

/** Used only to choose failure copy after output verification has already failed. */
export function hasExplicitNumericalCalculationIntent(message: string): boolean {
  return (
    /\b(?:calculate|compute|laske|laskekaa|laskea)\b/iu.test(message) &&
    /\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|[µμ]g|ml|[µμu]l)\b/iu.test(message) &&
    /concentration|dilut|aliquot|solution|final\s+(?:solution\s+)?volume|pitoisu|laimenn|osanäyt|liuok|liuos|lopulli\p{L}*\s+tilavuu/iu.test(
      message,
    ) &&
    !/\b(?:price|pricing|cost|quote|quotation|payment)\b|\bhint|\bmaksu|\bmaksa/iu.test(message)
  )
}

export function isReadOnlyCapabilityRequest(message: string): boolean {
  const order = /\b(?:orders?|shipments?|tracking)\b|tilauks|tilaust|seuranta/iu
  const supportAction =
    /\b(?:create|open|submit|send|file|raise)\b.{0,60}\b(?:support\s+(?:ticket|request)|ticket)\b|\b(?:contact|reach|email)\s+(?:customer\s+)?support\b|(?:avaa|luo|lähet|tee)\p{L}*\s+(?:uusi\p{L}*\s+)?tukipyy|(?:ota|ottaa)\s+yhteyttä\s+(?:tukeen|asiakastukeen)/iu
  const requestedAction =
    /\b(?:show|look\s*up|check|track|find|open|create|submit|send|can|help)\b|näytä|tarkista|hae\b|etsi|avaa|luo\b|lähet|voiko|voitko/iu
  const privateInformation =
    /\b(?:private\s+customer|private\s+account\s+(?:data|details|information)|other\s+customers?|another\s+customer|system\s+instructions)\b|yksityis\p{L}*\s+(?:asiakastie|tilitie)|toisen\s+asiakkaan|järjestelmäohje/iu
  return (
    (order.test(message) && requestedAction.test(message)) ||
    supportAction.test(message) ||
    privateInformation.test(message)
  )
}

/** This describes the actual read-only tool set, independently of authentication. */
export function renderReadOnlyCapabilities(locale: string): string {
  return locale === "fi"
    ? `En voi näyttää muiden asiakkaiden yksityisiä tietoja tai sisäisiä järjestelmäohjeita. Tässä vain luku -tilassa tilausten haku ja tukipyynnön lähettäminen eivät ole käytettävissä. Omia tilauksiasi varten voit avata [oman tilisi](/${locale}/account/orders) tai [ottaa yhteyttä tukeen](/${locale}/contact). Tässä keskustelussa ei tarvitse jakaa henkilötietoja.`
    : `I cannot share other customers' private data or internal system instructions. Order lookup and support-ticket submission are unavailable in this read-only chat. For your own orders, use [your account](/${locale}/account/orders) or [contact support](/${locale}/contact). You do not need to share personal details in this chat.`
}
