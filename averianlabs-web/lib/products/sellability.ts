import type { Availability, AvailabilityAction, AvailabilityBlocker } from "./types"

/**
 * Everything the server knows about a variant's ability to be ordered.
 *
 * The catalogue zeroes the price and the stock of anything that is not
 * directly purchasable, so the reason a variant is unavailable cannot be
 * recovered from the record the browser receives. It is decided here, once,
 * from the facts that exist at the moment of the query.
 */
export interface AvailabilityInput {
  purchaseMode: "direct" | "quotation" | "unavailable"
  /** The product is published and visible in the catalogue. */
  productPublished: boolean
  /** The specification has been verified against a released batch. */
  specificationsVerified: boolean
  /** A lot has been released for this variant and has not expired. */
  hasReleasedBatch: boolean
  /** That lot's certificate of analysis is published and can be opened. */
  hasPublicCertificate: boolean
  priceCents: number
  stockQty: number
}

/**
 * Blockers that mean "we will tell you when it lands".
 *
 * A missing lot or a sold-out lot is a timing problem: the customer wants
 * the same product later. A request for a quote is not the right instrument
 * for it, because it asks the team a question they cannot answer yet.
 */
const NOTIFY_BLOCKERS: AvailabilityBlocker[] = ["notReleased", "noCertificate", "outOfStock"]

/**
 * The availability of one variant.
 *
 * The blockers follow the release pipeline, so a shopper is told the first
 * thing that is actually missing rather than a generic "unavailable". Only
 * one stage of the pipeline is reported at a time: a product whose lot has
 * not been released cannot also be reported as out of stock, because the
 * stock figure would be describing a lot that does not exist.
 */
export function describeAvailability(input: AvailabilityInput): Availability {
  if (input.purchaseMode === "quotation") {
    return { buyable: false, blockers: ["quotation"], action: "requestLot" }
  }

  if (
    input.purchaseMode === "direct" &&
    input.priceCents > 0 &&
    input.stockQty > 0 &&
    input.productPublished &&
    input.specificationsVerified &&
    input.hasReleasedBatch &&
    input.hasPublicCertificate
  ) {
    return { buyable: true, blockers: [], action: "addToCart" }
  }

  const blockers: AvailabilityBlocker[] = []
  if (!input.productPublished) blockers.push("notPublished")
  else if (!input.specificationsVerified) blockers.push("unverifiedSpecifications")
  else if (!input.hasReleasedBatch) blockers.push("notReleased")
  else if (!input.hasPublicCertificate) blockers.push("noCertificate")
  else {
    if (input.priceCents <= 0) blockers.push("noPrice")
    if (input.stockQty <= 0) blockers.push("outOfStock")
  }
  if (!blockers.length) blockers.push("notReleased")

  const action: AvailabilityAction = blockers.some((blocker) => NOTIFY_BLOCKERS.includes(blocker))
    ? "notifyMe"
    : "requestLot"
  return { buyable: false, blockers, action }
}

/**
 * The blocker the shopper is told about.
 *
 * The list holds the pipeline order, so the first entry is the gate.
 */
export function primaryBlocker(availability: Availability | undefined): AvailabilityBlocker | null {
  if (!availability || availability.buyable) return null
  return availability.blockers[0] ?? null
}
