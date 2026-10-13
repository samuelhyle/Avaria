/** Only usable public sources can support a storefront release. */
export function publicDocumentUrl(doc: {
  requiresLogin?: boolean
  externalUrl: string | null
  fileR2Key: string | null
}): string | null {
  if (doc.requiresLogin) return null
  if (doc.externalUrl) {
    try {
      const url = new URL(doc.externalUrl)
      if (url.protocol === "https:" && !url.username && !url.password) return url.toString()
    } catch {
      /* Invalid source. */
    }
  }
  const base =
    process.env.R2_PUBLIC_URL ??
    process.env.R2_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_R2_BASE_URL
  if (
    !base ||
    !doc.fileR2Key ||
    doc.fileR2Key.startsWith("/") ||
    doc.fileR2Key.split("/").includes("..")
  )
    return null
  try {
    const url = new URL(base)
    if (url.protocol !== "https:" || url.username || url.password) return null
    return `${base.replace(/\/$/, "")}/${doc.fileR2Key.split("/").map(encodeURIComponent).join("/")}`
  } catch {
    return null
  }
}
