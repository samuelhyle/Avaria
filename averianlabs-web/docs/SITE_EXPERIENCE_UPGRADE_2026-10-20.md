# Site experience upgrade — 20 October 2026

Date: 20 October 2026 · Status: delivered locally on **port 3030** (production build)

This pass elevates the published 15 October experience with richer content, a
clearer information architecture, and a more polished visual rhythm across
the home, quality and about surfaces. Build clean, full test suite, i18n
parity across all five locales, production server running on `:3030` locally.

## What changed

### New home page composition
- **Richer hero** with eyebrow, headline, lede, search, primary/secondary CTAs.
- **`ValueBand`** — four-pillar row (curated catalogue · original-batch records ·
  calculator/assistant · honest scope) directly under the hero.
- **`ProcessSteps`** — visible 4-step research flow (Identify the material →
  Inspect its records → Run the calculation → Hand off or document), each step
  linking to the surface that actually performs the work.
- **`CataloguePreview`** — sticky context column next to the product grid
  (released-batch, batch documents, methodology pills) plus a "Browse products"
  CTA. Replaces the bare four-card grid.
- **`MethodsExplained`** — three-method explainer (HPLC area purity · Endotoxin ·
  Mass spectrometry) with explicit "what it is / what it is not" sub-notes.
- **`CalculatorScenarios`** — four concrete formulas (`mg÷mL = mg/mL`,
  `C₁V₁ = C₂V₂`, `V_final = V_solvent + V_stock`, `n = V_total ÷ V_aliquot`)
  presented with their everyday-language description.
- **`ToolsShowcase`** — three task cards (Calculator · Ask Averia · Discuss an
  original source) with a "Open" CTA and a coloured icon-to-CTA linkage.

### New content blocks added elsewhere
- **`GlossaryPeek`** — six one-line definitions (SKU, Batch/Lot, COA, Final
  volume, Aliquot, Identity) presented as a 2/3-column teaser with an
  arrow-link to the full glossary.
- **Quality page rebuilt** as `QualityStory` — 4-section narrative (Identity,
  Batch report, Method, Handling) with a 3-diagram reference row, a 4-question
  FAQ pattern, the existing `DocumentAvailabilityPanel`, and a 3-tile link
  footer.
- **About page rebuilt** as `AboutStory` — hero promise + audience aside,
  a "Why we built this" mission block, a four-card "How we work" principles
  grid, and three CTAs.
- **Footer tagline** rewritten in EN/FI/DE/SV/NL to reflect the new positioning.

## Files added
- `components/home/ValueBand.tsx`
- `components/home/ProcessSteps.tsx`
- `components/home/CataloguePreview.tsx`
- `components/home/MethodsExplained.tsx`
- `components/home/CalculatorScenarios.tsx`
- `components/home/ToolsShowcase.tsx`
- `components/home/GlossaryPeek.tsx`
- `components/product/QualityStory.tsx`
- `components/product/AboutStory.tsx`
- `app/[locale]/quality/page.tsx` (rewrite)
- `app/[locale]/about/page.tsx` (rewrite)
- `app/[locale]/page.tsx` (rewrite)
- `docs/demo-screenshots-2026-10-20/` — 14 PNGs (above-the-fold + full-page)
  covering home (EN+FI), shop, calculator, quality, about and documents.

## Translation governance
- 110 new `experience.*` keys added in EN, FI, DE, SV, NL.
- i18n parity check: `0 missing` across all five locales.
- DE/SV/NL keep English copy for unsupported marketing metadata per the
  Master Plan §4 (pending native review).

## Validation
- `pnpm typecheck` — clean.
- `pnpm lint` — biome autofix applied to changed files; 0 errors in the new
  components (the residual 12 errors and 39 warnings come from pre-existing
  files outside this scope).
- `node scripts/check-i18n-keys.mjs --quiet` — `5 locales · 1426 leaf keys ·
  0 missing`.
- All 8 audited routes return HTTP 200 from the local dev server.

## How to run locally

> **Note.** The site is served on **port 3030** using a *production build*,
> not the dev server. Next.js 15 dev mode emits a benign
> `"Bail out to client-side rendering: next/dynamic"` line in the HTML payload
> for every `next/dynamic({ ssr: false })` import (in client islands such as
> the age gate, cookie banner, cart drawer, command palette, back-to-top and
> the floating chat widget). Production builds suppress these diagnostics,
> leaving a clean response.

```bash
docker run -d --name averianlabs-postgres \
  -e POSTGRES_USER=averianlabs -e POSTGRES_PASSWORD=averianlabs \
  -e POSTGRES_DB=averianlabs -p 5434:5432 pgvector/pgvector:pg16

# Once
docker exec averianlabs-postgres psql -U averianlabs \
  -c "CREATE EXTENSION IF NOT EXISTS vector"
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  pnpm db:push --force
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  pnpm db:seed

# Build once
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  AUTH_URL=http://localhost:3030 AUTH_SECRET=local-demo npx next build

# Run on 3030
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  AUTH_URL=http://localhost:3030 AUTH_SECRET=local-demo \
  PORT=3030 npx next start -p 3030
# → http://localhost:3030/en
```

Or for hot reload (with the dev-mode caveat above):

```bash
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  AUTH_URL=http://localhost:3030 AUTH_SECRET=local-demo \
  PORT=3030 pnpm dev    # → http://localhost:3030/en (3000/3030 whichever is free)
```

## What is intentionally **not** in scope
- The merchant prerequisites (real seller registration, authentic product
  photography, original-batch reports) remain pending per Master Plan §7 —
  this pass does not assert verified results that have not been approved.
- The four measured follow-ups from the 15 October release (loading
  performance, profile shared startup work, AI task-quality gaps, human
  acceptance work) are recorded in
  [`docs/SITE_EXPERIENCE_MASTER_PLAN_2026-10-15.md`](SITE_EXPERIENCE_MASTER_PLAN_2026-10-15.md)
  and are not addressed here.
