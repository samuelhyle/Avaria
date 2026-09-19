/**
 * Shared OG image renderer. Used by every `/api/og/[type]/[slug]`
 * route handler so the visual language stays consistent.
 */
import { getSiteUrl } from "@/lib/site"
import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = "image/png"

const ACCENT = "#2563eb"
const ACCENT_SOFT = "#dbeafe"
const SURFACE = "#ffffff"
const SURFACE_DARK = "#f8fafc"
const INK = "#0a1834"
const INK_MUTED = "#64748b"
const BORDER = "#e2e8f0"

export interface OgBase {
  kind: string // "Thread" | "Glossary" | "Plan" | "Document"
  title: string
  subtitle?: string
  badge?: string
  meta?: string // small line at the bottom (author, category, batch…)
  url?: string // small line in corner — site url
}

export async function renderOg(input: OgBase): Promise<ImageResponse> {
  const { kind, title, subtitle, badge, meta, url } = input
  const siteUrl = url ?? new URL(getSiteUrl()).host
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        color: INK,
        padding: 60,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: ACCENT,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Æ
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>AVERIANLABS</div>
        <div style={{ marginLeft: "auto", fontSize: 14, color: INK_MUTED }}>{siteUrl}</div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            background: ACCENT_SOFT,
            color: ACCENT,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {kind}
        </div>
        {badge ? (
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: SURFACE_DARK,
              color: INK_MUTED,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 24,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          display: "flex",
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            lineHeight: 1.4,
            color: INK_MUTED,
            display: "flex",
          }}
        >
          {subtitle.length > 160 ? `${subtitle.slice(0, 160)}…` : subtitle}
        </div>
      ) : null}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {meta ? (
          <div style={{ fontSize: 16, color: INK_MUTED }}>{meta}</div>
        ) : (
          <div style={{ fontSize: 16, color: INK_MUTED }}>
            Precision peptides for serious research.
          </div>
        )}
        <div
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 14,
            color: INK_MUTED,
          }}
        >
          Research use only
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      headers: {
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  )
}
