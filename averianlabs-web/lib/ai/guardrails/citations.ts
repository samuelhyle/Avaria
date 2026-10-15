/** A numbered reference must resolve to a source emitted by this response. */
export function unsupportedCitationMarkers(text: string, citations: Array<{ index?: number }>) {
  const supported = new Set(citations.map((citation) => citation.index))
  return [...new Set([...text.matchAll(/\[(\d+)\](?!\()/g)].map((match) => Number(match[1])))]
    .filter((index) => !supported.has(index))
    .map((index) => `unsupported_citation:${index}`)
}
