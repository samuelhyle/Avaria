import { Award, BadgeCheck, Lock, ShieldCheck, Truck } from "lucide-react"

const items = [
  { icon: ShieldCheck, label: "Third-party HPLC", sub: "Every batch verified" },
  { icon: BadgeCheck, label: "Mass-spec identity", sub: "Confirmed at partner lab" },
  { icon: Award, label: "ISO 17025 testing", sub: "Independent certification" },
  { icon: Truck, label: "EU-wide 24h dispatch", sub: "Free over €150" },
]

export function ProductTrustBadges() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, sub }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2"
        >
          <Icon className="h-4 w-4 shrink-0 text-accent" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-ink">{label}</p>
            <p className="text-3xs text-ink-muted">{sub}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
