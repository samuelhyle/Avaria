import { ContactForm } from "@/components/support/ContactForm"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"
export const generateMetadata = makePageMetadata("contact", "/contact")
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("research")
  const legal = getLegalIdentity()
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="h-page">{t("contactTitle")}</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">{t("contactIntro")}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <a href={`mailto:${legal.contactEmail}`} className="text-accent underline">
            {legal.contactEmail}
          </a>
          {legal.addressLine1 && (
            <p className="mt-4">
              {legal.addressLine1}, {legal.addressLine2}
            </p>
          )}
        </div>
        <ContactForm />
      </div>
    </Container>
  )
}
