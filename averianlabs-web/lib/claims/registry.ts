/**
 * Claim-to-evidence registry.
 *
 * Every marketing claim that appears on the storefront must have a row here.
 * Components render the claim's `copy` only when `isAllowed()` returns true.
 * Until a claim has a verified evidence owner (per Plan §10 / CLAIM-01 / PAY-01)
 * the `evidence` field stays at the default of "pending" and the claim is
 * suppressed at render time.
 *
 * To unblock a claim:
 *   1. Attach the evidence (URL, document ID, supplier report, etc.) to
 *      `evidenceRef` and set `evidence: "verified"`.
 *   2. Add an owner via `evidenceOwner` so future regressions have a name.
 *   3. If the claim is time-boxed (e.g. a current batch discount), set
 *      `expiresAt` to the last day it is allowed to render.
 *
 * Suppressed claims fall back to neutral copy or are omitted entirely — never
 * rendered with a "verified" badge or value.
 */

export type ClaimEvidence = "verified" | "pending" | "rejected"

export interface Claim {
  /** Stable identifier, used in code (`useClaim("eu-dispatch")`) and audits. */
  id: string
  /** Translation namespace + key, looked up via next-intl at render time. */
  i18nKey: string
  /** Current evidence status. New claims start at "pending". */
  evidence: ClaimEvidence
  /** Free-form evidence pointer (URL, document id, supplier report). */
  evidenceRef?: string
  /** Owner responsible for keeping the evidence fresh. */
  evidenceOwner?: string
  /** ISO date string after which the claim must not render. */
  expiresAt?: string
}

const REGISTRY: Claim[] = [
  {
    id: "eu-dispatch-24h",
    i18nKey: "nav:topbar.dispatch24h",
    evidence: "pending",
    evidenceRef: "RUNBOOK.md §8 (dispatch cutoffs not yet finalised)",
    evidenceOwner: "operations-lead",
  },
  {
    id: "free-shipping-150",
    i18nKey: "nav:topbar.freeShipping",
    evidence: "pending",
    evidenceRef: "Plan §7 — shipping rates pending carrier agreement",
    evidenceOwner: "operations-lead",
  },
  {
    id: "hplc-purity-98",
    i18nKey: "nav:topbar.hplcVerified",
    evidence: "pending",
    evidenceRef: "Threshold stated; per-batch result lives in batches.hplcPurity",
    evidenceOwner: "quality-lead",
  },
  {
    id: "coa-every-batch",
    i18nKey: "nav:topbar.coaEveryBatch",
    evidence: "pending",
    evidenceRef: "Plan §5 / DOC-01 — original COAs not yet uploaded",
    evidenceOwner: "quality-lead",
  },
  {
    id: "eu-gmp-vendors",
    i18nKey: "home:trustBadge1",
    evidence: "pending",
    evidenceRef: "Plan §4 — vendor audit reports not yet on file",
    evidenceOwner: "quality-lead",
  },
  {
    id: "iso-17025-lab",
    i18nKey: "home:trustBadge5",
    evidence: "pending",
    evidenceRef: "Plan §4 — lab accreditation certificates not yet attached",
    evidenceOwner: "quality-lead",
  },
  {
    id: "stripe-secured",
    i18nKey: "footer:stripeSecured",
    evidence: "pending",
    evidenceRef: "Plan §7 / PAY-01 — live payment integration not yet verified",
    evidenceOwner: "ops-lead",
  },
  {
    id: "average-purity-98-9",
    i18nKey: "home:heroStat1",
    evidence: "pending",
    evidenceRef: "No claim-to-evidence owner; computed value not authorised",
    evidenceOwner: "quality-lead",
  },
  {
    id: "verified-labs-2400",
    i18nKey: "home:heroStat2",
    evidence: "pending",
    evidenceRef: "No evidence owner; figure fabricated for marketing",
    evidenceOwner: "product-owner",
  },
  {
    id: "hero-stat-eu-dispatch",
    i18nKey: "home:heroStat3",
    evidence: "pending",
    evidenceRef: "Depends on eu-dispatch-24h",
    evidenceOwner: "operations-lead",
  },
]

/**
 * Look up a claim by id. Returns `undefined` when the id is not in the
 * registry — callers should treat that as a hard error and avoid rendering
 * any untracked claim.
 */
export function getClaim(id: string): Claim | undefined {
  return REGISTRY.find((c) => c.id === id)
}

/**
 * Whether a claim may be rendered.
 *  - missing id → false (fail-closed: do not render unknown claims)
 *  - rejected   → false
 *  - pending    → false (default for new claims; must be promoted to verified)
 *  - verified but expired → false
 *  - verified and within validity → true
 */
export function isAllowed(claim: Claim | string, asOf: Date = new Date()): boolean {
  const c = typeof claim === "string" ? getClaim(claim) : claim
  if (!c) return false
  if (c.evidence !== "verified") return false
  if (c.expiresAt && new Date(c.expiresAt).getTime() < asOf.getTime()) return false
  return true
}

/**
 * All registered claims — used by CI / audit tooling to ensure every marketing
 * surface is backed by a registry entry. The list is exported read-only.
 */
export function listClaims(): readonly Claim[] {
  return REGISTRY
}
