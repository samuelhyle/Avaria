# Release record — 31 October 2026

Published to [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app). The merchant release is approved and the review-site gate has been removed, so the storefront is indexable and the canonical origin, the sitemap and `robots.txt` all name the origin that actually serves the site.

| Item | Value |
|---|---|
| Published at | `2026-10-31T13:55:58.961Z` |
| Netlify deploy | `6ae5ed9ea8249596e4ad3623` |
| Netlify build | `6ae5ed9ea8249596e4ad3621` |
| Deployed source tree | `ca2120cc33901e79dcee2900f516c43c9c96b729` |
| Deployed commit on `demo` | `e3804069de2b35bf796652b467f5a40f937c0ce7` |
| Local `main` tree | `bfcfddd65b96de767219ba5bfe207cabe1a01aed` |
| Previous published deploy | `6ae471f231d7f9c2ea334b01` (unlocked and superseded) |
| Deployment method | Git push to the `demo` branch; Netlify built the source with the hosted secrets |
| Functions deployed | `___netlify-server-handler`, `cron-crypto`, `cron-maintenance` |
| Schedules | `*/2 * * * *` (crypto), `*/5 * * * *` (maintenance) |

The deployed tree and the local `main` tree differ only by `.github/workflows/ci.yml` and `.github/workflows/maintenance.yml`. The push credential in the local keychain carries no `workflow` scope, so GitHub refused to update those two files; they are not part of the application and do not affect the deployment. **Push them from a credential with the `workflow` scope** so the branch and the CI workflow stay in step.

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

## Executed verification

- TypeScript passed. Biome reported zero errors.
- 492 unit tests passed, 9 of them the new CSRF tests.
- 84 integration tests passed against the isolated database.
- 153 browser tests passed.
- 65 per-route bundle budgets passed. 12 deployment checks passed.
- 20 accessibility routes passed axe with zero critical or serious findings.
- 120 narrow-viewport combinations at 320px had no horizontal overflow.
- The runtime audit walked 116 route and locale combinations: zero console errors, zero uncaught exceptions, zero failed requests, zero non-2xx responses, zero missing translations, zero uninterpolated placeholders.
- The deploy verifier ran against the deployment's own URL and then against the published site: 22 checks, all passing. Every locale's home page, shop and product page render; the cross-origin write is refused with 403; the same-origin write reaches the handler.
- The live quote flow was exercised in a real browser: the request was submitted and the confirmation rendered, with no console errors.
- Client-side navigation was confirmed to work without a full page load.

## Remaining release requirements

The storefront is live and correct, but the catalogue is not yet sellable and this is a data question, not a code one. The hosted seed deliberately creates products with no price, no stock and no assigned released batch, because supplier evidence for them does not exist. The direct-sale rule requires an active product, an owner-approved `evidenceRef`, a positive price, and an explicitly assigned, reviewed, unexpired batch with a published COA in both the Finnish and English registries. Until that evidence exists the products are shown as "Quote only" and "Out of stock", and the quote form is the correct route to them. This is the same state the previous deployment showed; it was verified by comparing both.

To sell directly, the owner supplies for each SKU: the real specification with its evidence reference, a reviewed and released batch with an expiry date, the original COA uploaded to the document registry, a positive price, and the stock quantity. The `verificationStatus` check constraint and the `reviewedBy`/`reviewedAt` columns enforce the review; the batch cannot be marked released without it.

`pnpm release:check` states this as a technical prerequisite. It currently fails on the live data for two reasons: no released, documented SKU is available for direct sale, and the `checkout-test-150` and `test-usdc-1-50` fixtures are still present. Remove the fixtures and supply the batch evidence before enabling card checkout for the catalogue.
