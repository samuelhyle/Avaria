import { isAllowed } from "@/lib/claims/registry"
import { Award, FileCheck2, Truck } from "lucide-react"
import { useTranslations } from "next-intl"

export function ProductTrustBadges() {
  const t = useTranslations("home")
  const items = [
    { id: "iso-17025-lab", icon: Award, label: t("trustBadge5") },
    { id: "coa-every-batch", icon: FileCheck2, label: t("heroTrustCoa") },
    { id: "eu-dispatch-24h", icon: Truck, label: t("heroTrustDispatch") },
  ].filter((item) => isAllowed(item.id))
  if (!items.length) return null
  return <ul className="grid gap-3 sm:grid-cols-3">{items.map(({ id, icon: Icon, label }) => <li key={id} className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4" aria-hidden />{label}</li>)}</ul>
}
