# Release record — 31 October 2026 (updated 1 November 2026)

Published to [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app). The merchant release is approved and the review-site gate has been removed, so the storefront is indexable and the canonical origin, the sitemap and `robots.txt` all name the origin that actually serves the site.

## Current release

| Item | Value |
|---|---|
| Published at | `2026-11-01T02:48:43.483Z` |
| Netlify deploy | `6ae6a7aa192fe865cb9c1fb4` |
| Deployed commit on `demo` | `1f69091` |
| Previous published deploy | `6ae69a64ba76c3a04c450771` (unlocked and superseded) |
| Deployment method | Git push to the `demo` branch; Netlify built the source with the hosted secrets |
| Functions deployed | `___netlify-server-handler`, `cron-crypto`, `cron-maintenance` |
| Schedules | `*/2 * * * *` (crypto), `*/5 * * * *` (maintenance) |

This record was revised after that deploy was published. The revision
changes the document only — the application it describes is the application
the named deploy serves.

## The release before it

| Item | Value |
|---|---|
| Published at | `2026-10-31T14:17:13.765Z` |
| Netlify deploy | `6ae5f776903d2207746c6286` |
| Netlify build | `6ae5f776903d2207746c6285` |
| Deployed source tree | `09dde9073643090c705912c272e395df07fd1131` |
| Deployed commit on `demo` | `074cc20` |
| Application deploy (identical application code) | `6ae5ed9ea8249596e4ad3623` |
| Local `main` tree | `bfcfddd65b96de767219ba5bfe207cabe1a01aed` |
| Previous published deploy | `6ae471f231d7f9c2ea334b01` (unlocked and superseded) |

The deployed tree and the local `main` tree differ only by `.github/workflows/ci.yml` and `.github/workflows/maintenance.yml`. The push credential in the local keychain carries no `workflow` scope, so GitHub refused to update those two files; they are not part of the application and do not affect the deployment. **Push them from a credential with the `workflow` scope** so the branch and the CI workflow stay in step.

The `demo` branch was force-updated rather than merged. The branch's previous ten commits (16–19 September) are an earlier snapshot that `main` overtook by roughly 250,000 lines; merging them produced 128 conflicts and would have reinstated a superseded Netlify configuration, the `de`/`nl` locale set in place of the shipped `ru`, `output: "standalone"` handling that the current deployment does not use, and the `noindex` header this release removes. The comparison behind that decision is recorded in the review of the two branches.

## What changed in this release

### Storefront defects fixed

- The product page emitted no hreflang alternates at all: the map was built with one-element arrays, so every alternate URL was lost.
- The compare bar showed raw URL slugs instead of product names — it never read the catalogue.
- The admin sign-out was a GET link to `/api/auth/signout`. NextAuth expects a POST with a CSRF token, so it never signed anyone out.
- A failed delivery quote told the customer that batch documentation was unavailable; a failed shipping-rate fetch reported that payment was unavailable. Both are separate failures and now have their own messages.
- Reaction buttons died permanently when the request threw: the error path skipped the reset, so every later click was ignored.
- An anchor was nested inside a button in the cart drawer — invalid HTML, ambiguous keyboard activation.
- The assistant prompt interpolated the wrong ICU argument, so the chat received a literal `{name}`.
- The hero purity stat rendered "HPLC purity / HPLC purity" when the featured product had no published purity.
- The wishlist button drew two hearts.

### Accessibility

Heading order in the shop filters, transparent buttons that were still in the tab order, `aria-hidden` on a focusable link, decorative icons without `aria-hidden`, a 2000-character field that was a single-line input, an unassociated error message.

### React correctness

An uncancelled animation frame writing state after unmount, an uncleaned timeout, an effect that reset the shop filters on every render because its prop was a fresh object each time, a new `Error` object constructed during render.

### Translations

Swedish was 52% untranslated and Russian 18%, with English copy under a local label and five strings quoting SEK in a EUR-only store. All 1149 strings are now translated; the remaining English strings are formulas and acronyms that do not translate. Twenty components that had English hardcoded now read from the message files.

### Layout

A long Finnish compound word in a heading pushed eight pages past a 320px viewport. Headings now break and hyphenate, and `pnpm check:narrow` walks every route in every locale at that width.

### Security

Every state-changing API route (47 of them) now checks the request's `Origin` — or `Referer` — against an origin the deployment actually serves, and refuses the request when neither is present. The session cookie is `SameSite=Lax`, which does not stop a cross-site POST with a crafted body, a sibling subdomain inheriting the cookie, or a form submission against an endpoint that also accepts POST.

The comparison is against the deployment's configured origins rather than the request's own URL: on Netlify the function's `request.url` origin is the deployment's internal address, which differs from the public origin on a deploy preview and behind the proxy. The request's own `Host` header is part of the allowlist, which is the same-origin test the browser performed to decide the request was same-site in the first place.

Webhook and Telegram routes are excluded: they authenticate by HMAC signature, not by session cookie.

### Indexing

The review-site flag is removed from the build environment, the response headers, `robots.txt` and the page metadata. `averianlabs.eu` is **not registered** — EURid reports it as available and it has no name servers — so every canonical URL and sitemap entry that named it was a dead link. The origin now resolves from the deployment. Connect the domain and set `NEXT_PUBLIC_SITE_URL`, and all of them follow it.

## Performance and the edge cache

The catalogue pages are the same for every visitor, so they can be served
from the edge instead of invoking the origin. They now are: the build
declares the cacheable routes in one list, the middleware marks a request
that qualifies, and the build's own header rule sets the lifetime.

The rule cannot live in the middleware. Next.js replaces the `Cache-Control`
a middleware sets with the one the render produced, so a header set there is
discarded; a header in the build's configuration is applied after the render
and survives. The path list and the session check are the same two
conditions in both places, expressed twice because they have to be.

A signed-in visitor is never cached. Their pages carry their own session,
and a shared cache that served one visitor's page to another would be a
leak, not a performance gain.

| | Before | After |
|---|---|---|
| Home page, p50 | 378 ms | 52 ms |
| Home page, p90 | — | 84 ms |
| Home page, p97.5 | — | 135 ms |
| Home page, p99 | — | 165 ms |
| Home page, p95 | 7 700 ms | — |
| Throughput, 8 connections | 7.9 req/s | 92–129 req/s |
| First request (cold) | — | 628 ms |
| Repeat request (warm) | — | 64 ms |

The page weight fell with it. Measured on the two deployments, the served
HTML went from 233 445 to 225 921 bytes on the home page, from 300 652 to
288 286 on the shop, from 161 720 to 149 354 on a product page and from
117 725 to 110 292 on the about page. Three changes account for it: the client no longer receives the date-time format
table it never reads, the browser receives only the fields it reads from
the catalogue instead of all of it, and each page receives only the
translations it renders — with the chrome around the page carrying the
union, because the layout does not re-render when a visitor navigates.

The function bundle fell with it. The trace carried the macOS and Windows
builds of every native dependency — the build runs on Linux, so they can
never be executed — and the excludes that should have dropped them were
written with a hyphen where the package manager writes a plus. They are
excluded now.

## The storefront's own design system

The site had three heading systems, four card shapes, nine card paddings,
four shadow treatments, five hover behaviours and a dozen call-to-action
styles, each written out by hand — so the storefront looked assembled
rather than designed. It now has one definition of each.

- A shared `Card`, `Section` and `SectionHeader`, so a card is a card.
- One set of button classes, used by the interactive button and by the
  server-rendered links that make up most of the storefront's calls to
  action. A link does not become a client component to look like a button.
- A heading scale of roles — display, page, section, sub, card — rather than
  a class string repeated with small differences on thirty headings.
- A vertical rhythm decided in one place, stepping with the viewport: a wide
  screen gets the air a wide screen needs, which it did not before.
- The product card was the only card in the site with a 20px corner while
  every other card used 12px. The step cards were the same colour as the
  band they sat on. The category grid held seven tiles in four columns and
  left an empty corner that read as a missing tile. The questions band had
  a column of empty page beside the answers. All four are fixed.
- Twelve stylesheet utilities that nothing used were removed, including two
  that were a second focus system alongside the one the stylesheet actually
  draws.

Two defects came out of the same pass. The product renders labelled their
vials with font variables that do not exist, so every label on every product
image fell back to the platform's default font. And the hero rendered
"€0.00" under the store's flagship product whenever that product had no
published price — a zero is not a price.

## The payment fixtures, and what the storefront says

The catalogue held two payment fixtures: one for the card path, one for the
crypto path. Neither is merchandise — no goods, no batch, no certificate, a
placeholder price — and between them they were the hero of the home page,
the whole of the featured row, the shop's only available products, the first
thing the empty cart suggested and two entries in the sitemap.

They are now left out of everything that browses the catalogue. Their own
pages still resolve, so the payment path can be tested by opening the
fixture's address, and `CHECKOUT_FIXTURE_IN_STOREFRONT=true` puts them back
while it is being tested. A test guards the exclusion.

That left the storefront's copy claiming things it was not showing, so the
copy was made to match the state:

- The shop promised "live stock, current prices and the certificate of
  analysis for every batch". It now promises live pricing and batch
  certificates for the materials that are ready to ship.
- The featured band called its contents "the materials our customers order
  most, with live stock and current pricing" over a shelf of out-of-stock
  items. While nothing can be ordered it says that it is the catalogue, and
  asks for a quote.
- The compare page's empty state was one sentence in a bare box on an
  otherwise empty page. It now says what the page is for and offers the way
  in.

## The load campaign found a leak, and the build found a secret

Two things in this release were found by running the site rather than by
reading it.

The hosted build failed with exit code 2 on every attempt, and Netlify
reported only the number: no step, no message. The cause was a MiniMax API
key pasted into `.env.example` and committed. The repository is public, so
the host's secret scanning refused to build it. The key is removed from the
tree and from the history, and it has to be **rotated at the provider** —
deleting it here cannot make a published credential private again.

The guard that should have caught it had never run. Its job used a hook
option that looks the script up in the wrong place, so the job failed before
the guard executed; it excluded the very file the key was in; its pattern
list held its own explanations as comment lines, and a comment line in that
list is a pattern that matches every commented line in the repository; and
its configuration was itself gitignored. All four are fixed, and the guard
is now tracked.

The load harness itself was measuring the host's edge protection rather
than the site. A request that does not look like a browser is answered with
a branded 403 before it reaches the application, so roughly a third of a
run was failures that had nothing to do with the storefront. The harness
now sends a browser's user agent and records which status codes the run saw.

## Executed verification

- TypeScript passed. Biome reported zero errors.
- 499 unit tests passed, 9 of them the new CSRF tests and 3 the new
  storefront-catalogue tests.
- 83 integration tests passed against the isolated database. The 2 that did
  not run need Stripe's webhook signing secret, which is not set in the local
  environment; they fail on the missing credential, not on the code.
- 155 browser tests passed, 2 skipped. The suite passes whether or not the
  environment is exported: two tests used to read the developer's own
  environment instead of pinning what they depended on.
- 65 per-route bundle budgets passed. 12 deployment checks passed.
- 20 accessibility routes passed axe with zero critical or serious findings.
- 120 narrow-viewport combinations at 320px had no horizontal overflow.
- The runtime audit walked 116 route and locale combinations: zero console errors, zero uncaught exceptions, zero failed requests, zero non-2xx responses, zero missing translations, zero uninterpolated placeholders.
- The deploy verifier ran against the deployment's own URL and then against the published site: 22 checks, all passing. Every locale's home page, shop and product page render; the cross-origin write is refused with 403; the same-origin write reaches the handler.
- The assistant answered in all four languages on the published site, in the language of the question, with no English left in the answer.
- The live quote flow was exercised in a real browser: the request was submitted and the confirmation rendered, with no console errors.
- Client-side navigation was confirmed to work without a full page load.

## Remaining release requirements

### Rotate the MiniMax API key

A MiniMax API key was committed to `.env.example` and, through it, to a
public repository. It has been removed from the tree and from the history,
and the host's secret scanning now builds the site again — but a key that
was public has to be treated as compromised. **Rotate it in the MiniMax
console** and set the new value in the host's environment. The old value is
in the commit history of anyone who cloned the repository between the leak
and the removal.

The catalogue is not yet sellable and this is a data question, not a code one. The hosted seed deliberately creates products with no price, no stock and no assigned released batch, because supplier evidence for them does not exist. The direct-sale rule requires an active product, an owner-approved `evidenceRef`, a positive price, and an explicitly assigned, reviewed, unexpired batch with a published COA in both the Finnish and English registries. Until that evidence exists the products are shown as "Quote only" and "Out of stock", and the quote form is the correct route to them. This is the same state the previous deployment showed; it was verified by comparing both.

To sell directly, the owner supplies for each SKU: the real specification with its evidence reference, a reviewed and released batch with an expiry date, the original COA uploaded to the document registry, a positive price, and the stock quantity. The `verificationStatus` check constraint and the `reviewedBy`/`reviewedAt` columns enforce the review; the batch cannot be marked released without it.

`pnpm release:check` states this as a technical prerequisite. It currently fails on the live data for two reasons: no released, documented SKU is available for direct sale, and the `checkout-test-150` and `test-usdc-1-50` fixtures are still present. Remove the fixtures and supply the batch evidence before enabling card checkout for the catalogue.
