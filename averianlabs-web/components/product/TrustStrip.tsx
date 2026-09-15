import { Award, CheckCircle2, FlaskConical, Lock, Shield, Truck } from "lucide-react"

const badges = [
  { icon: Shield, label: "EU-GMP vendor" },
  { icon: FlaskConical, label: "Third-party HPLC tested" },
  { icon: CheckCircle2, label: "Endotoxin < 5 EU/mg" },
  { icon: Truck, label: "24h EU dispatch" },
  { icon: Award, label: "ISO 17025 lab partner" },
  { icon: Lock, label: "GDPR compliant" },
]

export function TrustStrip() {
  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {badges.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Icon className="h-3 w-3" />
            </span>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
