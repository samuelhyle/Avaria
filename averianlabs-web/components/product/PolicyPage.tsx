import { CookieSettings } from "@/components/layout/CookieSettings"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { getTranslations } from "next-intl/server"

export async function PolicyPage({
  locale,
  kind,
  sections,
}: { locale: string; kind: string; sections: string[] }) {
  const t = await getTranslations({ locale, namespace: "research" })
  const legal = getLegalIdentity()
  return (
    <Container size="narrow" className="py-16">
      <h1 className="font-display text-4xl font-semibold">{t(`${kind}Title`)}</h1>
      <p className="mt-4 text-ink-muted">{t(`${kind}Intro`)}</p>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-display text-xl font-semibold">{t(`${kind}${section}Title`)}</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{t(`${kind}${section}Body`)}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 border-t border-line pt-6 text-sm text-ink-muted">
        <p>{legal.companyName}</p>
        {legal.businessId && legal.vatId && legal.addressLine1 ? (
          <p>
            {t("businessId")}: {legal.businessId} · VAT {legal.vatId}
            <br />
            {legal.addressLine1}, {legal.addressLine2}
          </p>
        ) : (
          <p>{t("legalPending")}</p>
        )}
        <a href={`mailto:${legal.contactEmail}`} className="underline underline-offset-4">
          {legal.contactEmail}
        </a>
        {kind === "cookies" && (
          <div className="mt-4">
            <CookieSettings />
          </div>
        )}
      </div>
    </Container>
  )
}
