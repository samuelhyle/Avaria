import { BrandSymbol } from "@/components/media/BrandSymbol"
import { BRAND_BLUE } from "@/lib/brand/mark"
import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"
export const dynamic = "force-static"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_BLUE,
        color: "#ffffff",
        fontSize: 104,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <BrandSymbol width={132} height={132} />
    </div>,
    { ...size },
  )
}
