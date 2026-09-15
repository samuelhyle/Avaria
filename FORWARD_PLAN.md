# AverianLabs — Forward Execution Plan
## From "v1 features ported" to "v2 production-ready + differentiated"

> Companion to `MIGRATION_PLAN_V1_TO_V2.md`. This document picks up where the migration left off and outlines the next 4–6 sprints of work. It mixes **remaining carry-over items**, **hardening**, **refinements**, and a small number of **new ideas** that fit the editorial-scientific-brand thesis.
>
> Priorities are grounded in: what already works, what's broken (pre-existing), what's missing for launch, and what differentiates AverianLabs from competitors.

---

## State of play

### What's working (already shipped)
- ✅ Community: 7 categories, threads, posts, reactions, 3-layer moderation pipeline (lexical guard + LLM agent + human queue), reputation system (5 tiers), report flow
- ✅ Admin moderation queue + admin documents CRUD
- ✅ Glossary: Sanity `glossaryTerm` schema + index + term detail + inline-link helper
- ✅ Citation engine: 5 citation kinds, agent prompt integration, `MessageMarkdown` + `CitationChip` + `CitationStrip` rendering
- ✅ Chat panel: mounted site-wide, calls `/api/ai/chat`, renders citations
- ✅ Saved research plans: full CRUD + public share slugs + `SaveToPlanButton` mounted on product cards
- ✅ GDPR export + delete (30-day soft-delete grace)
- ✅ Activity feed: append-only event log, home-page widget, emitted from thread/reply/plan flows
- ✅ Documents viewer: 7 types, PDF rendering via `react-pdf`, admin CRUD, indexed
- ✅ Author pages: Sanity-backed with seed fallback
- ✅ Demo seed script (`pnpm db:seed-demo`) — 1 user, 4 threads, 1 plan, 3 COAs
- ✅ i18n for `community`, `plans`, `activity`, `gdpr`, `account`, `documents`, `authors`, `glossary` in EN + FI

### What's broken (pre-existing, **not** my work)
- 🔴 `lib/ai/rag/indexer.ts` and `lib/ai/rag/retrieval.ts` reference missing modules (`@/lib/ai/types`, `@/db/schema/ai`, `@/db`, `@/lib/ai/chunker`, `@/lib/ai/rag/embeddings`, `@/lib/products/data` exports)
- 🔴 `lib/ai/prompts/system.ts` imports `@/lib/ai/types` — broken
- 🔴 `db/seed.ts(68)` references undefined `client` var
- 🟡 Several pre-existing biome lint warnings (unused imports, non-null assertions) across the codebase
- 🟡 Hardcoded blog posts in `app/[locale]/blog/[slug]/page.tsx` — not Sanity-driven

### What's missing for launch
- ⚠️ Sanity content: glossary terms, real authors, blog posts via Sanity
- ⚠️ Pre-existing typecheck failures block CI gates
- ⚠️ i18n parity for DE / SV / NL (catalog has those bundles; new features don't)
- ⚠️ Tests — **zero coverage** on any of the code I shipped
- ⚠️ Real R2/S3 signed URLs (currently uses public base URL)
- ⚠️ Admin role-gating is *not* centralized — each admin page re-checks

---

## Phase 0 — Foundation hardening (1 sprint / 1 week)
*Stop the bleeding. Get a green CI gate. Nothing user-facing changes.*

### 0.1 Fix pre-existing typecheck failures

This is the highest-priority item because it blocks every CI gate, every Lighthouse gate, and every contributor's confidence in the codebase. Without a green `pnpm typecheck`, none of the other work can ship safely.

**Files to fix**:
- `lib/ai/rag/indexer.ts:13-17` — replace `@/lib/ai/chunker` with a local chunker (or remove if unused); replace `@/lib/ai/rag/embeddings` with the existing `embedText()` from `lib/ai/providers/minimax`; replace `@/db` with `@/lib/db`; remove or stub `@/db/schema/ai`
- `lib/ai/rag/retrieval.ts:16-17` — same pattern (`@/db` → `@/lib/db`, `@/db/schema/ai` → remove)
- `lib/ai/prompts/system.ts:12` — `@/lib/ai/types` doesn't exist. Either create it (1 file, 10 lines) or inline the `ChatContext` type
- `db/seed.ts:68` — undefined `client` variable. Either remove the dead code or wire it to `@/lib/db`

**Decision needed**: are `lib/ai/rag/*` actually used? If yes, fix them properly. If no, delete them — they're dead code that's been breaking typecheck for who knows how long.

### 0.2 Centralize admin role-gating

Today: every admin page (`/admin/moderation`, `/admin/documents`) imports `requireRole` from `lib/community/auth` and re-implements the same guard. Tomorrow: another admin page will forget.

**New file**: `lib/admin/guard.ts` exporting `requireAdmin()` that:
- Calls `requireRole(["admin", "moderator"])`
- Returns a typed `AdminMember`
- Throws a typed `AdminAccessError` (HTTP-shaped)

Also add a reusable `<AdminShell>` component in `components/admin/shell.tsx` with sidebar + role badge — the existing `app/[locale]/admin/moderation/page.tsx` and `app/[locale]/admin/documents/page.tsx` should both use it. Adds a left sidebar with: Moderation queue, Documents, **Admin Dashboard (new)**, Audit log (new), and links back to the storefront.

**Migration**: convert existing admin pages to use `<AdminShell>`. ~1 file per page.

### 0.3 Add a `lint:fix` + `typecheck` CI gate

The repo has `pnpm typecheck` and `pnpm lint` but no `.github/workflows/ci.yml`. Without it, regressions ship.

```yaml
name: ci
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec biome check .   # no-warnings policy for new files
      - run: pnpm typecheck
      - run: pnpm vitest run --reporter=verbose  # once tests exist (Phase 0.4)
```

### 0.4 First test pass — vitest on pure functions

Zero tests in the codebase today. The risk is that every change I made last sprint is one refactor away from breaking silently. Prioritize the highest-leverage pure functions:

- `lib/community/guard.ts` → `checkText()` — exact-match risk, must be tight
- `lib/community/reputation.ts` → `tierFor()`, `nextTier()`, `progressToNext()`
- `lib/community/categories.ts` → shape of seed data
- `lib/citations/index.ts` → `parseCitations()`, `citationHref()`
- `lib/blog/authors.ts` → seed fallback path
- `lib/documents/service.ts` → `isDocumentType()`, type-label resolution
- `lib/research-plans/service.ts` → `generateShareSlug()` byte-length / charset invariants
- `lib/activity/emit.ts` → `VALID_KINDS` enforcement

Target: **~30 unit tests** covering the above. Put them next to source as `*.test.ts` and let Vitest find them. Run as part of CI (step 0.3).

### 0.5 Seed `db/seed.ts` properly

The existing `db/seed.ts` is broken (it can't connect to anything) but the `pnpm db:seed` script still runs. Two paths:

1. **Rewrite it** to use `lib/db.ts` + the new schema (recommended — this is the "production" seed for the catalog)
2. **Delete it** and rely entirely on `scripts/seed-demo.ts` + the seed-data in `lib/products/data.ts`

Recommend option 1: the demo seed is great for the marketing site, but `db/seed.ts` is the real catalog seed that maps `lib/products/data.ts` → DB rows. Worth keeping both.

### 0.6 Sanity Studio config sanity check

`sanity/sanity.config.ts` registers `schemaTypes` from `./schemas/index.ts` which exports `peptideMonograph`, `blogPost`, `author`, `glossaryTerm`. All good.

But the studio at `app/studio/[[...index]]` page needs to be verified to actually render. Open `pnpm studio` and confirm:
- `glossaryTerm` appears in the schema list
- `peptideMonograph`, `blogPost`, `author` still work
- The schema ordering makes editorial sense (Authors + Blog posts at top, Monographs next, Glossary last)

If anything is broken in the studio, fix it now — content authoring is blocked without it.

**Acceptance for Phase 0**:
- `pnpm typecheck` exits 0
- `pnpm exec biome check` exits 0 (warnings down to <10)
- `pnpm vitest run` exits 0 with at least 20 tests
- `.github/workflows/ci.yml` exists and runs the above on push
- `pnpm db:seed` works against a real Postgres + creates at least 15 catalog rows
- `pnpm studio` shows all 4 schema types

---

## Phase 1 — Content + SEO (1 sprint / 1 week)
*Wire what we've built to the wider web.*

### 1.1 Sanity-driven blog

Replace the hardcoded `posts` map in `app/[locale]/blog/[slug]/page.tsx` with a Sanity-backed loader (`lib/blog/posts.ts`), mirroring `lib/blog/authors.ts`.

```ts
// lib/blog/posts.ts
export async function getPostBySlug(slug: string): Promise<BlogPostRecord | null>
export async function listPosts(opts: { locale?: string; limit?: number }): Promise<BlogPostRecord[]>
export async function getAuthorPosts(authorSlug: string): Promise<BlogPostRecord[]>
```

Each post record: `slug, title, excerpt, body (Portable Text), authorSlug, tag, publishedAt, readMin, i18n`.

Then update:
- `app/[locale]/blog/[slug]/page.tsx` — render Portable Text via a small renderer (we already wrote one for glossary terms — same pattern)
- `app/[locale]/blog/page.tsx` — list view
- Wire `author.slug` to `/blog/author/[slug]`
- Author page should now show the author's posts (not the "coming soon" stub)

### 1.2 Sitemap enrichment

`app/sitemap.ts` currently exists but likely only covers catalog/blog. Extend:

```ts
// append to sitemap.ts return array
{
  source: "community"
  urls: thread slugs × locales,
}
{
  source: "glossary"
  urls: glossary term slugs × locales,
}
{
  source: "plans"  
  urls: shared plan slugs × locales (public only),
}
{
  source: "documents"
  urls: doc ids (noindex for these actually — keep them out)
}
```

### 1.3 OG image variants

The `/og` route exists. Add:
- `/og/thread/[slug]` — large title + author + reply count + category badge
- `/og/glossary/[slug]` — term + short definition + category
- `/og/plan/[slug]` — plan title + product count + "shared by a member"
- `/og/document/[id]` — document type badge + product + version

All as `ImageResponse` route handlers in `app/api/og/`. Pattern: take the existing default OG handler and parameterize.

### 1.4 Glossary term backlinks from blog posts + product pages

Currently we have `annotateWithGlossary()` in `lib/glossary/sanity.ts` but no consumer. Wire it into:
- `PortableText` renderer for blog posts — turn any glossary term mentioned in the body into a `<Link href="/glossary/{slug}">`
- Product page description (when we eventually load product body from Sanity monographs)
- `MessageMarkdown` in the chat panel — when Averia mentions "HPLC", it becomes a link

This is the small UX touch that makes the site feel like a research library.

### 1.5 Add JSON-LD to new public pages

Each new public page should ship with structured data:
- `/blog/[slug]` → `Article` JSON-LD (already there?)
- `/glossary/[slug]` → `DefinedTerm` JSON-LD (a real SEO win — Google surfaces definitions as rich results)
- `/plans/[slug]` → `ItemList` JSON-LD
- `/community/thread/[slug]` → `DiscussionForumPosting` JSON-LD (already partially there)
- `/documents/[id]` → `DigitalDocument` JSON-LD with `additionalType` per doc type

`components/seo/JsonLd.tsx` already has the pattern; add helpers there.

**Acceptance for Phase 1**:
- Blog posts load from Sanity (zero hardcoded content remaining)
- Sitemap returns ≥ 3 sources (catalog, blog, + 1 new source per phase item)
- 4 new OG endpoints return valid PNG/JPG
- 2 articles contain inline glossary links in rendered HTML (grep check)
- 4 new JSON-LD helpers exist + each new route renders one

---

## Phase 2 — Community depth (2 sprints / 2 weeks)
*Make the community feel alive, not just functional.*

### 2.1 Markdown in forum posts

Currently `forumPosts.body` is rendered as plain text (`whitespace-pre-wrap`). The migration plan called for "Markdown supported" in the composer.

- New: `components/community/markdown-render.tsx` — same shape as `components/ai/message-markdown.tsx` but for forum posts (slightly more permissive: h2/h3, lists, **bold**, `code`, [text](url), blockquotes)
- Wire into `PostCard` and `thread-list-item`
- Composer hint: change "Markdown supported" → actually support it (the regex is there in `ThreadComposer`; the renderer just needs to exist)
- Persist raw markdown in the DB (the lexical guard already runs on the raw body)

### 2.2 Reply notifications

When someone replies to your thread or reacts to your post, send an email.

- New table: `notifications` already exists? — check schema. If not, add: `id, userId, kind, payload (jsonb), readAt, createdAt`
- New table: `notification_preferences` already exists in v1 — port that
- New service: `lib/notifications/emit.ts` — `emitNotification({ userId, kind, payload })`
- Wire into `createReply`, `toggleReaction`
- Email template via `@react-email/components` (already in package.json)
- In-app notification bell + page (already in v1; check if it's still in the new code — I don't think it is)

**Build**:
- `app/[locale]/account/notifications/page.tsx`
- `app/api/notifications/route.ts` (list + mark read)
- `components/notifications/notification-bell.tsx`
- Add to `Header.tsx`

### 2.3 Bookmark threads

Lightweight save-for-later, distinct from research plans.

- New table: `bookmarks(userId, threadId, createdAt)` — composite PK
- New API: `POST /api/forum/bookmarks`, `DELETE /api/forum/bookmarks/[threadId]`
- Bookmark icon on each thread row + on thread detail header
- `/account/bookmarks` page listing them

### 2.4 Plan duplication

Anyone can click "Duplicate to my plans" on a public plan. The action:
1. Creates a new plan with the same title (with " (copy)" suffix)
2. Copies all items
3. Redirects to the new plan

Implementation lives in `sharePlan` reverse path — `clonePlan(planId, ownerId)` in `lib/research-plans/service.ts`. Add button in the public plan view + the plan detail header.

### 2.5 SSE for activity feed + moderation queue

The home-page activity widget currently SSRs the 8 most recent events on every request. For "feels alive" you need realtime.

- New: `app/api/activity/stream/route.ts` — returns SSE, queries for new events since `lastEventId` cursor (the client sends the most recent event id)
- Client: extend `components/activity/activity-feed.tsx` to subscribe to the stream, append new events as they arrive
- Same pattern for `app/api/admin/moderation/stream/route.ts` → live updates on `/admin/moderation`

This is genuinely differentiating — most forums don't have live moderation queues. v1 had it (per the audit) but I didn't port the SSE part.

### 2.6 Admin dashboard (Phase 0.2 leaves a stub for this)

A single overview at `/admin` showing:
- Pending moderation events (last 24h)
- Documents without products
- New shared plans (last 7d)
- New members (last 7d)
- Most-reported posts

Implementation: server component with 4-5 cards, each calling a small query helper. Reuses `<AdminShell>` from 0.2.

### 2.7 Community admin tools

- **Thread lock/unlock** — moderators can lock threads; locked threads hide the reply box. Schema already has `status: 'locked'`; we need the UI button + API endpoint
- **Pin thread** — new schema column `pinned: boolean`, default false; pinned threads surface at top of category board
- **Move thread** between categories

### 2.8 Refinement: plan voting / hearting

A small engagement loop for public plans. Add `planHearts` table `(planId, userId)` with unique constraint. Plans with more hearts surface in `/plans` index. Low effort, high differentiation.

**Acceptance for Phase 2**:
- Forum posts render markdown (bold + lists + code work)
- Reply triggers an email + in-app notification
- Bookmark button on every thread row; `/account/bookmarks` page lists them
- "Duplicate this plan" button on public plan view
- Activity feed receives SSE updates; new events appear without page refresh
- `/admin` dashboard exists with at least 4 cards
- Mods can lock + pin threads from the thread detail page

---

## Phase 3 — Trust signals + editorial depth (1 sprint / 1 week)

### 3.1 Audit existing trust components

I noticed in the v1 audit that `components/trust.tsx` exists in that codebase. Check if it carries over to v2. If yes — verify it appears on:
- Product detail (`<TrustStrip />`)
- Cart / checkout (single-row)
- Home (the trust strip already exists; verify it pulls from a shared source of truth)
- Account (per-order trust signals)

If the file doesn't exist in v2: **port it from v1**.

### 3.2 Sanity-seed glossary terms

Use the seed we built into `scripts/seed-demo.ts` for community, but write a similar `scripts/seed-glossary.ts` that creates 30 entries. The migration plan referenced v1's 35-term list — here's a starter list: HPLC, mass spec, NMR, COA, SDS, lyophilization, reconstitution, purity, batch, lot, CAS, sequence, molecular weight, BPC-157, TB-500, GHK-Cu, semaglutide, tirzepatide, retatrutide, EU research-use regulation, intended use, classification, MarketRule, eligibility, batch release, endotoxin, LAL, peptide bond, AUC, Cmax, subcutaneous, etc.

Schema is in place; this is a one-shot script that loads a JSON of terms + does Sanity `client.create()` for each.

### 3.3 Document filtering

`/documents` index exists but lists everything. Add a sidebar with:
- Type filter (7 checkboxes)
- Product filter (autocomplete)
- Date range
- Search

Server-rendered with URL params. Pure RSC, no client JS.

### 3.4 Reading progress on glossary + blog

Long-form content benefits from a sticky progress bar. Tiny client component (~30 lines), uses `IntersectionObserver` on the article container. Doesn't ship any framework.

### 3.5 Admin document bulk upload

Today: one document per form. Add a drag-and-drop uploader for PDFs that:
- Accepts 1–20 PDFs
- Auto-detects type from filename (`*-COA.pdf`, `*-SDS.pdf`, etc.)
- Lets the moderator override
- Uploads to R2 with a progress bar
- Inserts all rows in one transaction

Use `react-dropzone` (already in package.json? — check). Server-side: a single POST with `multipart/form-data` to `/api/documents/bulk`.

### 3.6 Inline glossary links in product descriptions

The `annotateWithGlossary()` helper is already written. Wire it into the product description renderer on the product detail page. Currently the product data comes from `lib/products/data.ts` (TypeScript object literals, no rich body). Move the description into a `descriptionBody` field, render with the glossary annotator.

**Acceptance for Phase 3**:
- TrustStrip visible on home + product + cart
- 30 glossary terms seeded into Sanity
- `/documents` has filter sidebar
- Long-form pages have reading-progress bar
- Admin can drag-drop multiple PDFs at once

---

## Phase 4 — Compliance + GDPR hardening (1 sprint / 1 week)

### 4.1 GDPR re-confirmation flow

Currently `DELETE` only requires typing "DELETE" in a textbox. For a regulatory-grade flow:

1. User clicks Delete
2. Modal: type email + type "DELETE"
3. Server sends confirmation email with a single-use token (24h TTL)
4. User clicks link in email → confirms deletion
5. Server schedules soft-delete

Schema: new `gdprDeleteTokens` table `(userId, token, expiresAt, usedAt)`.

Worth it? Yes — required for any auditor looking at Art. 17.

### 4.2 Export as ZIP

Currently the export endpoint returns a single JSON file. Real GDPR-friendly export = a zip with:
- `account.json`
- `orders.json`
- `forum-posts.txt`
- `plans.json`
- `readme.txt` (explains what each file is)

Use `jszip` or the built-in Node `zlib` + `archiver`. The v1 plan called this out; not yet shipped.

### 4.3 Cookie banner update

The existing banner mentions "PostHog" + analytics. Now we have:
- Chat panel — uses `/api/ai/chat` (server-side, no third-party cookie)
- PDF viewer — uses Cloudflare CDN worker for `pdf.worker.min.mjs`
- SSE — no third party

Update the banner copy to be accurate, and add a "strictly necessary" toggle that's off by default for non-essential cookies.

### 4.4 Admin impersonation

For support, moderators sometimes need to view the site as another user. Add:
- `POST /api/admin/impersonate` (admin only) → returns a one-time token
- `/impersonate/[token]` → sets a session cookie marked `impersonatedBy=adminId`
- Top banner shows "Viewing as <user>" with a "Stop impersonating" button

Real GDPR cost: log every admin action with `actorId + impersonatingId` in the audit log.

### 4.5 Audit log

`audit_log` table exists but is unused. Wire it into:
- Every admin mutation (admin/moderation verdicts, document CRUD, plan admin actions)
- GDPR exports and deletes
- Impersonation start/stop
- All auth events (login, logout, register)

A simple `lib/audit/log.ts` helper that admin endpoints call.

`/admin/audit` page that lists events with filters.

**Acceptance for Phase 4**:
- GDPR delete requires email confirmation
- GDPR export is a downloadable zip with at least 4 files
- Cookie banner is accurate
- Admin can impersonate + see clear banner + stop
- Audit log captures ≥ 5 admin action types + has a viewer page

---

## Phase 5 — Performance + scale (1 sprint / 1 week)

### 5.1 Bundle size budgets

Add `bundlesize` or similar to CI. Current likely culprits:
- `@react-three/*` — already dynamic-imported, good
- `react-pdf` — dynamic-imported, good
- `react-markdown` — only used in chat (dynamic). If the chat is lazy, the markdown parser only loads when chat opens

Add per-route budgets:
- Home: < 120 KB
- Shop: < 150 KB
- Product: < 130 KB
- Community thread: < 100 KB

### 5.2 Lighthouse CI per route

`lighthouserc.cjs` exists. Wire it to:
- Home
- Shop
- Product
- Community thread
- Glossary term

Set budgets:
- Performance ≥ 95 on all 5
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO = 100

### 5.3 CDN cache rules

- Home, shop, product: `s-maxage=3600, stale-while-revalidate=86400`
- Blog, glossary: `s-maxage=86400, stale-while-revalidate=604800`
- Community: `s-maxage=60` (real-time feel matters)
- Documents: `s-maxage=86400`
- Plans: `s-maxage=300`

Implement via `headers()` in each route or via middleware.

### 5.4 Split sitemap

Currently one `sitemap.ts`. Split:
- `sitemap.xml` — catalog + blog + glossary
- `community-sitemap.xml` — threads
- `plans-sitemap.xml` — shared plans
- `documents-sitemap.xml` — documents

Each is a separate route file with its own `sitemap()` export. Reference in robots.txt.

### 5.5 DB indexes audit

Run `EXPLAIN ANALYZE` on the top 20 slow queries. Add indexes for:
- `forumPosts.threadId, createdAt` — already there
- `forumReactions.userId` — for the "my reactions" page (doesn't exist yet)
- `activityEvents.createdAt DESC` — for the home-page widget
- `documents.productId, type` — for product detail page filter

Add a script `scripts/db-audit.ts` that runs weekly and reports slow queries.

### 5.6 i18n for DE / SV / NL

Currently only EN + FI have community/plans/activity/gdpr/account/documents/keys. The message catalogues for DE/SV/NL exist but are mostly empty.

Decision: keep EN/FI for new features (smaller surface, faster iteration) and **explicitly fall back to EN** for those locales until launch. Post-launch, prioritize DE → SV → NL based on traffic.

**Acceptance for Phase 5**:
- Bundle budgets enforced in CI
- Lighthouse ≥ 95 on 5 key routes
- Sitemap split into 4 files
- DB indexes added for the 4 slow queries
- DE/SV/NL gracefully fall back to EN for new features

---

## Phase 6 — DevX (1 sprint / 1 week)
*Make the next contributor's life easier.*

### 6.1 Storybook for community + research-plans + documents components

The community components (`PostCard`, `ReactionBar`, `ReplyBox`, `ThreadComposer`, `SaveToPlanButton`, `PlanDetailActions`, `DocumentList`, `PdfViewer`, `CitationChip`) are the trickiest in the codebase. Without stories, every tweak risks visual regressions.

Add `pnpm storybook` + visual regression in CI.

### 6.2 Playwright e2e flows

The most important user journeys:

1. **Buy flow**: visit home → click shop → click product → add to cart → checkout → Stripe (mocked)
2. **Community thread**: sign in → community → new thread → reply → react → report
3. **Research plan**: sign in → product → save to plan → share → visit shared URL as anonymous user
4. **Document viewer**: visit document → paginate → download
5. **Admin moderation**: sign in as admin → moderation queue → resolve an event

Each flow ≤ 30 steps. Run on every PR.

### 6.3 Per-route dev tooling

Add `pnpm dev:home`, `pnpm dev:thread/[slug]`, etc. — convenience scripts that pre-fill the dev URL bar. Actually, Next dev server already supports this via `?thread=foo` query params if you wire it. Skip unless there's clear demand.

### 6.4 Migrate blog comments to community threads

If the v1 blog had comments, they should be migrated into the community forum (linked from the post). One-off SQL.

---

## Phase 7 — Realtime polish (1 sprint, optional)
*Make the community feel alive in real-time.*

### 7.1 WebSocket fallback for chat
The chat panel currently does single-shot HTTP. For a real research concierge experience, you'd want streaming responses (SSE) with the model producing tokens live. The agent endpoint already supports streaming (`streamMinimaxChat`); just expose a `POST /api/ai/chat?stream=1` that pipes SSE.

### 7.2 Push notifications
For high-engagement users, browser push for new replies in threads they participate in.

### 7.3 Optimistic UI everywhere
Reply box, reaction bar, save-to-plan — already optimistic for some. Audit and ensure every action feels <100ms.

---

## Smaller refinement ideas (sprinkle these in as you go)

These aren't phase-worthy but they're nice:

- **Reputation tier badges in profile** — small `<Badge tone={tier.color}>` next to handle everywhere
- **Plan voting/hearting** — already noted above
- **@mentions in posts** — V1 had a regex; implement with `[@username]` syntax + autocomplete
- **Plan recommendations on home** — "Users who saved BPC-157 also created these plans"
- **Reading time on glossary terms** — auto-calculated from body length
- **Recent searches** — already in CommandPalette; surface them on shop page too
- **Email digests** — weekly "top threads in your categories"
- **Stripe webhook hardening** — the existing `/api/webhooks/stripe` route — verify signature checking + idempotency keys are working
- **Wishlist sharing** — make wishlists shareable like plans
- **Plan versioning** — when you edit a public plan, save a snapshot so old share-links still resolve to the original version
- **Compare advisor enhancements** — `app/compare/page.tsx` exists; add the agent-backed compare-advisor (mentioned in v1 but I didn't port)
- **A11y audit with axe-core on each page** — `scripts/axe-audit.ts` exists; wire it into CI
- **404 page** — `app/[locale]/not-found.tsx` likely exists; verify it links back home
- **500 error page** — `app/global-error.tsx`; verify it shows research-use disclaimer + contact info
- **Cookie preferences persistence** — verify the consent cookie survives across sessions
- **Localization of legal pages** — `/legal/terms` etc. should be in EN + FI at minimum
- **OG image locale fallback** — currently `/og` defaults to EN; should respect locale
- **Sanity webhook revalidation** — when a glossary term is updated, the relevant pages should revalidate
- **Tab title per route** — currently every page has `t("title")` but verify it's not blank

---

## Suggested execution order

Given that this is a big doc, here's the order I'd actually ship things in if I were you, ignoring the phase numbering:

| Sprint | Theme | Items |
|---|---|---|
| **Now** | Unblock CI | 0.1 (fix typecheck), 0.3 (CI gate), 0.4 (first 20 tests) |
| **+1** | Make it real | 0.2 (admin shell), 0.5 (seed), 0.6 (sanity check), 1.1 (Sanity blog) |
| **+2** | SEO + editorial | 1.2 (sitemap), 1.3 (OG), 1.4 (glossary links), 1.5 (JSON-LD), 3.2 (glossary seed) |
| **+3** | Community alive | 2.1 (markdown), 2.2 (notifications), 2.3 (bookmarks), 2.5 (SSE) |
| **+4** | Polish | 2.4 (plan dup), 2.6 (admin dashboard), 2.7 (mod tools), 2.8 (hearts) |
| **+5** | Compliance | 4.1 (GDPR email), 4.2 (zip export), 4.4 (impersonate), 4.5 (audit log) |
| **+6** | Performance | 5.1–5.6 |
| **+7** | DevX | 6.1 (storybook), 6.2 (e2e), 3.1 (trust), 3.3–3.6 |

That's ~7 weeks of focused work. Each sprint should be small enough to ship in a few days; the rest is buffer + iteration.

---

## What this plan explicitly does **not** do

- **No payment provider expansion.** Stripe + Coinbase Commerce is already in scope.
- **No multi-warehouse.** Single EU hub at launch.
- **No native mobile.** PWA-friendly site first.
- **No B2B invoicing beyond partner application.** Net-14 invoicing is a Phase 4+ feature.
- **No real-time WebSocket for chat.** Phase 7.
- **No migration of old v1 database.** If v1 has real users, a separate data migration plan is needed.

---

*End of plan. Open `MIGRATION_PLAN_V1_TO_V2.md` for the v1 → v2 work that's already done. This document picks up from there.*