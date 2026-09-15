# V1 → V2 Migration Plan
## Bringing the best of `helix-labs-store` into `averianlabs-web`

> Companion to `PLAN.md` and `AI_AGENT_PLAN.md`. The v1 site at `/Users/samuelhyle/helix-labs-store` has been audited in full (see audit notes at end). This document is the concrete carry-over plan.

---

## TL;DR

The new AverianLabs stack is already strong on **commerce + 3D + design**. V1's standout wins were **community, AI moderation, reputation, and the editorial depth model** (research notes + glossary + documents + saved plans). Carry those forward; do **not** duplicate the dual-theme CSS-token system (we already have Tailwind v4 + shadcn tokens) or the dual-locale routing (we've committed to one `next-intl` model).

Three carry-over tracks, ranked by impact:

| # | Track | Effort | Why it matters |
|---|---|---|---|
| **1** | **Community / Forum system** | M (2–3 weeks) | The single most distinctive v1 feature. Zero competitors in the EU peptide space have this. |
| **2** | **Editorial depth layer** (glossary, documents, authors, citations engine) | M (1–2 weeks) | What makes the catalog feel like a research library, not a shop. |
| **3** | **Member account depth + saved plans + GDPR + activity feed** | S–M (1–2 weeks) | Member retention + regulatory peace of mind. |

Plus two **smarter than v1** replacements that we should NOT copy verbatim:

- **AI moderation pipeline** — port the *idea* (3 layers: lexical → LLM → human), but rebuild natively against our existing `lib/ai` agent + Drizzle schema.
- **Reputation & reactions** — port, but rewire to use our **existing Auth.js + session** instead of v1's home-rolled auth.

---

## What we are NOT bringing forward

These are deliberately **dropped** in the v2 rebuild:

| V1 thing | Why we drop it |
|---|---|
| V1's dark "HELIX NOIR" tokens + dual-theme system | We have Tailwind v4 + shadcn tokens and a defined HSL palette in `PLAN.md §4.2`. |
| V1's custom CSS design system (3,211 lines) | Replaced by Tailwind v4 utility-first + shadcn primitives. |
| V1's home-rolled `hl_session` cookie auth | Replaced by Auth.js v5 (passkeys + OAuth + magic link). |
| V1's home-rolled `MiniMaxClient` | Replaced by our own `lib/ai/orchestrator.ts` (already built). |
| V1's 24-locale cookie-redirect fallback | Replaced by `next-intl` with a single sub-path model. |
| V1's admin shell (`/admin/*`) | Will be replaced by Drizzle Studio + minimal custom views in v2; not in scope here. |
| V1's `app/[lang]/_shared.ts` locale pass-through pattern | V2 has one model. |
| V1's `peerDependencies` blob of unused libs | V2 stack is intentionally lean. |

---

## Track 1 — Community / Forum system (PRIORITY 1)

> Source of truth: `helix-labs-store/app/community/**`, `helix-labs-store/lib/forum/**`, `helix-labs-store/components/forum/**`, `helix-labs-store/app/api/forum/**`, `helix-labs-store/lib/db/schema.ts` (the `forum*` tables).

### 1.1 What to port

A complete, production-grade community with:

- **7 seed categories**: announcements, research-discussion, documentation-coa, methods-analysis, storage-handling, market-compliance, off-topic-lounge.
- **Threads + posts + replies** with slug-based URLs.
- **Reactions** (Helpful / Insightful / Thanks) — toggle endpoint, rate-limited.
- **Reports** — reason + detail, feeds moderation queue.
- **Reputation system** — 5 tiers (New → Fellow at 250 pts), +1 per reaction, leaderboard.
- **Activity events log** — append-only public-safe feed powering the homepage widget.
- **Three-layer moderation** — see §1.3.

### 1.2 New routes to add

```
app/[locale]/
  community/
    page.tsx                    # Hub: 7 categories grid, leaderboard, latest threads, rules notice
    activity/page.tsx           # "Today in peptide science" digest
    new/page.tsx                # New-thread composer (gated: signed-in)
    rules/page.tsx              # 7 explicit rules
    [category]/page.tsx         # Category board
    thread/[slug]/page.tsx      # Thread detail + reply box
```

API surface (route handlers):

```
app/api/forum/
  categories/route.ts           # GET
  threads/route.ts              # GET (list), POST (create, gated)
  threads/[id]/route.ts         # GET single, PATCH (lock/remove, mod-only)
  posts/route.ts                # POST reply (gated)
  reactions/route.ts            # POST toggle (gated, rate-limited)
  reports/route.ts              # POST (gated, rate-limited)
  moderation/route.ts           # GET queue (mod-only), POST verdict
```

### 1.3 Three-layer moderation pipeline (port the idea, rebuild the parts)

V1's pipeline is genuinely category-defining. Port the **architecture**, rebuild the **wiring** to match v2's auth/agent.

| Layer | V1 implementation | V2 implementation |
|---|---|---|
| **1. Lexical guard** | `lib/forum/guard.ts:71` — regex lexicon for claims, sourcing, contact info | Reuse the **same lexicon** (it's domain expertise). Wrap as `lib/community/guard.ts`. Runs synchronously before persist. |
| **2. LLM moderator** | `lib/forum/moderation-agent.ts:88` — async post-create, in-process cache | New: `lib/community/moderation-agent.ts` that calls **our existing** `lib/ai/orchestrator.ts` with a new prompt `lib/ai/prompts/community-moderator.md`. Fire-and-forget after persist; persist verdict to `forum_moderation_events`. |
| **3. Human queue** | `/admin/moderation` | New: `/admin/moderation` page (or a sidebar tab in the existing admin shell) with Allow / Keep flagged / Remove buttons. |

Verdict states: `allow | warn | remove`. Every layer writes to the same audit table. UI shows users a soft warning banner when content was flagged but kept (no public shaming).

### 1.4 Database additions

Append to `db/schema/index.ts`:

```ts
// Categories (seeded, rarely changes)
forumCategories: pgTable("forum_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),         // "research-discussion"
  nameKey: text("name_key").notNull(),           // i18n key, not the name itself
  descriptionKey: text("description_key").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Threads
forumThreads: pgTable("forum_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => forumCategories.id),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"), // active | locked | removed
  viewCount: integer("view_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byCategory: index("forum_threads_category_idx").on("t.categoryId", "t.lastActivityAt"),
}))

// Posts (the OP and replies live in the same table)
forumPosts: pgTable("forum_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => forumThreads.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  parentPostId: uuid("parent_post_id"),          // for nested replies (nullable)
  body: text("body").notNull(),
  status: text("status").notNull().default("active"), // active | edited | removed
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Reactions — one row per (post, user, kind)
forumReactions: pgTable("forum_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                  // "helpful" | "insightful" | "thanks"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("forum_reactions_uniq").on("t.postId", "t.userId", "t.kind"),
}))

// Reports
forumReports: pgTable("forum_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),              // 3–200 chars
  detail: text("detail"),                        // ≤1000 chars
  status: text("status").notNull().default("open"), // open | reviewed | dismissed
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Moderation audit (every verdict, every layer)
forumModerationEvents: pgTable("forum_moderation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(),     // "post" | "thread"
  targetId: uuid("target_id").notNull(),
  layer: text("layer").notNull(),                // "lexical" | "agent" | "human"
  verdict: text("verdict").notNull(),            // "allow" | "warn" | "remove"
  ruleCodes: text("rule_codes").array(),
  note: text("note"),
  actorId: text("actor_id"),                     // null for lexical/agent, user id for human
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Reputation is a column on users (denormalized)
users.reputation = integer("reputation").notNull().default(0)
users.reputationTier = text("reputation_tier").notNull().default("new") // new|contributor|analyst|senior|fellow
```

### 1.5 Auth wiring

Use **Auth.js v5** (already in v2 stack) instead of v1's home-rolled sessions. We need:

- A `lib/community/auth.ts` that exposes `getCurrentMember()` (returns `{ id, role, reputation, tier } | null`).
- Server Actions / route handlers check the session; unauthenticated requests get `401` for write endpoints.
- Admin/moderator endpoints additionally check `session.user.role === "moderator" | "admin"`.

### 1.6 Rate limiting

Use the **same** `@upstash/ratelimit` we already wire for `/api/auth/*` — see `PLAN.md §14`. Apply limits:

| Endpoint | Limit |
|---|---|
| `POST /api/forum/threads` | 5 / hour / user |
| `POST /api/forum/posts` | 20 / hour / user |
| `POST /api/forum/reactions` | 60 / hour / user |
| `POST /api/forum/reports` | 10 / hour / user |

### 1.7 UI / components to port

| V1 file | V2 target |
|---|---|
| `components/forum/thread-composer.tsx` | `components/community/thread-composer.tsx` — use shadcn `<Form>` + `<Textarea>` instead of `composer` CSS class. Keep the **client-side pre-check regex** (it's UX, not security). |
| `components/forum/reply-box.tsx` | `components/community/reply-box.tsx` |
| `components/forum/reaction-bar.tsx` | `components/community/reaction-bar.tsx` — wrap with TanStack Query mutation. |
| `app/community/page.tsx` | Rebuild with our `<Card>` + `<Badge>` primitives. Keep the **leaderboard + categories grid + latest threads** layout — it works. |
| Forum status pills / role badges | Translate v1's `.role-badge.{member,moderator,admin,tier}` CSS into shadcn `<Badge variant=...>`. |

### 1.8 i18n

Add message keys under `messages/{locale}.json` → `community.*` namespace. Categories are **translatable** — store `name_key` / `description_key` in the DB and look up via `useTranslations("community.categories.<slug>")`. This keeps category rows locale-agnostic.

### 1.9 SEO

- Hreflang alternates per thread + category.
- JSON-LD `DiscussionForumPosting` on thread pages.
- Each thread gets a `/og?slug=...` dynamic OG image (we already have the route).

### 1.10 Acceptance criteria

- [ ] All 6 routes render (no 500s) with seed data.
- [ ] Authenticated user can post a thread; unauthenticated user is redirected to sign-in.
- [ ] Lexical guard blocks a post containing "treats cancer" + an email address.
- [ ] LLM moderator runs async, verdict persists, UI shows warn banner when applicable.
- [ ] Moderator can allow / keep / remove from `/admin/moderation`.
- [ ] Reactions increment reputation by 1; leaderboard re-ranks within 30 s.
- [ ] Activity feed picks up new threads within 30 s (polling fallback, SSE later).
- [ ] Rate limits trip correctly on bursts.

---

## Track 2 — Editorial depth layer

> Source: v1's `app/glossary/**`, `app/blog/**` (MDX), `content/glossary/*`, `content/authors/*`, `app/documents/[id]/page.tsx`, the citation-chip system in `components/agent/citation-chip.tsx`.

### 2.1 Glossary

V1 had 35 MDX-backed glossary terms (HPLC, mass-spec, NMR, COA, lyophilization, etc.). V2 has Sanity for blog but **no glossary**. Add one.

**Decision needed**: Sanity vs. MDX-in-repo?

| Option | Pros | Cons |
|---|---|---|
| **Sanity schema `glossaryTerm`** | Editors can author without deploy. Same pipeline as blog. | One more type to manage. |
| **MDX in `content/glossary/`** | Versioned alongside code. Same as v1. | No editor UI; needs a PR. |

**Recommendation**: **Sanity**. It's already in v2; one more type is cheap; the editorial team owns this content.

**Sanity schema sketch** (`sanity/schemas/glossaryTerm.ts`):

```ts
{
  name: "glossaryTerm",
  type: "document",
  fields: [
    { name: "term", type: "string", validation: (r) => r.required() },
    { name: "slug", type: "slug", options: { source: "term" }, validation: (r) => r.required() },
    { name: "category", type: "string", options: { list: ["Analytical","Chemistry","Compliance","Logistics","Product"] } },
    { name: "shortDefinition", type: "text", rows: 2, validation: (r) => r.required().max(280) },
    { name: "body", type: "portableText" },                      // Portable Text
    { name: "relatedProductSlugs", type: "array", of: [{ type: "string" }] },
    { name: "relatedTerms", type: "array", of: [{ type: "reference", to: [{ type: "glossaryTerm" }] }] },
    { name: "seoTitle", type: "string" },
    { name: "seoDescription", type: "string" },
  ],
}
```

**New routes**:

```
app/[locale]/glossary/
  page.tsx              # Index grouped by category, A–Z
  [slug]/page.tsx       # Term detail with related peptides + related terms
```

**Port the lookup-to-product linking** from v1 — when a product detail page mentions "HPLC", render an inline `<Link>` to `/glossary/hplc`. This is the small touch that makes the site feel like a research library.

### 2.2 Authors

V1 referenced authors but had empty `content/authors/`. V2's blog in Sanity should support an `author` document:

```ts
{
  name: "author",
  type: "document",
  fields: [
    { name: "name", type: "string", validation: (r) => r.required() },
    { name: "slug", type: "slug" },
    { name: "role", type: "string" },                              // "Editorial lead", "Scientific reviewer", etc.
    { name: "bio", type: "text" },
    { name: "avatar", type: "image" },
  ],
}
```

Add `/blog/author/[slug]` route (v1 had `/authors/[slug]` — align with our blog folder).

### 2.3 Documents viewer

V1 had a typed document viewer at `/documents/[id]` supporting 7 types (COA / SDS / HPLC / METHOD / NMR / SPEC / MSDS). V2 only has `/coa/[batchId]`.

**Recommendation**: extend `/coa/[batchId]` to handle all 7 types, OR add a sibling `/documents/[id]` route. The second is cleaner — COA is one document type, not the whole taxonomy.

Add to DB schema:

```ts
documents: pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),     // coa | sds | hplc | method | nmr | spec | msds
  productId: uuid("product_id").references(() => products.id),
  batchId: uuid("batch_id").references(() => batches.id),
  title: text("title").notNull(),
  version: text("version").notNull(),  // semver
  fileR2Key: text("file_r2_key").notNull(),
  publishedAt: timestamp("published_at").notNull(),
})
```

The viewer renders metadata + embeds the PDF (R2 signed URL, time-limited).

### 2.4 Citation engine

V1's `components/agent/citation-chip.tsx:40` rendered colour-coded chips for **field / doc / market / thread** citations. This is what made the AI agent feel grounded.

**Port this to v2**: add `components/ai/citation-chip.tsx` and update our existing AI agent prompt (`lib/ai/prompts/system.ts`) to instruct the model to emit structured citations. Use a discriminated union:

```ts
type Citation =
  | { kind: "field"; label: string; anchor: string }                     // jump to product field
  | { kind: "doc"; label: string; documentId: string }                  // open /documents/[id]
  | { kind: "market"; label: string; marketCode: string }               // show eligibility rule
  | { kind: "thread"; label: string; threadSlug: string }               // jump to forum thread
```

Parse with a tolerant regex (`\[cite:(\w+)\s+([^\]]+)\]`), render with one `<CitationChip>` component.

### 2.5 Standards / Lab tests

V1 had `/standards/{eligibility,methodology,audit}` pages. V2 has `/lab-tests` (good — covers methodology). **Missing**: eligibility matrix + audit log.

**Recommendation**: build `/lab-tests/eligibility` (live matrix from `market_rules` table) — this is a real differentiator vs. competitors who hide eligibility until checkout. Skip the audit page (v1's was hardcoded demo data).

### 2.6 Acceptance criteria

- [ ] `/glossary` renders ≥ 10 seeded terms grouped by category.
- [ ] Glossary terms link back to products they relate to.
- [ ] `/blog/author/[slug]` renders for any author referenced by a published post.
- [ ] `/documents/[id]` renders for all 7 document types with metadata + signed R2 URL.
- [ ] AI agent emits structured citations and the chip renders in the chat panel.

---

## Track 3 — Member account depth + saved plans + GDPR + activity

> Source: v1's `app/account/**`, `app/plans/[slug]/page.tsx`, `app/api/account/{export,delete}`, `lib/activity/emit.ts`, `components/activity/activity-feed.tsx`.

### 3.1 Saved research plans

V1's killer feature that v2 lacks. A "research plan" is a curated bundle of products + notes (e.g. "tendon repair panel — BPC-157 + TB-500 + GHK-Cu") that:

- Saves to the user's account
- Can be **shared publicly** with a 9-byte base64url slug at `/[locale]/plans/[slug]`
- Re-evaluates eligibility whenever products in it change

**New routes**:

```
app/[locale]/account/
  plans/page.tsx                     # list user's saved plans
  plans/[id]/page.tsx                # edit + share
app/[locale]/plans/
  [slug]/page.tsx                    # public read-only shared plan
app/api/plans/
  route.ts                           # POST create
  [id]/route.ts                      # GET / PATCH / DELETE
  [id]/share/route.ts                # POST → returns share slug
  share/[slug]/route.ts              # GET public plan
```

**DB additions**:

```ts
researchPlans: pgTable("research_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  shareSlug: text("share_slug").unique(),  // 9-byte base64url when shared
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

researchPlanItems: pgTable("research_plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => researchPlans.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
})
```

**UI**: a "Save to plan" button on every product card → opens a modal listing the user's existing plans + "Create new". Server action handles add/remove. Share action returns a copyable URL.

### 3.2 Account dashboard enhancements

V2 has `/account`. Add:

- **Saved plans** card (links to `/account/plans`).
- **COA library** card — links to documents the user has explicitly saved (track via a `savedDocuments` table).
- **Recently viewed** — last 10 products viewed (session-scoped, optional persist for authed users).
- **Reputation card** — tier badge + progress bar to next tier (depends on Track 1 community).

### 3.3 GDPR endpoints

V2 needs DSAR endpoints (Art. 20 export + Art. 17 delete). Port from v1:

```
app/api/account/
  export/route.ts    # GET → returns a JSON + zip of all user data
  delete/route.ts    # DELETE → soft-deletes user; hard-deletes after 30d grace
```

UI buttons in `/account` with confirm modal + 24-h cool-down.

### 3.4 Activity feed

V1's `components/activity/activity-feed.tsx:71` was a homepage widget driven by SSE with a polling fallback. V2 should add:

- `lib/activity/emit.ts` — server-side helper called from product/batch/thread mutations.
- `app/api/activity/stream/route.ts` — SSE endpoint.
- `components/home/activity-feed.tsx` — homepage widget (replaces one of the home sections).

Events to surface (mirroring v1): `thread_created | post_created | reaction_added | batch_status_changed | product_status_published | research_note_published | plan_shared`.

### 3.5 Acceptance criteria

- [ ] Authenticated user can create / rename / delete a research plan.
- [ ] "Save to plan" modal works from product cards.
- [ ] Sharing a plan returns a `/plans/<slug>` URL accessible without auth.
- [ ] GDPR export downloads within 60 s and contains all user-owned rows.
- [ ] GDPR delete soft-deletes immediately; admin can see "pending purge" badge.
- [ ] Activity feed shows latest 5 events within 30 s of creation.

---

## Cross-cutting concerns

### Migration order (suggested)

1. **Track 1 community** — biggest feature, unlocks the others (activity feed consumes community events).
2. **Track 2 glossary + documents + citations** — these make the catalog and the AI agent feel grounded.
3. **Track 3 saved plans + GDPR + activity feed** — completes the member experience.

Suggested timeline: **5–6 weeks** of focused work (roughly Phase 8 in the v2 PLAN.md).

### Things that overlap with existing v2 work

| Item | Already in v2? | Owner |
|---|---|---|
| Auth.js v5 with sessions | Yes (`lib/auth`) | Reuse for community auth checks. |
| Drizzle + Postgres | Yes (`db/schema`) | Extend with community + plans + documents tables. |
| Tailwind v4 + shadcn/ui | Yes (`components/ui`) | Use shadcn primitives for forum UI. |
| AI agent orchestrator | Yes (`lib/ai`) | Add `community-moderator.md` prompt; teach the agent to emit citations. |
| i18n with next-intl | Yes (`messages/`) | Add `community.*`, `glossary.*`, `plans.*` keys for ≥ EN, FI, DE. |
| Upstash rate limiting | Yes (`lib/utils` or `lib/security`) | Reuse for forum endpoints. |
| Sanity | Yes (`sanity/schemas/`) | Add `glossaryTerm`, `author` types. |
| React Hook Form + Zod | Yes (per PLAN.md §3.1) | Use for thread / reply composers. |

### Risks specific to this migration

- **Lexical guard lexicon is the secret sauce.** When porting, treat it as a single source of truth in `lib/community/guard.ts` with a unit test that pins every forbidden pattern. Do NOT scatter the patterns across components.
- **LLM moderator latency.** Fire-and-forget after persist — never block the user. If the LLM is slow/down, the post should still be `active`; the moderator can re-evaluate from the queue.
- **Forum SEO.** Each thread is a public URL with author + body visible to crawlers. Add `noindex` for thin threads (< 3 words) and a "duplicate content" canonical to the category.
- **Reputation gaming.** Add a soft cap: a single user can grant at most 50 reputation points to another user across all their posts. Bake into the reactions service.
- **GDPR + reputation tension.** If a user is deleted, anonymise their posts (`authorId = null`) but keep the content (the conversation has value). Surface this in the privacy policy.

---

## Open questions before building

1. **Categories**: are v1's 7 categories right for v2, or do we want different ones (e.g. add "Stack protocols", drop "Off-topic lounge")?
2. **Anonymous posting**: v1 required sign-in to post. Do we keep that, or allow anonymous + captcha?
3. **Sanity glossary vs. MDX**: confirm Sanity before I start the schema.
4. **Admin surface**: do we want a real `/admin/moderation` page in v1 of community, or a queue inside Drizzle Studio / a TUI for v2?
5. **GDPR export format**: JSON zip (v1 default) vs. a single PDF report — which does our DPO prefer?
6. **Saved plans pricing**: do saved plans ever expire / do shared plans need to be re-evaluated for eligibility on every visit?

---

## V1 audit reference (where things came from)

| V1 path | What it contains |
|---|---|
| `helix-labs-store/app/community/**` | 6 community routes (hub, activity, new, rules, category, thread) |
| `helix-labs-store/lib/forum/service.ts` | 785 lines — full forum service (threads, posts, reactions, reports, reputation, moderation) |
| `helix-labs-store/lib/forum/guard.ts` | Lexical guard — claim lexicon, sourcing, contact info, URL limits |
| `helix-labs-store/lib/forum/reputation.ts` | 5-tier reputation system |
| `helix-labs-store/lib/forum/categories.ts` | 7 seeded categories |
| `helix-labs-store/lib/forum/moderation-agent.ts` | Async LLM moderator with in-process cache |
| `helix-labs-store/components/forum/**` | Composer, reply box, reaction bar |
| `helix-labs-store/app/api/forum/**` | 6 endpoint groups |
| `helix-labs-store/app/glossary/**` | Glossary index + term detail |
| `helix-labs-store/app/authors/[slug]` | Author pages |
| `helix-labs-store/app/documents/[id]` | Typed document viewer (7 types) |
| `helix-labs-store/app/account/**` | Member dashboard, saved plans, notifications |
| `helix-labs-store/app/plans/[slug]` | Public read-only shared plan viewer |
| `helix-labs-store/components/plans/save-to-plan-button.tsx` | Save-to-plan modal |
| `helix-labs-store/app/api/account/{export,delete}` | GDPR endpoints |
| `helix-labs-store/components/agent/citation-chip.tsx` | 4-kind citation chip (field/doc/market/thread) |
| `helix-labs-store/lib/activity/emit.ts` | Append-only public-safe activity log |
| `helix-labs-store/components/activity/activity-feed.tsx` | Homepage widget with SSE + polling fallback |
| `helix-labs-store/app/api/activity/{route,stream}` | Activity API |
| `helix-labs-store/lib/db/schema.ts` (forum sections) | Full forum schema reference |
| `helix-labs-store/LEGENDARY_IMPLEMENTATION_PLAN.md` | Strategic vision + roadmap (Phases A–I) |
| `helix-labs-store/ultimate_european_peptide_platform_plan.md` | Codebase-anchored plan with deviation log (D1–D8) |

---

*End of plan. Approve the open questions and I'll start with Track 1.*