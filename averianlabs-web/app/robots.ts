import { isDemoBuild } from "@/lib/demo"
import { locales } from "@/lib/i18n/config"
import { siteOrigin } from "@/lib/seo/site-origin"
import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  if (isDemoBuild() || process.env.NEXT_PUBLIC_REVIEW_SITE === "true") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    }
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/studio/",
          "/_next/",
          ...locales.flatMap((locale) =>
            ["account", "checkout", "admin", "assistant", "reset-password", "verify-email"].map(
              (route) => `/${locale}/${route}`,
            ),
          ),
        ],
      },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  }
}
