import { VercelInsights } from "@/components/layout/VercelInsights"
import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://averianlabs.eu"),
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
