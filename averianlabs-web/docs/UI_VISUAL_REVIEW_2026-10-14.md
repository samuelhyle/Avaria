# Deployed UI review and proposed visual direction

Reviewed: 14 October 2026, Europe/Helsinki.

Expanded and implemented on 14 October 2026 to include the peptide calculator, community and Averia/LLM capabilities. The first delivery and its executed checks are recorded in [the implementation record](RESEARCH_WORKSPACE_IMPLEMENTATION_2026-10-14.md). Advanced scientific features and editorial/provider approval remain separately gated.

Reviewed the actual [published English site](https://averianlabs-demo.netlify.app/en) and [Finnish site](https://averianlabs-demo.netlify.app/fi). The public Netlify application remains the review deployment described in the [release record](NETLIFY_DEPLOYMENT_2026-10-13.md). The observations below describe the previous deployment. The implementation preserves the purchasing eligibility rules and the review-site restriction.

## Recommended direction

Make AverianLabs a calm, precise laboratory supplier interface. Keep the existing blue, Geist typography and recognizable wordmark. Let product identity, SKU, size/unit, purchase availability and document status establish the hierarchy. Use restrained illustrations, aligned information, readable labels and a small set of consistent controls.

The current blue identity, simple core navigation, honest documentation wording and clear primary buttons are useful foundations. The largest opportunity is how space and attention are allocated: decorative product imagery occupies considerably more space than information customers need to choose a material or inspect a report.

Open the [interactive visual concept](design/research-storefront-concept.html). Switch between Home, Catalogue and Product page, and between English and Finnish. The catalogue supports name/SKU filtering, material-type selection, product navigation and size selection. Enquiry/documentation dialogs demonstrate layout only; no request is submitted and no database, payment or assistant service is connected. The concept uses four reference examples, not a new approved catalogue.

## Evidence from the live site

Captured 20 route/viewport combinations at 1440 × 1000 and 390 × 844, plus the COA registry on desktop/mobile and the homepage at 1024 px. Also inspected the Finnish first-visit age dialog and mobile menu. All 23 route checks returned HTTP 200. The 20 main captures had no browser page errors or horizontal document overflow. These are observations of rendered pages, not a new checkout or merchant integration certification.

| Area | Observation | Proposed improvement |
| --- | --- | --- |
| Mobile catalogue | English page is 11,493 px tall; Finnish is 11,509 px, including footer. The first screen shows a large vial image without a readable product title in the information panel. | Compact rows on mobile, with name, SKU, size, availability and document status visible together. Keep illustrations as small thumbnails. |
| Mobile product page | BPC-157's title begins around 645 px down the page. The large illustration and 3D button precede the product information. | Put the title and purchasing status first. Show a short size/SKU selector and enquiry action before the illustration; keep document availability explicit. |
| Homepage | The desktop hero combines two different brand marks, a large headline, a large illustration, floating product information and scrolling product chips. The next section repeats “Explore the catalogue” as two headings. | One brand identity, a balanced two-column hero and one useful example product summary. One featured-products heading. Move audience lists and secondary resources below the main browsing task. |
| Product cards | Image aspect ratio is 4:5, with repeated generic descriptions, pricing labels and quotation text. The actual product name appears after the image. | Name and SKU first, one availability label, one document-state line and a clear action. Reduce duplicate labels; keep optional comparison on the product/selection workflow. |
| Filters | The untouched mobile catalogue shows “1” active filter. `defaultFilters.purityMin` is 0 while `ShopCatalog` compares against 95 when counting active filters. The slider displays 0% HPLC in a catalogue with no published reports. | Correct the count using the actual filter defaults and include every applied filter. Use material type, availability and document availability as the main controls. Only offer quantitative purity filtering when verified values exist; an unset filter is not a measured result. |
| Navigation | The mobile header shows only the Æ symbol. The mobile drawer mixes many research-area categories and resources, while some homepage category wording differs from the drawer. | Keep a readable wordmark on mobile, four primary destinations and consistent labels. Group additional tools under Resources. Material type can be the first browsing grouping, followed by scientifically reviewed research-area tags. |
| Documentation | The registry has no published documents. Quality and methods pages are readable but have large blank areas and little visual distinction between explanation, current record availability and next actions. | A structured document-status panel, precise empty state, clear enquiry route and a compact explanation of each method. Add actual report/version/batch details only when records exist. |
| Floating controls | “Powered by Netlify” overlaps the assistant launcher on mobile and desktop; it also covers part of the mobile menu's cart action. | Reserve space for platform branding and mobile safe areas. Move the assistant above that area or make it contextual within product/support pages. Do not hide required platform branding through CSS. |
| Account, cart, contact and footer | Large page spacing and repeated containers make small forms/empty states feel isolated. The footer presents many secondary destinations and another newsletter form. | A shared form layout, a helpful empty-cart continuation, smaller vertical gaps and a shorter grouped footer. Keep required seller/legal information and consent controls readable. |

Evidence: [live capture record](verification/ui-review-2026-10-14/live-review.json), [registry/tablet observations](verification/ui-review-2026-10-14/additional-review.json), [current desktop homepage](verification/ui-review-2026-10-14/desktop-en-fold.png), [current mobile catalogue](verification/ui-review-2026-10-14/mobile-en-shop-fold.png), [current mobile product](verification/ui-review-2026-10-14/mobile-en-shop-bpc-157-fold.png) and [mobile menu](verification/ui-review-2026-10-14/mobile-fi-menu.png).

## Visual system

| Element | Direction |
| --- | --- |
| Colour | Ink `#17263D`, muted text `#526077`, blue `#105BE1`, page `#F5F7FA`, white surfaces and borders `#DCE3EB`. Use neutral/amber status for missing confirmation; reserve success styling for evidence-backed states. |
| Typography | Keep Geist. Desktop hero roughly 48–54 px; mobile 30–35 px with Finnish wrapping checked. Section headings 24–28 px; body 15–17 px; important metadata 12–14 px. Use monospace selectively for SKU, batch identifiers and technical values. |
| Shape | Most controls 8 px radius, panels 10–12 px. Consistent subtle borders and small shadows. Keep rounded status labels, while reducing the large rounded containers and decorative glow. |
| Spacing | Use an 8 px rhythm. Desktop section gaps around 40–64 px and mobile 24–32 px; make whitespace support grouping instead of delaying important information. |
| Images | Small, consistent illustrative vials until actual approved packaging photographs are available. Label illustrations. Use genuine packshots when supplied; avoid images that imply an owned facility, testing or accreditation without evidence. |
| Controls | One prominent action per task. Preserve visible focus, adequate touch targets, labels and keyboard operation. Use a real inline catalogue search field. Keep 3D exploration optional and secondary. |

This concept illustrates the light theme. The production dark theme must receive the same contrast and state review when these tokens are implemented.

## Page hierarchy

**Homepage:** clear purpose → catalogue/documentation actions → concise example product summary → three short purchasing steps → compact catalogue preview → documentation/support resources. The example summary says that availability is unconfirmed/unavailable and documents are missing when that is the actual state. It does not fill missing fields with reassuring sample results.

**Catalogue:** heading → inline search and useful filters → result count/applied filters → compact product rows. Each row shows name, nominal size and unit, exact SKU, direct-purchase/quotation/unavailable state and published document availability. Use semantic tables or labelled definition lists in production, with complete labels on mobile. Keep grid view optional for customers who prefer imagery; move 3D outside the main selection toolbar.

**Product:** name and material type → exact SKU/size selection → current purchase availability and batch/document status → enquiry or purchase action → restrained image → reviewed specifications and original documents → focused supporting explanation. A quotation is a way to ask for confirmation, not a claim that stock or documentation has been approved.

**COA registry and quality:** show the actual registry state and a useful next action. A future populated record should expose product, exact batch, report title, method, report/version date and original document link. Keep explanations about purity, identity and content separate from results. Show absent information explicitly, with no fake COA thumbnails, charts, PASS marks or accreditation badges.

## Calculator, community and Averia: the next product scope

These features should form a useful research workflow alongside the storefront: find a material, inspect the available records, calculate laboratory quantities, ask a focused question and discuss a cited source. Apply the same typography, spacing, surfaces, controls and status language across all of them. Keep the main purchasing route easy to find; introduce a Research tools / Tutkimustyökalut destination for the calculator and assistant, with a clear community link.

The additional live review covered `/en` and `/fi` versions of the calculator, community and assistant at 1440 × 1000 and 390 × 844: 12 route/viewport checks, all HTTP 200, without page errors or horizontal overflow. Changing the calculator's public inputs confirmed the ordinary 10 mg / 2 mL / 250 µg calculation and rejection of zero solution volume. No posts, model prompts or private-account operations were submitted. See [the additional review record](verification/ui-review-2026-10-14/research-tools-review.json).

### What already exists and what needs attention

| Area | Existing implementation and observed gap | Consequence for the plan |
| --- | --- | --- |
| Calculator | Three inputs calculate concentration, aliquot volume and complete aliquots. The assistant uses the same `calculateAliquots` function. On mobile, the input panel and introductory spacing push most results below the first screen. There are no mode selectors, unit selectors, reset, export or saved calculations. | Extend the shared calculation module and improve the result hierarchy. Preserve one numerical implementation for the page and assistant. |
| Numerical validation | Ordinary quantities work, but an extreme source-level probe with `massMg=1e100`, `volumeMl=1e-208`, `aliquotMcg=1e103` returns an infinite µg/mL value and zero aliquot volume. These values are outside practical laboratory use; the check demonstrates a boundary-validation gap. | Reject invalid derived results and unsupported ranges before displaying or exporting them. Add overflow, underflow and precision cases alongside useful laboratory examples. |
| Community discovery | Categories, threads, replies, reactions, reports, an activity page and human moderation endpoints exist. The live hub is empty and leads with seven large category cards and an empty leaderboard. Category counts are calculated from only the six recent threads; creation initializes `replyCount` to one for the original post. | Put useful discussions/search first, provide an honest empty state and compute totals with clear semantics. Do not manufacture launch activity or members. |
| Community trust | Reaction-based levels include Analyst, Senior and Fellow; sign-in does not establish scientific qualifications. Automatic moderation records verdicts, while new posts remain active. Missing provider configuration or a missing moderator prompt can return without creating a review event. | Use participation labels that cannot be mistaken for credentials. Define and enforce publication/review states, including provider failure, before expanding public participation. |
| Finnish/English completeness | The community composer has hardcoded English placeholders; category metadata includes “Category”; short relative times include “now”. Activity copy calls a thread listing “Today in peptide science” / a live feed. The assistant description metadata is English in both locales. | Extend the copy audit to tool pages, authenticated composers, metadata, time formatting and all error/review states. Describe actual behavior precisely. |
| Averia | Tool calling, streaming, product/batch lookup, comparisons, concentration maths, cart proposals, order/support tools, consent and retrieval already exist. The green Online label is static. Starter prompts ask for goal-based recommendations, “most commonly compared” products and a preparation walkthrough, without supplying evidence for those promises. Retrieval evaluation measures recall; it is not an answer-correctness evaluation. | Improve the existing assistant around concrete tasks, source visibility, current data and truthful state. Add answer/tool evaluations before adding broader capabilities. |

Source starting points: [calculator](../components/calculator/Calculator.tsx), [shared maths](../lib/calculations.ts), [assistant calculation tool](../lib/ai/tools/reconstitution.ts), [community hub](../app/[locale]/community/page.tsx), [community service](../lib/community/service.ts), [moderation](../lib/community/moderation.ts), [composer](../components/community/ThreadComposer.tsx), [assistant canvas](../components/ai/AssistantCanvas.tsx), [quick actions](../components/ai/QuickActions.tsx), [tool registry](../lib/ai/tools/registry.ts), [retrieval](../lib/ai/rag/retrieval.ts) and [evaluation runner](../scripts/ai-eval.ts).

### Peptide calculator: a laboratory calculation workspace

Keep the established laboratory purpose. Make the page useful for concentration, dilution and aliquot planning, with explicit units, assumptions and formulas.

First delivery:

- [x] Add three clear modes: **Concentration / Pitoisuus**, **Dilution / Laimennus** and **Aliquots / Osanäytteet**. Concentration can calculate either mass concentration or the final solution volume required for a target mass concentration. Dilution takes a stock concentration, target concentration and final volume. Aliquots show volume per aliquot, complete aliquot count and the remaining mass/volume.
- [x] Support explicit mass and volume selectors, initially mg/µg and mL/µL. Normalize to shared internal units before calculation. Clearly label final solution volume; do not equate it with the amount of solvent added. Support Finnish decimal entry, English decimal entry, pasted values and deliberate scientific notation without ambiguous parsing.
- [x] Show a compact result summary near the inputs, with a formula and substituted values available underneath. Keep full precision internally, apply deliberate display rounding and state the assumptions. Distinguish an incomplete field from a physically impossible calculation; keep errors next to their fields.
- [x] Add Reset, Copy result and CSV/print export. Include input values/units, mode, formula version, assumptions and any product/document reference. Identify exports as calculations. Avoid styling them as laboratory test certificates.
- [x] Add an explicit “Use this SKU in calculator” action to applicable product pages. Prefill the listed quantity and unit only; distinguish nominal catalogue quantity from measured analyte content. Let customers edit the value and retain its source. A supplies item with a volume unit must not populate the material-mass field.
- [x] Keep anonymous calculation available without sign-in. Add optional private history after the calculation modes are validated, using existing account/research-plan infrastructure where appropriate. Require an explicit sharing action and support revocation; do not publish a calculation just because the customer asks the assistant about it.

Molar concentration is a later, separately reviewed mode. Require the correct molar mass and chemical form, with an approved source or a clearly marked user-supplied value. Do not assign one molar mass to an unspecified blend or treat HPLC area purity as a measured content correction. Distinguish mass concentration from amount concentration; use the [IUPAC terminology](https://goldbook.iupac.org/terms/view/A00295) and [BIPM unit conventions](https://www.bipm.org/en/publications/si-brochure) during scientific review.

Acceptance examples, to be implemented as meaningful shared-module checks:

- 10 mg in a final 2 mL solution produces 5 mg/mL; a 250 µg aliquot occupies 50 µL, with 40 complete aliquots.
- Diluting 5 mg/mL stock to a final 2 mL at 1 mg/mL requires 0.4 mL stock, made up to the specified final volume. The UI must state the ideal dilution assumption and refer handling questions to the material's documentation.
- 1 mg total with 300 µg per aliquot yields three complete aliquots and 100 µg remaining. Changing display units preserves the underlying result.
- Empty, zero, negative, non-finite, incompatible-unit and unsupported-range inputs do not yield a valid-looking answer. An aliquot exceeding available material and a dilution target above the stock concentration receive specific errors.
- The page and assistant tool return the same result for the same normalized inputs. Both languages support keyboard entry, decimal formatting and legible results at 320/390/414 px.

Visual deliverable: a compact mode selector, labelled inputs with unit selectors, one blue-accented result summary, a collapsible formula/assumptions section and a small action row. Replace large empty gaps with useful grouping; keep source/assumption text readable. Check light and dark themes.

### Community: useful discussions with visible evidence

First delivery:

- [x] Put search, recent discussions and an unanswered filter before the category directory. Add category/language filters, pagination and exact thread/reply totals. Put moderator-maintained introductory topics and the posting guide in a compact sidebar. Publish real authored content only when reviewed; the empty state should explain how to start a useful discussion.
- [x] Redesign thread rows and the thread page around the question, category, language, last activity and reply state. Let long Finnish titles wrap. Keep methods, documents and product/batch references readable, with relevant links and an original-source section.
- [x] Improve the composer with Question, Methods discussion and Document question templates; preserve line breaks/Markdown, preview before publishing and retain private drafts. Support citations such as DOI links and approved document references without treating legitimate scientific identifiers as phone numbers or ordinary bibliographies as spam.
- [x] Use clear staff/moderator roles and neutral participation levels. Mark institutional or scientific credentials verified only if there is an actual verification workflow. Participation, a helpful reaction and scientific approval must remain distinct.
- [x] Make moderation effective: publish states and queue states must agree; flagged posts need the chosen hold/visibility policy enforced; provider absence/failure and missing prompts must produce an actionable human-review path. Persist moderation work durably with retry, deduplication and an audit trail. Explain submission/review/rejection states in both languages, keep drafts after failure and provide a correction/review route.
- [x] Finish language/error handling and notifications: localized placeholders, metadata, time labels, submission failures and moderation notices; notify authors of replies and review outcomes through the existing inbox/preferences. Announcements must enforce the actual staff permission policy server-side.

Acceptance: category counts remain correct beyond the recent-thread limit; a new thread has zero replies; hidden/removed content is absent from public pages, feeds and any AI index. Verify posting/reply/report actions, permissions, persisted drafts, moderation timeout/retry, queue resolution and localized recovery in an isolated database. Do not use live customers or public posts as test fixtures.

Later capabilities: optional answer acceptance by the question author, clearly labelled AI summaries with links to the cited posts, and user-requested drafting/translation. A summary or accepted answer is not a peer-review certification. AI may suggest text for review; it must not silently post as a customer, invent a researcher or simulate an active community.

Visual deliverable: a compact discussion list, helpful empty state and restrained sidebar; a readable thread with an evidence section; and a focused editor with inline review feedback. Give scientific content more prominence than leaderboards and badges.

### Averia/LLM: a focused assistant with inspectable sources

First delivery:

- [x] Replace broad starter prompts with useful tasks: **Find a product / Hae tuote**, **Check batch documents / Tarkista eräasiakirjat**, **Compare selected products / Vertaa valittuja tuotteita** and **Calculate a concentration / Laske pitoisuus**. Have comparisons request the customer's exact SKU selection. Do not imply popularity analytics, personal-goal suitability or preparation instructions that the records do not support. Finnish scientific editorial approval is still required before merchant release.
- [x] Render structured product/variant cards, comparisons, calculation cards and document references alongside concise answers. Each calculation card uses the shared deterministic maths, exposes units/inputs/formula and can open the corresponding calculator mode without silently overwriting existing work.
- [x] Make sources inspectable: product/SKU, exact batch where relevant, document title/date/version and original link. Preserve access permissions. Absent information is labelled; citation support for generated explanations still requires the live-provider/editorial evaluation below. A source link does not establish scientific approval.
- [x] Preserve the existing reviewed-source retrieval restriction; add source-version tracking for catalogue records, bounded reindexing on approved changes and removal of revoked/deleted catalogue records. Other future retrieval collections require their own lifecycle checks. Read current stock, price, saleability and document availability through authoritative tools rather than an old text index. Treat community content as attributed discussion, outside the approved product-evidence collection.
- [x] Match visible state to actual service behavior: replace the static green Online promise with neutral readiness or measured connection state. Provide localized loading, timeout, rate-limit, unavailable, cancel and retry states. Confirm saved memory and support actions only after persistence succeeds. Preserve role/ownership checks, consent and explicit confirmation for changes.
- [ ] Add a paired Finnish/English evaluation set covering at least 30 scenarios per language: catalogue discovery, known/unknown SKUs, typed quantities, missing/approved/revoked documents, exact batch associations, calculator modes, stale/conflicting records, tool/provider failure, injection, action confirmation, consent and private-order isolation. Score factual support, citation validity, numerical correctness, task completion and language separately from retrieval recall. Report provider skips explicitly; release checks must not treat skipped live evaluation as a pass.

Acceptance: no unsupported stock, price, purity, credential or document claim in the release scenario set; exact shared-calculator agreement; no unauthorized private data; confirmed actions agree with persisted state; stop/retry/reconnect behavior is usable on mobile. Record latency and usage under representative tasks, set a measured budget and check regressions. A previous provider smoke test proves connectivity for that test, not all proposed capabilities.

Later capabilities: summarizing an approved report with traceable passages, suggesting a cited community draft on request, and summarizing visible community discussions with explicit attribution. Add each capability only after its permissions, source lifecycle and evaluation cases exist. Keep customer/staff contexts separated and require human review of moderation decisions that affect publication or member standing.

Visual deliverable: a simpler assistant start screen, readable message widths, compact source/calculation cards and one clear composer. Move consent controls into a usable flow that does not cover the input or results. Integrate help at the relevant product/calculator/document page and keep floating controls clear of branding and mobile safe areas.

### Connected workflow and design review

Example: a customer selects BPC-157 5 mg, opens the calculator with the **nominal** quantity identified, enters a final solution volume and inspects the calculated concentration. They can ask Averia to explain that calculation, with the same inputs and formula. If a question remains, they can explicitly prepare a community draft with selected non-private references and review it before publishing. No step turns missing batch evidence into verified content.

Extend the visual concept with calculator modes, a populated and empty community hub, thread/editor/review states and assistant source/calculation/error states. Review the journeys in Finnish and English before building the components. The original HTML concept contains Home, Catalogue and Product only. The delivered calculator, community and assistant are reviewed in the running application; their browser evidence is separate from the concept’s 18 checks.

## Implementation order

1. **Correct visible and trust-related inconsistencies.** Fix the active-filter count, repeated homepage heading, category labels, branding/assistant/cart overlap and hardcoded tool/community copy. Resolve numerical boundary handling, misleading member/assistant labels and moderation publication gaps before promoting those features.
2. **Establish shared visual rules and navigation.** Adjust colour/spacing/radius/type tokens, choose one existing brand mark, preserve the mobile wordmark and simplify primary navigation. Include the calculator, community and assistant in the design review. Keep locale/query/hash preservation, accessibility and the current optional-3D behavior.
3. **Rework catalogue and product layouts.** Reduce image prominence, add compact rows, make search inline and move important product information above media on mobile. Render actual purchase/document states from existing data; add the reviewed SKU-to-calculator handoff. Preserve eligibility, inventory and authoritative quote calculations.
4. **Deliver the core calculator modes.** Implement shared unit normalization, concentration/dilution/aliquot logic, field validation, result hierarchy and exports. Verify the maths before adding saved history or molar concentration.
5. **Refine the homepage, documentation and account/form layouts.** Apply the compact hero and preview, structured record availability, shared contact/checkout/empty states and shorter footer. Preserve truthful copy, first-visit eligibility and consent rules.
6. **Improve Averia's existing capabilities.** Integrate deterministic calculation cards and selected-SKU comparisons, source visibility, truthful service/action states and the FI/EN answer/tool evaluation suite. Complete source lifecycle and permission checks before adding new retrieval collections.
7. **Deliver the community improvements.** Once moderation is reliable, implement discovery, exact counts, threads/editor/drafts, citations, neutral member labels and notifications. Seed only real reviewed introductory content. Validate permissions and failure/review states before inviting wider participation.
8. **Add advanced capabilities in measured increments.** Private saved calculations and user-requested community draft preparation are implemented with owner isolation and explicit review. Reviewed molar conversion, original-report summaries and broader community summarization follow their own source, permission and evaluation gates. Observe actual use and friction before adding further modes or automation.

Component starting points: [design tokens](../styles/globals.css), [header](../components/layout/Header.tsx), [logo](../components/layout/Logo.tsx), [mobile menu](../components/layout/MobileMenu.tsx), [homepage](../app/[locale]/page.tsx), [brand block](../components/home/BrandBlock.tsx), [hero](../components/home/Hero3D.tsx), [catalogue](../components/shop/ShopCatalog.tsx), [toolbar](../components/product/ShopToolbar.tsx), [product cards](../components/product/ProductCard.tsx), [product page](../app/[locale]/shop/[slug]/page.tsx), [purchase controls](../components/product/ProductDetailActions.tsx) and [footer](../components/layout/Footer.tsx).

## Review criteria before implementing and publishing

- At 390 × 844, the catalogue's first screen should show two useful product rows with readable names, SKUs, units and status; the product title, selected SKU and main action should be visible without scrolling through an image.
- Check Finnish and English at 320/390/414 px and 1024/1280/1440 px, with longer localized labels and 200% zoom. No document or control overflow; no hidden important information or overlay collisions.
- Preserve working quote submission, locale selection, exact size/unit handling, batch associations, cart state and authoritative checkout calculations. The illustration or front-end selection must not invent saleability.
- Show green “available” or approved-document styling only when actual backend eligibility and original records support it. Keep missing data, quotation mode and unavailability distinguishable.
- Repeat targeted accessibility, keyboard and browser checks for changed journeys. Keep images and optional 3D below the existing route budgets; measure actual responsiveness before making a performance claim.
- Extend the same checks to calculator result updates, community editor/review states and assistant source/error/consent states. Validate light/dark themes, mobile keyboards and screen-reader announcements. Keep the core calculator and community usable when the model provider is unavailable.
- Have laboratory purchasers and a Finnish/English scientific editor review the refined screens and status language. Automated checks do not establish scientific correctness or conversion improvement.

## Concept validation

The local concept was rendered in both languages across Home, Catalogue and Product at 320, 390 and 1440 px: 18 states checked for horizontal overflow, runtime errors and serious/critical axe findings. Interaction checks cover SKU filtering, material-type selection, product navigation, variant selection and preview dialog/Escape dismissal. See [the validation record](verification/ui-review-2026-10-14/concept-validation.json).

Screens: [desktop homepage concept](verification/ui-review-2026-10-14/concept-desktop-en-home.png), [Finnish mobile catalogue concept](verification/ui-review-2026-10-14/concept-mobile-fi-catalog.png) and [Finnish mobile product concept](verification/ui-review-2026-10-14/concept-mobile-fi-product.png).

The concept contains four examples while the current catalogue contains 15 entries. Its total page length is therefore not a valid before/after measurement. The useful comparison is how much information is visible per product and in the first screen; validate density with the full catalogue during implementation. It is a direction for component refinement, not a replacement for the current database-backed application.

## First delivery status

The practical implementation follows steps 1–7 above and adds optional private history and draft preparation from step 8. See [the implementation and verification record](RESEARCH_WORKSPACE_IMPLEMENTATION_2026-10-14.md) for the exact scope, results and remaining gates. Checkboxes indicate implemented behavior, not scientific/editorial approval. No original reports, chemical specifications, scientific credentials or community activity were fabricated.

Published delivery: [14 October deployment record](NETLIFY_DEPLOYMENT_2026-10-14.md). Final checks passed: 216 unit, 26 integration, 121 browser (2 explicit provider skips), 42 local visual states, 29 main-domain HTTP checks, 28 online browser states and 4 live assistant/tool checks. Full paired-model scientific/editorial evaluation and approved original reports remain separate gates.


## Follow-up — 15 October 2026

The [editorial, assistant-evaluation and recovery review](RESEARCH_EDITORIAL_REVIEW_2026-10-15.md) continues the remaining work. It records corrected Finnish/English terminology and workflow copy, controlled calculation explanations, source-backed numbered citations and a successful application-snapshot restore rehearsal. The live evaluation preserves partial and failed evidence separately. Approved seller details, original product/batch records and independent scientific/customer approval remain pending; the owner will provide the source records later.
