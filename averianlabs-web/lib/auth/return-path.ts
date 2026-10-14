/** Only return to the selected locale on this application; never trust an external URL. */
export function safeReturnPath(value: unknown, locale: string): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 8000 ||
    !value.startsWith(`/${locale}/`) ||
    value.includes("\\") ||
    [...value].some((c) => c.charCodeAt(0) < 32)
  )
    return undefined
  try {
    const url = new URL(value, "https://return.invalid")
    return url.origin === "https://return.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : undefined
  } catch {
    return undefined
  }
}
