import { Container } from "@/components/ui/Container"
import { Truck } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * The strip above the navigation. It answers the three questions a shopper
 * has before anything else: does it ship here, is it tested, and what does
 * the price include.
 *
 * The copy is written out rather than looked up through a key variable so
 * that `scripts/i18n-client-slice.mjs` can prove which messages the browser
 * needs and ship only those.
 */
export function AnnouncementBar() {
  const t = useTranslations("store.announce")

  return (
    <div className="store-announce hidden border-b border-white/10 lg:block">
      <Container>
        <div className="flex h-9 items-center justify-between gap-6 text-[12px]">
          {/*
            The three messages and the research-use label have to share one
            36px line. A translation can be twice as long as the English it
            replaces, and the extra width then painted over the label on the
            right.

            Each message is dropped at the width where it no longer fits, and
            `truncate` on the list is the final guard: a message is cut with
            an ellipsis rather than overlapping its neighbour.
          */}
          <ul className="flex min-w-0 items-center gap-6 overflow-hidden">
            <li className="flex min-w-0 items-center gap-1.5 truncate">
              <Truck aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="truncate">{t("freeShipping")}</span>
            </li>
            <li className="hidden min-w-0 items-center gap-1.5 truncate xl:flex">
              <span className="truncate">{t("batchTested")}</span>
            </li>
            <li className="hidden min-w-0 items-center gap-1.5 truncate 2xl:flex">
              <span className="truncate">{t("dispatch")}</span>
            </li>
          </ul>
          <p className="shrink-0 whitespace-nowrap font-medium uppercase tracking-[0.14em] opacity-80">
            {t("researchOnly")}
          </p>
        </div>
      </Container>
    </div>
  )
}
