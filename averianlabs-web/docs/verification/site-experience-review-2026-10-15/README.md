# Site experience review evidence — 15 October 2026

Read with the [active master plan](../../SITE_EXPERIENCE_MASTER_PLAN_2026-10-15.md) and [proposed visual direction](../../SITE_VISUAL_DIRECTION_2026-10-15.html). This is a new visual/content planning audit of the deployed Netlify review application, following the October 15 release. It does not establish that the proposed redesign has been implemented or that all functionality has been retested.

## Executed observations

- `live-review.json`: 24 fresh main route captures: EN at 1440 px and FI at 390 px, across home, catalogue, product, calculator, community, assistant, reports, quality, methods, contact, empty cart and tools. Also four supplementary theme/narrow/early-first-visit captures: 28 visual states in this file. Main routes returned HTTP 200 without horizontal overflow.
- One React #418 page error occurred while visiting the EN cart. Preserve it in `live-review.json`. Its cause and exact trigger remain unconfirmed.
- `cart-hydration-followup.json`: five independent fresh-context cart reads, including home → shop → cart sequences, returned 200 without page/hydration errors or overflow. This did not reproduce or disprove the original intermittent event.
- `bilingual-content-snapshot.json`: independent read-only text extraction of 12 routes in each language. The route set overlaps the visual set; these are not 24 additional unique journeys or acceptance passes.
- `first-visit-delayed.json` and `fi-390-first-visit-delayed.png`: an additional fresh FI mobile context, no cookies/storage supplied, observed after hydration. The age dialog was visible and the cookie dialog was behind its backdrop; their rectangles did not overlap. Focus/keyboard sequencing was not tested. The earlier 500 ms capture is not evidence that the age dialog was absent.
- `social-image-review.json`, `og-current-en.png`, `og-current-fi.png`: direct current hosted image downloads had identical English content and checksums despite different locale queries. The underlying cache/query cause has not been diagnosed.

## Source and live-CSS findings

The plan links the source locations for input provenance, document-failure handling, filter semantics, loading skeletons, media/locale association and asset metadata. These are source-observed findings, not claims that every future content/failure state was exercised online.

A temporary browser-only Markdown fixture used the existing assistant renderer's classes against the deployed stylesheet `/_next/static/css/59245c393026b81e.css`. Heading and paragraph styles computed as 14 px/400 with zero margins; links had ordinary ink with no underline and unordered lists had no markers. The stylesheet had no `.prose` rules. The fixture was removed; no AI/provider request or backend mutation occurred. This is a styling diagnostic, separate from a live generated-answer test.

Current small imagery is illustrative. Actual product appearance, seller identity, original reports, credentials and team/facility images were not supplied or fabricated. The owner will supply approved records later.

## Selected current screens

- [Desktop home](en-1440-light-home.png), [catalogue](en-1440-light-catalogue.png), [product](en-1440-light-product.png), [dark home](home-dark.png).
- [Finnish mobile home](fi-390-light-home.png), [calculator](fi-390-light-calculator.png), [assistant](fi-390-light-assistant.png), [community](fi-390-light-community.png), [report search](fi-390-light-reports.png).
- [Narrow assistant](assistant-narrow.png), [delayed first-visit gate](fi-390-first-visit-delayed.png).

Full-page captures do not trigger every scroll-dependent entrance animation. Calculator `5 mg/mL` was present in the DOM; an offscreen animated value can be absent from a full-page image. Do not call that a numerical failure based on a screenshot alone. Host branding/chat positions are captured in the images and should be addressed in the layout review.

The audit used anonymous read-only views. It created no accounts, posts, orders, payments or customer messages and sent no model prompts. It is not a fresh full WCAG, merchant-provider, scientific or language certification. Future acceptance requirements are in the plan, distinct from executed checks.

## Proposed reference-board checks

`direction-board-checks.json` exercises the separate local HTML design study in eight EN/FI × 390/1440 px × light/dark states, including its language and theme controls. No overflow, page errors or critical/serious axe findings were observed. Board commentary remains English; customer-facing component examples can be toggled to Finnish. These results apply to the reference board, not the deployed application or future implementation.
