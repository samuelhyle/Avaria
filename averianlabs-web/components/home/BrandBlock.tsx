import { Button } from "@/components/ui/Button"
import { Search } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
export async function BrandBlock({ locale }: { locale: string }) {
  const [e, r] = await Promise.all([
    getTranslations({ locale, namespace: "experience" }),
    getTranslations({ locale, namespace: "research" }),
  ])
  return (
    <div className="min-w-0 max-w-xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-accent">
        {e("heroEyebrow")}
      </p>
      <h1 className="break-words hyphens-auto font-display text-[2.25rem] font-semibold leading-[1.1] tracking-[-.04em] sm:text-5xl lg:text-[3.25rem]">
        {e("heroTitle")}
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">{e("heroIntro")}</p>
      <form action={`/${locale}/shop`} className="mt-6">
        <label htmlFor="home-material-search" className="mb-2 block text-sm font-medium">
          {e("heroSearchLabel")}
        </label>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface p-1.5 shadow-xs">
          <Search aria-hidden className="ml-2 h-4 w-4 shrink-0 text-ink-muted" />
          <input
            id="home-material-search"
            name="q"
            type="search"
            placeholder={e("heroSearchPlaceholder")}
            className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none"
          />
          <Button type="submit">{e("searchAction")}</Button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/${locale}/shop`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline underline-offset-4"
        >
          {e("browseMaterials")} →
        </Link>
        <Link
          href={`/${locale}/documents`}
          className="inline-flex min-h-10 items-center text-sm text-accent hover:underline underline-offset-4"
        >
          {e("documentsAction")} →
        </Link>
      </div>
      <p className="mt-3 text-sm text-ink-muted">{r("researchOnly")}</p>
    </div>
  )
}
