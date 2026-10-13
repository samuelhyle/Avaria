import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("customer"),
    locale: text("locale").notNull().default("en"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    reputation: integer("reputation").notNull().default(0),
    reputationTier: text("reputation_tier").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_reputation_idx").on(t.reputation),
    index("users_created_idx").on(t.createdAt),
  ],
)

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_idx").on(t.userId),
  ],
)

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
)

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("passkeys_user_idx").on(t.userId)],
)

export const addresses = pgTable(
  "addresses",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Nullable: guest checkout stores the address for fulfilment without an account. */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    postal: text("postal").notNull(),
    country: text("country").notNull(),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
)

export const categories = pgTable("categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  parentId: text("parent_id"),
})

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    categoryId: text("category_id").references(() => categories.id),
    casNumber: text("cas_number"),
    molecularFormula: text("molecular_formula"),
    molecularWeight: doublePrecision("molecular_weight"),
    sequence: text("sequence"),
    storageTemp: text("storage_temp"),
    purityPercent: doublePrecision("purity_percent"),
    hue: integer("hue").notNull().default(214),
    status: text("status").notNull().default("active"),
    /**
     * The batch currently being sold. The product page MUST render
     * `batches.hplcPurity` (via this FK) rather than `products.purityPercent`
     * to keep product and COA registry values consistent (DATA-01).
     * NULL means the product has no released batch and is not buyable.
     *
     * Foreign-key constraint is declared in the migration (`0001_phase2_catalogue.sql`)
     * rather than via `.references()` to keep the schema free of the
     * forward-reference cycle that TypeScript can't infer. Drizzle's relations
     * block below declares the relationship for query-builder consumers.
     */
    activeBatchId: text("active_batch_id"),
    /**
     * Discriminator for type-specific templates (TYPE-01):
     *   - `peptide`   — existing peptide template
     *   - `cosmetic`  — peptide + dermal-research-only framing
     *   - `reagent`   — solvents, diluents (sterility / endotoxin focus)
     *   - `supplies`  — kits, water, packaging
     * Default `peptide` keeps the pre-migration catalogue unchanged.
     */
    productType: text("product_type").notNull().default("peptide"),
    /**
     * Type-specific spec bag, validated by per-type Zod schemas in
     * `lib/products/specs/`. See `PHASE2_CATALOGUE_DESIGN.md` §6.
     */
    specJson: jsonb("spec_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_active_batch_idx").on(t.activeBatchId),
    index("products_product_type_idx").on(t.productType),
    check(
      "products_product_type_check",
      sql`${t.productType} IN ('peptide', 'cosmetic', 'reagent', 'supplies')`,
    ),
  ],
)

export const productTranslations = pgTable(
  "product_translations",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    marketingCopy: text("marketing_copy"),
  },
  (t) => [uniqueIndex("product_translations_idx").on(t.productId, t.locale)],
)

export const vials = pgTable(
  "vials",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /**
     * Typed size for both peptide actives (Mass) and reagents (Volume / Count).
     * Replaces the old `sizeMg` column (kept in this release for backward
     * compatibility; drop in a follow-up migration once all consumers
     * are migrated). See `PHASE2_CATALOGUE_DESIGN.md` §2.2.
     */
    sizeMg: doublePrecision("size_mg"),
    sizeValue: doublePrecision("size_value").notNull(),
    sizeUnit: text("size_unit").notNull(),
    sku: text("sku").notNull().unique(),
    /**
     * Nullable: rows with `purchase_mode = 'quotation'` MUST have a null price.
     * Enforced by `vials_purchase_mode_price_check` below.
     */
    priceCents: integer("price_cents"),
    compareAtCents: integer("compare_at_cents"),
    stockQty: integer("stock_qty").notNull().default(0),
    /**
     * Nullable: NULL suppresses the "low stock" badge entirely (used for
     * `quotation` and `unavailable` rows that have no meaningful stock UX).
     */
    lowStockThreshold: integer("low_stock_threshold").default(5),
    /**
     * How this vial is sold:
     *   - `direct`       — payable via standard checkout.
     *   - `quotation`    — never payable; renders a "Contact for quote" CTA.
     *   - `unavailable`  — visible for context, not buyable.
     * Default `direct` is the safe pre-migration state; backfill updates AOD-5.
     */
    purchaseMode: text("purchase_mode").notNull().default("direct"),
  },
  (t) => [
    index("vials_product_idx").on(t.productId),
    index("vials_purchase_mode_idx").on(t.purchaseMode),
    check(
      "vials_purchase_mode_check",
      sql`${t.purchaseMode} IN ('direct', 'quotation', 'unavailable')`,
    ),
    check(
      "vials_size_unit_check",
      sql`${t.sizeUnit} IS NULL OR ${t.sizeUnit} IN ('mg', 'g', 'mcg', 'mL', 'uL', 'vial')`,
    ),
    check(
      "vials_purchase_mode_price_check",
      sql`(${t.purchaseMode} = 'quotation' AND ${t.priceCents} IS NULL) OR (${t.purchaseMode} IN ('direct', 'unavailable'))`,
    ),
  ],
)

export const batches = pgTable(
  "batches",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    vialId: text("vial_id")
      .notNull()
      .references(() => vials.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    manufacturedAt: timestamp("manufactured_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    hplcPurity: doublePrecision("hplc_purity").notNull(),
    endotoxinEUPerMg: doublePrecision("endotoxin_eu_per_mg").notNull(),
    msConfirmed: boolean("ms_confirmed").notNull().default(true),
    lab: text("lab").notNull(),
    coaPdfR2Key: text("coa_pdf_r2_key"),
    verificationStatus: text("verification_status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("batches_vial_idx").on(t.vialId)],
)

export const coaTests = pgTable(
  "coa_tests",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    testName: text("test_name").notNull(),
    method: text("method").notNull(),
    result: text("result").notNull(),
    spec: text("spec"),
    pass: boolean("pass").notNull(),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coa_tests_batch_idx").on(t.batchId)],
)

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    number: text("number").notNull().unique(),
    userId: text("user_id").references(() => users.id),
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    currency: text("currency").notNull().default("EUR"),
    /**
     * Guardrail: orders are EUR-only at present but every line is tagged
     * with the currency it was priced in, so a future multi-currency SKU
     * cannot silently convert. See `PHASE2_CATALOGUE_DESIGN.md` §2.6
     * (INV-2).
     */
    currencyPerLine: text("currency_per_line").notNull().default("EUR"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    vatCents: integer("vat_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    cryptoChargeId: text("crypto_charge_id"),
    cryptoTxHash: text("crypto_tx_hash"),
    billingAddressId: text("billing_address_id").references(() => addresses.id),
    shippingAddressId: text("shipping_address_id").references(() => addresses.id),
    /** Coinbase hosted-page URL — surfaced in receipts and admin queues. */
    invoiceUrl: text("invoice_url"),
    /**
     * Populated at confirmation time. EUR is the commercial total; for crypto
     * orders the EUR / crypto rate at confirmation is preserved for
     * accounting reconciliation (§10 of the plan).
     */
    paymentProviderFeeCents: integer("payment_provider_fee_cents"),
    exchangeRateEurPerUnit: doublePrecision("exchange_rate_eur_per_unit"),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    locale: text("locale").notNull().default("en"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsVersion: text("terms_version"),
    checkoutKey: text("checkout_key").unique(),
    checkoutHash: text("checkout_hash"),
    paymentMethod: text("payment_method").notNull().default("stripe"),
    vatId: text("vat_id"),
  },
  (t) => [
    index("orders_user_placed_idx").on(t.userId, t.placedAt),
    index("orders_status_idx").on(t.status),
  ],
)

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    vialId: text("vial_id")
      .notNull()
      .references(() => vials.id),
    qty: integer("qty").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    batchId: text("batch_id").references(() => batches.id),
    skuSnapshot: text("sku_snapshot"),
    batchCodeSnapshot: text("batch_code_snapshot"),
    nameSnapshot: text("name_snapshot"),
    sizeValueSnapshot: doublePrecision("size_value_snapshot"),
    sizeUnitSnapshot: text("size_unit_snapshot"),
  },
  (t) => [
    uniqueIndex("order_items_order_vial_idx").on(t.orderId, t.vialId),
    index("order_items_vial_idx").on(t.vialId),
  ],
)

/**
 * Inventory reservations — TTL-aware hold against a vial while payment is in flight.
 *
 * Replaces the previous "decrement vials.stockQty at order time, restore on
 * failure" pattern with a reservation whose `expires_at` is set at order
 * creation (default +15 minutes). The Stripe / Coinbase webhook handlers and
 * the explicit failure path both set `released_at`; a cron reaper
 * (`releaseExpiredReservations`) frees stuck holds every 5 minutes.
 *
 * INV-1: stock decrements used to have no TTL, so a stuck checkout could
 * hold inventory indefinitely. See `PHASE2_CATALOGUE_DESIGN.md` §2.4.
 */
export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    vialId: text("vial_id")
      .notNull()
      .references(() => vials.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_reservations_vial_idx").on(t.vialId, t.releasedAt),
    index("inventory_reservations_expires_idx")
      .on(t.expiresAt)
      .where(sql`${t.releasedAt} IS NULL`),
    check("inventory_reservations_qty_positive", sql`${t.qty} > 0`),
  ],
)

export const shipments = pgTable(
  "shipments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text("carrier").notNull(),
    service: text("service").notNull(),
    trackingNumber: text("tracking_number"),
    labelUrl: text("label_url"),
    status: text("status").notNull().default("label_created"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("shipments_order_idx").on(t.orderId),
    index("shipments_delivered_idx").on(t.deliveredAt),
  ],
)

export const rewardsAccounts = pgTable("rewards_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pointsBalance: integer("points_balance").notNull().default(0),
  tier: text("tier").notNull().default("apex"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by").references(() => users.id),
})

export const referralRedemptions = pgTable("referral_redemptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id),
  referrerCreditCents: integer("referrer_credit_cents").notNull().default(1500),
  referredDiscountCents: integer("referred_discount_cents").notNull().default(1500),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const partnerApplications = pgTable("partner_applications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orgName: text("org_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  country: text("country").notNull(),
  useCase: text("use_case"),
  volume: integer("volume"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const bannedCountries = pgTable("banned_countries", {
  code: text("code").primaryKey(),
  reason: text("reason"),
})

/* ──────────────────────────────────────────────────────────────────────────
 * COMMUNITY / FORUM — ported from helix-labs-store v1
 * ────────────────────────────────────────────────────────────────────────── */

export const forumCategories = pgTable(
  "forum_categories",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    nameKey: text("name_key").notNull(),
    descriptionKey: text("description_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_categories_sort_idx").on(t.sortOrder)],
)

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    categoryId: text("category_id")
      .notNull()
      .references(() => forumCategories.id),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"), // active | locked | removed
    viewCount: integer("view_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_threads_category_idx").on(t.categoryId, t.lastActivityAt),
    index("forum_threads_author_idx").on(t.authorId),
    index("forum_threads_status_idx").on(t.status),
    index("forum_threads_status_activity_idx").on(t.status, t.lastActivityAt),
  ],
)

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    threadId: text("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    parentPostId: text("parent_post_id"),
    body: text("body").notNull(),
    status: text("status").notNull().default("active"), // active | edited | removed
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_posts_thread_idx").on(t.threadId, t.createdAt),
    index("forum_posts_author_idx").on(t.authorId),
  ],
)

export const forumReactions = pgTable(
  "forum_reactions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // helpful | insightful | thanks
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("forum_reactions_uniq").on(t.postId, t.userId, t.kind),
    index("forum_reactions_post_idx").on(t.postId),
  ],
)

export const forumReports = pgTable(
  "forum_reports",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    detail: text("detail"),
    status: text("status").notNull().default("open"), // open | reviewed | dismissed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_reports_post_idx").on(t.postId),
    index("forum_reports_status_idx").on(t.status),
    index("forum_reports_status_created_idx").on(t.status, t.createdAt),
  ],
)

export const forumModerationEvents = pgTable(
  "forum_moderation_events",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    targetType: text("target_type").notNull(), // post | thread
    targetId: text("target_id").notNull(),
    layer: text("layer").notNull(), // lexical | agent | human
    verdict: text("verdict").notNull(), // allow | warn | remove
    ruleCodes: text("rule_codes").array(),
    note: text("note"),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_mod_target_idx").on(t.targetType, t.targetId),
    index("forum_mod_layer_idx").on(t.layer),
    index("forum_mod_verdict_created_idx").on(t.verdict, t.createdAt),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * SAVED RESEARCH PLANS — Track 3 of v1→v2 migration
 *
 * A "research plan" is a curated bundle of products + notes that a member
 * can save privately or share publicly via a 9-byte base64url slug.
 * Ported from helix-labs-store v1 (`app/plans/`, `app/api/plans/`).
 * ────────────────────────────────────────────────────────────────────────── */

export const researchPlans = pgTable(
  "research_plans",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    shareSlug: text("share_slug").unique(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("research_plans_owner_idx").on(t.ownerId),
    index("research_plans_created_idx").on(t.createdAt),
  ],
)

export const researchPlanItems = pgTable(
  "research_plan_items",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    planId: text("plan_id")
      .notNull()
      .references(() => researchPlans.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("research_plan_items_plan_idx").on(t.planId, t.sortOrder),
    uniqueIndex("research_plan_items_plan_product_idx").on(t.planId, t.productId),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * ACTIVITY EVENTS — append-only public-safe log
 *
 * Powers the home-page activity feed. Events have strict payload whitelists
 * per kind so the feed never leaks private user data.
 * ────────────────────────────────────────────────────────────────────────── */

export const activityEvents = pgTable(
  "activity_events",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    kind: text("kind").notNull(), // thread_created | post_created | reaction_added | batch_status_changed | product_status_published | research_note_published | plan_shared
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    targetType: text("target_type"), // thread | post | product | batch | plan | post
    targetId: text("target_id"),
    targetSlug: text("target_slug"),
    targetTitle: text("target_title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_events_kind_idx").on(t.kind, t.createdAt),
    index("activity_events_created_idx").on(t.createdAt),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * NOTIFICATIONS — in-app inbox for replies, reactions, mentions
 * ────────────────────────────────────────────────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // reply | reaction | mention | system | plan_shared
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    targetType: text("target_type"), // thread | post | plan | product
    targetId: text("target_id"),
    targetSlug: text("target_slug"),
    targetTitle: text("target_title"),
    preview: text("preview"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt, t.createdAt)],
)

/* ──────────────────────────────────────────────────────────────────────────
 * NOTIFICATION PREFERENCES — per-user opt-out
 * ────────────────────────────────────────────────────────────────────────── */

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  replyEnabled: boolean("reply_enabled").notNull().default(true),
  reactionEnabled: boolean("reaction_enabled").notNull().default(true),
  mentionEnabled: boolean("mention_enabled").notNull().default(true),
  planSharedEnabled: boolean("plan_shared_enabled").notNull().default(true),
  emailDigest: boolean("email_digest").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/* ──────────────────────────────────────────────────────────────────────────
 * AUDIT LOG — every admin action
 * ────────────────────────────────────────────────────────────────────────── */

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    actorId: text("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_actor_idx").on(t.actorId, t.createdAt),
    index("audit_log_entity_idx").on(t.entity, t.entityId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * DOCUMENTS — typed document viewer (COA, SDS, HPLC, METHOD, NMR, SPEC, MSDS)
 *
 * Ported from helix-labs-store v1 (`app/documents/[id]`). The 7-type
 * taxonomy is fixed; each row links to a product and (optionally) a batch.
 * `fileR2Key` is a Cloudflare R2 object key; signed URLs are issued
 * server-side on read.
 * ────────────────────────────────────────────────────────────────────────── */

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    type: text("type").notNull(), // coa | sds | hplc | method | nmr | spec | msds
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    batchId: text("batch_id").references(() => batches.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    version: text("version").notNull().default("1.0"),
    fileR2Key: text("file_r2_key"),
    externalUrl: text("external_url"),
    /**
     * Per-locale visibility for the public documents index. The plan launches
     * with FI + EN reviewed; rows whose `display_locales` does not include
     * the current locale are filtered out of the public view but remain
     * visible in the admin queue.
     */
    displayLocales: text("display_locales").array().notNull().default(sql`ARRAY['en','fi','de','sv','nl']::text[]`),
    /** Hidden behind authentication when true. Default false. */
    requiresLogin: boolean("requires_login").notNull().default(false),
    /** Tracked so admin tools can warn when a signed URL is about to lapse. */
    signedUrlExpiresAt: timestamp("signed_url_expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documents_type_idx").on(t.type, t.publishedAt),
    index("documents_product_idx").on(t.productId),
    index("documents_batch_idx").on(t.batchId),
  ],
)

export const gdprRequests = pgTable(
  "gdpr_requests",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // export | delete
    status: text("status").notNull().default("pending"), // pending | confirmed | completed | failed
    token: text("token").unique(), // single-use confirmation token (Art. 17)
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    exportR2Key: text("export_r2_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_requests_user_idx").on(t.userId, t.kind)],
)

/**
 * Webhook idempotency ledger. Providers deliver at-least-once; the (id)
 * primary key makes "have we processed this event?" a single insert check.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(), // stripe | coinbase
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_events_provider_idx").on(t.provider, t.receivedAt)],
)

/** Durable delivery queue. A state change and its notification are committed together. */
export const emailOutbox = pgTable("email_outbox", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  dedupeKey: text("dedupe_key").notNull().unique(),
  recipient: text("recipient").notNull(),
  replyTo: text("reply_to"),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const quoteRequests = pgTable("quote_requests", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  requestKey: text("request_key").notNull().unique(),
  sku: text("sku").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  organisation: text("organisation"),
  message: text("message"),
  locale: text("locale").notNull().default("en"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Newsletter subscribers — double opt-in (EU/GDPR requirement).
 * Only `confirmed` subscribers may receive marketing email.
 */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull().default("pending"), // pending | confirmed | unsubscribed
    confirmToken: text("confirm_token"),
    confirmExpiresAt: timestamp("confirm_expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("newsletter_status_idx").on(t.status, t.createdAt)],
)

// Re-export AI schema
export {
  EMBEDDING_DIM,
  aiConversations,
  aiDocumentChunks,
  aiDocuments,
  aiMessages,
  supportTickets,
  userMemories,
} from "./ai"

/**
 * Relations live in `./relations` to break the runtime cycle that would
 * otherwise form between this file and the relations module (which imports
 * the table objects from here). Import relations directly from
 * `@/db/schema/relations` when needed. No current consumer in the app
 * references the relations symbols, so removing the re-export from
 * `@/db/schema` is safe.
 */
