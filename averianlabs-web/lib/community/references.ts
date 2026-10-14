/** Author-supplied links, never an assertion of scientific review or access. */
export function discussionReferences(body: string): string[] {
  const links = new Set<string>()
  for (const m of body.matchAll(/https?:\/\/[^\s<>"\]]+/g)) {
    const value = m[0].replace(/[).,;]+$/, "")
    try {
      const url = new URL(value)
      if (["https:", "http:"].includes(url.protocol)) links.add(url.href)
    } catch {
      /* incomplete link */
    }
  }
  return [...links].slice(0, 20)
}
