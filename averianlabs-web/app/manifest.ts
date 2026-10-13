import { storefrontManifest } from "@/lib/seo/manifest"
export const dynamic = "force-static"
export default function manifest() {
  return storefrontManifest()
}
