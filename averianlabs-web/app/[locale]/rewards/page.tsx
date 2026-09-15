import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { Reveal } from "@/components/ui/Reveal"
import { makePageMetadata } from "@/lib/seo/metadata"
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Coins,
  Gift,
  Lock,
  Rocket,
  Share2,
  ShieldCheck,
  Star,
  Truck,
  Users,
  Zap,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const generateMetadata = makePageMetadata("rewards", "/rewards")

export default async function RewardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const tiers = [
    {
      name: "Apex",
      threshold: 0,
      icon: Zap,
      perks: [
        { icon: Coins, text: "1 point per €1 spent" },
        { icon: Star, text: "Birthday bonus points" },
        { icon: Clock, text: "Early access to new batches" },
      ],
      color: "muted",
      gradient: "from-surface-2 via-surface to-surface-2",
    },
    {
      name: "Crystal",
      threshold: 500,
      icon: ShieldCheck,
      perks: [
        { icon: Coins, text: "1.25 points per €1 spent" },
        { icon: Truck, text: "Free EU shipping on all orders" },
        { icon: Rocket, text: "Exclusive product drops" },
        { icon: BadgeCheck, text: "Priority batch selection" },
      ],
      color: "ice",
      gradient: "from-ice-soft via-surface to-ice-soft",
      popular: true,
    },
    {
      name: "Aurora",
      threshold: 2000,
      icon: Star,
      perks: [
        { icon: Coins, text: "1.5 points per €1 spent" },
        { icon: Truck, text: "Free express EU shipping" },
        { icon: Lock, text: "Priority support line" },
        { icon: Gift, text: "Lab visit invitations" },
        { icon: BadgeCheck, text: "Dedicated account manager" },
      ],
      color: "accent",
      gradient: "from-accent-soft via-surface to-accent-soft",
    },
  ]

  const earnWays = [
    {
      icon: Coins,
      action: "Place an order",
      points: "1–1.5× per €1",
      desc: "Points scale with your tier",
    },
    {
      icon: Star,
      action: "Write a product review",
      points: "50 pts",
      desc: "Verified purchase reviews only",
    },
    {
      icon: Users,
      action: "Refer a colleague",
      points: "250 pts",
      desc: "When they place their first order",
    },
    {
      icon: Share2,
      action: "Share a research plan",
      points: "25 pts",
      desc: "Public plan with 5+ saves",
    },
  ]

  return (
    <Container className="py-16">
      <header className="mb-16 max-w-3xl">
        <Badge tone="warn" className="mb-4">
          <Trophy className="h-3 w-3" /> Loyalty program
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          AverianLabs Rewards
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          Earn points on every order. Climb tiers. Redeem for research credit. The more you
          research, the more you save.
        </p>
      </header>

      {/* Tier cards */}
      <section className="mb-20">
        <Reveal>
          <h2 className="mb-8 font-display text-2xl font-semibold">Choose your tier</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 80}>
              <div
                className={`relative rounded-[var(--radius-xl)] border bg-gradient-to-br p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${tier.gradient} ${
                  tier.color === "accent"
                    ? "border-accent ring-1 ring-accent/30"
                    : tier.popular
                      ? "border-ice ring-1 ring-ice/30"
                      : "border-line"
                }`}
              >
                {tier.popular ? (
                  <div className="absolute -top-3 left-8">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ice px-3 py-1 text-3xs font-semibold uppercase tracking-wider text-ice-ink">
                      Most popular
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tier.color === "accent"
                        ? "bg-accent text-white"
                        : tier.popular
                          ? "bg-ice text-ice-ink"
                          : "bg-surface-2 text-ink-muted"
                    }`}
                  >
                    <tier.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold">{tier.name}</h3>
                    <p className="text-xs text-ink-muted">
                      {tier.threshold === 0
                        ? "Starting tier"
                        : `€${tier.threshold}+ lifetime spend`}
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.perks.map((perk) => (
                    <li key={perk.text} className="flex items-center gap-2.5 text-sm">
                      <perk.icon className="h-4 w-4 shrink-0 text-accent" />
                      {perk.text}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={tier.color === "accent" ? "primary" : "outline"} fullWidth>
                  <Link href={`/${locale}/shop`} className="mt-8 block">
                    {tier.threshold === 0 ? "Start earning" : `Unlock ${tier.name}`}
                  </Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How to earn */}
      <section className="mb-20 rounded-[var(--radius-xl)] border border-line bg-surface p-8 sm:p-10">
        <h2 className="mb-6 font-display text-2xl font-semibold">How to earn points</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {earnWays.map((way, _i) => (
            <div
              key={way.action}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <way.icon className="h-4 w-4" />
                </div>
                <span className="font-display text-lg font-semibold text-accent">{way.points}</span>
              </div>
              <div>
                <p className="font-medium text-ink">{way.action}</p>
                <p className="text-xs text-ink-muted">{way.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Referral program */}
      <section className="mb-20 rounded-[var(--radius-2xl)] bg-ink p-8 text-white sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="ice" className="mb-4 border-white/20 bg-white/10 text-white">
              <Gift className="h-3 w-3" /> Referral program
            </Badge>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Give €15, get €15
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Share your unique referral link with colleagues. When they place their first order
              over €100, you both receive €15 in research credit. No limit on referrals.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Share your unique link via email or social",
                "Colleague gets €15 off their first order (€100+)",
                "You get €15 credit + 250 bonus points",
                "Unlimited referrals — stack your credits",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2 text-sm text-white/80">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-success"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <p className="text-sm text-white/60">Your referral link</p>
            <div className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-white/20 bg-white/10 px-4 py-3">
              <code className="flex-1 font-mono text-sm text-white/90 truncate">
                averianlabs.eu/r/YOUR_CODE
              </code>
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius)] bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
              >
                Copy
              </button>
            </div>
            <Button asChild className="w-full bg-white text-ink hover:bg-white/90">
              <Link href={`/${locale}/account`} className="mt-2 w-full">
                Get my referral link <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-2xs text-white/40">Sign in to generate your unique link</p>
          </div>
        </div>
      </section>

      {/* Points redemption */}
      <section className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 sm:p-10">
        <h2 className="mb-6 font-display text-2xl font-semibold">Redeem your points</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { points: 500, value: "€5", label: "Order credit" },
            { points: 1000, value: "€12", label: "Order credit (bonus)" },
            { points: 2500, value: "€35", label: "Order credit (premium)" },
          ].map((tier) => (
            <div
              key={tier.points}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-5"
            >
              <div>
                <p className="font-display text-2xl font-semibold">{tier.value}</p>
                <p className="text-xs text-ink-muted">{tier.label}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium text-accent">
                  {tier.points.toLocaleString()} pts
                </p>
                <p className="text-3xs text-ink-subtle">
                  {tier.points === 500
                    ? "1% back"
                    : tier.points === 1000
                      ? "1.2% back"
                      : "1.4% back"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Points expire 12 months after earning. Credits are applied automatically at checkout.
        </p>
      </section>
    </Container>
  )
}

function Trophy(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
