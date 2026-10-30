import { VercelInsights } from "@/components/layout/VercelInsights"
import { siteOrigin } from "@/lib/seo/site-origin"
import type { Metadata } from "next"

export const metadata: Metadata = {
  // Resolved from the deployment environment, not hardcoded: the canonical
  // origin has to be the origin that actually serves the site. A relative
  // `metadataBase` would silently resolve against the wrong host.
  metadataBase: new URL(siteOrigin()),
  title: "AverianLabs — Precision peptides for serious research",
  description: "Premium research-grade peptides. EU-GMP vendor network. Third-party HPLC tested.",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <VercelInsights />
    </>
  )
}
