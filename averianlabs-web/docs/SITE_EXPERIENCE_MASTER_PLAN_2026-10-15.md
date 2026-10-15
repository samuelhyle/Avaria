# AverianLabs — visual, content and customer-experience master plan

Date: 15 October 2026 · Status: implementation published to the online review site.

## Outcome

Make AverianLabs feel like a well-designed research workspace: clear, calm, approachable and precise. A customer should quickly find a material, understand its current status, inspect the right records, perform a calculation and obtain help. Visual appeal should come from strong typography, useful imagery and well-presented information.

Keep the established blue/ink/Æ identity and the working Next.js foundation. The next pass should improve the current product through small, reviewable changes. The [visual direction board](SITE_VISUAL_DIRECTION_2026-10-15.html) makes the proposed hierarchy, typography, states and mobile conversation layout concrete. It is a component study, not an implemented redesign or approved product evidence.

Execution is tracked in the [implementation and validation ledger](SITE_EXPERIENCE_IMPLEMENTATION_2026-10-15.md), with the published identity and rollback in the [experience release record](NETLIFY_EXPERIENCE_DEPLOYMENT_2026-10-15.md). The original findings and acceptance criteria below remain the review baseline, rather than a description of every current issue. The ledger records completed A1–C3 work, recorded regressions, measured loading follow-ups and the remaining source/human dependencies. This is the active plan. The [14 October plan](UI_VISUAL_REVIEW_2026-10-14.md), [implementation ledger](RESEARCH_WORKSPACE_IMPLEMENTATION_2026-10-14.md) and [15 October release](NETLIFY_DEPLOYMENT_2026-10-15.md) remain historical records of delivered work.

## Review basis and present strengths

Reviewed the deployed [Finnish](https://averianlabs-demo.netlify.app/fi) and [English](https://averianlabs-demo.netlify.app/en) application and its source. Fresh evidence includes 24 full-page captures across 12 routes, four supplementary narrow/theme/first-visit captures, an independent 24-state bilingual text extraction, a delayed first-visit observation, social-image downloads and targeted source/CSS inspection. See [the evidence index](verification/site-experience-review-2026-10-15/README.md).

All 24 main route captures returned HTTP 200 without horizontal overflow. One React hydration error was captured while visiting the English empty cart; five independent follow-up reads did not reproduce it. Keep this as an unresolved intermittent finding. The audit is not a fresh complete checkout, accessibility or model evaluation.

Preserve the delivered calculator modes, unit conversion, exports/private history, exact SKU handoffs, community search/private drafts/human publication review, source-based assistant replies, explicit consent and optional lazy-loaded 3D. Preserve purchase eligibility, access control and the distinction between nominal quantity, measured content, identity and chromatographic area purity.

Seller details, approved specifications and original batch reports will come later, as agreed. Design, copy, accessibility and error-state work can proceed now. Merchant release and source-dependent scientific features retain their existing gates.

## 1. Fix the concrete experience gaps first

Priorities describe order, not a claim that every item is a confirmed production failure. **A** comes before general restyling; **B** is core journey work; **C** is finishing and expansion.

| Order | Observed finding | Planned change and acceptance |
| --- | --- | --- |
| A1 | Product handoffs set `finalVolumeMl: 2`, while a product source suppresses the calculator's example-input notice. Source: `app/[locale]/peptide-calculator/page.tsx:34`, `components/calculator/Calculator.tsx:365`. | Prefill only the supported nominal product quantity. Require the customer's final volume, or visibly mark every example field. A product link must never present 2 mL as documented preparation information. |
| A2 | Several document routes use `.catch(() => [])`, making a service failure look like absent records. Sources: `app/[locale]/coa/page.tsx`, `documents/page.tsx`, `shop/[slug]/page.tsx`. | Share explicit empty, no-match, restricted, temporarily unavailable and file-failure states. A simulated service failure shows Retry/help and never asserts that documents do not exist. |
| A3 | Assistant Markdown uses typography classes absent from the deployed CSS. A browser-only fixture confirmed unstyled headings/lists and visually indistinguishable links. Source: `components/ai/MessageList.tsx:247`. | Introduce an explicitly styled research Markdown renderer. Verify headings, lists, citations, long URLs, formulas and tables at 320 px and in both themes. |
| A4 | One React #418 event occurred on an EN cart visit; five subsequent checks were clean. | Reproduce with production streaming, theme, locale, consent, cached navigation and empty/persisted cart states. Capture diagnostic evidence and resolve the cause before calling hydration consistently clean. Do not suppress the warning or discard the first event. |
| B1 | Important explanations are frequently 12 px; the assistant composer clips its long placeholder and stays one row. | Apply readable text roles and an auto-growing composer. Important assumptions/consent stay legible; mobile keyboard, long Finnish text and text enlargement remain usable. |
| B2 | Mobile filters update immediately but say Apply; category controls lack a selected accessibility state. Source: `ShopFilterSidebar.tsx:45,98,261`. | Use staged filters with Apply/Cancel, or immediate filters with Show results. Expose checked state and preserve URL/Back behavior. |
| B3 | Loading skeletons still use old gallery/grid layouts and fixed widths. Sources: shop, product and community `loading.tsx` files. | Match final layouts and constrain widths. Delayed loading at 320 px must not overflow or move the main title/action dramatically. |
| B4 | Documents, COA library, batch documents and lab tests compete as navigation concepts. `/documents` promises discovery without search/filter controls. | Create one Documents entry with meaningful types/filters; give interpretation guidance a separate educational label. Preserve existing links through aliases or redirects. |
| B5 | Mobile chat/platform branding can sit over useful content; the shared footer is disproportionately long on narrow pages. | Coordinate supported host placement, chat/compare controls, scroll padding and keyboard insets. Shorten/group mobile footer content while keeping contact, privacy and cookie controls reachable. Hide the empty accepted-payment heading until supported methods are actually shown. |
| B6 | Every material uses the same pastel tube; category colors also tint the 3D contents. The 3D view independently selects a variant and default language. | Use neutral illustrative imagery now; pass selected SKU/locale through all media. Product appearance and package labels must agree with approved evidence when photographs arrive. |
| B7 | Live FI/EN default social images downloaded identically in English; metadata points at the merchant domain during review. | Diagnose image-query/cache/environment behavior. Verify distinct actual localized previews and reachable intended origins, including fallback images. |
| C1 | Header lacks current-section cues; mobile comparison entry disappears; search storage can throw. | Add active navigation/`aria-current`, a deliberate mobile comparison path, optional resilient recent-search storage and Clear history. |
| C2 | The hero has duplicated arrows; labels mix catalog/catalogue and Finnish title capitalization; repeated tips/links add little. | Finish the editorial pass below, including contextual tool summaries, Finnish sentence case and a consistent termbase. |
| C3 | Loading a draft can replace current unsaved text; assistant auto-scroll can pull readers away from an earlier answer. | Add dirty-state protection, last-saved feedback and recoverable draft actions; scroll-follow only near the bottom and show New answer otherwise. |

## 2. Establish one visual language

Use **precision, warmth and restraint** as the direction. Retain ink `#17263D`, blue `#105BE1`, pale background `#F5F7FA` and Geist. Make the brand distinctive through a consistent layout, strong numbers and useful diagrams. Review the existing dark palette separately rather than assuming the light design carries over.

| Element | Proposed working rule |
| --- | --- |
| Typography | Body 16 px; supporting explanations 14–16 px; compact technical metadata 12–13 px. Main headings approximately 44–52 px desktop and 30–36 px mobile. Test actual Finnish wrapping. |
| Reading rhythm | Body line height approximately 1.5–1.65; prose around 62–72 characters per line. Keep units with their values and use tabular numerals in results/tables. |
| Layout | Retain the 1,200–1,280 px page container. Use 16–24 px mobile gutters and a shared 8/12/16/24/32/48 spacing scale. Reduce unnecessary card-within-card borders. |
| Surfaces | White/light or restrained dark panels; one quiet border; limited shadows. Use section spacing and headings to establish hierarchy. |
| Controls | One clear primary action per decision area; familiar secondary/text actions. Aim for 44 px primary touch controls as a project usability target. Provide visible labels, focus and selected states. |
| Status | Name the actual condition: not confirmed, no public records, restricted, unavailable or temporarily unreachable. Distinguish status with text/icon as well as color. |
| Motion | Small purposeful transitions. Important text and numerical results should be visible independently of entrance animation. Respect reduced motion; reserve dimensions before media loads. |
| Brand assets | One canonical SVG Æ mark, consistent clear space and derived favicon, Apple and sharing assets. Use one icon family and review icons that could suggest unsupported benefits. |

Build a small reference set before broad rollout: navigation, buttons/fields, selected filters, SKU row, status/evidence panel, document row, calculator result, scientific figure, assistant source card, empty/error/loading states and footer. Implement those in existing components; avoid a second competing design system.

## 3. Reshape the information around customer tasks

Primary paths: **Catalogue → product/SKU → batch/document → enquiry or eligible order**; **Tools → calculator/Averia**; **Community → discussion/draft/review**; **Support → contact/help**.

Use Documents / Asiakirjat as the main library name; Batch documents / Eräasiakirjat and Certificates of Analysis (COAs) / Analyysitodistukset are meaningful subsets. Understanding test results / Analyysitulosten tulkinta explains methods and limits. Do not merge educational guidance into product evidence. Introduce Tuotekoodi (SKU) once, then use the appropriate short term consistently.

| Surface | Target shape |
| --- | --- |
| Home | A concise customer promise, direct catalogue search/entry and a document action. Replace arbitrary product prominence with a useful record/workflow preview or clearly identified catalogue example. Remove duplicate arrows. Use one short preview-status explanation while retaining each product's actual state. |
| Catalogue | Fast search, comprehensible filters, applied-filter summary, readable rows and a real mobile comparison path. Prioritize name, nominal quantity/unit, selected SKU and availability/evidence. Keep thumbnails small; avoid identical repeated paragraphs. |
| Product | Selected identity/quantity first, clear action and compact evidence summary. Keep media consistent with the selected variant. Respect each document’s declared product, variant or batch scope; product-wide documents may cover multiple SKUs, while batch reports require exact batch associations. Use labelled specifications when approved; make missing information actionable. Consider Nominal quantity instead of Vial size where the selector describes mass. |
| Document library | Useful search by product/SKU/batch/type, clear no-match and service-error states, original link/version/method context when available. For an empty corpus, offer one document-enquiry action and a short explanation. |
| Quality/about | Explain how records relate and what can actually be assessed today. Add real company/team/process material once supplied. Replace repeated abstract assurances with useful examples and limitations. |
| Calculator | Compact mode/input area and a prominent result with units. Mark input origin per field; separate example, catalogue nominal and user values. Keep formula/assumptions close and readable; group export actions. Improve screen-reader announcements without reading the entire result panel on every keystroke. |
| Averia | One focused welcome, readable answers and inspectable source/calculation cards. Remove duplicate task tips. Show source type and relevant date/SKU; separate general guidance from original batch evidence. Auto-grow input, preserve reading position and make retry retain the question. |
| Community | A deliberate empty/onboarding state, three useful question formats and one discussion action. De-emphasize zero-count furniture. Show private draft/submitted/published states and last-saved time. Publish genuine reviewed introductory guidance when available. |
| Research tools | Short summaries written for each destination. Do not reuse text such as “the methods below” where no methods follow. Maintain clear handoffs with quantity/source/task context. |
| Contact/forms/account | Clear labels, minimum necessary fields, useful validation and accurate persistence/delivery feedback. Preserve work on failure or sign-in. Review deletion/export/privacy wording and disabled states together. |
| Cart/checkout | Calm, explicit quantity/price/tax/shipping and actual payment/review state. Useful empty cart and recovery paths. Design against isolated fixtures until merchant prerequisites are met; retain real eligibility restrictions. |
| Editorial/help/legal | Structured headings, concise summaries, accessible tables/figures and source/date information. Inventory metadata, emails and downloads alongside visible pages. Keep policies aligned with approved operations. |

## 4. Rewrite for clarity in Finnish and English

Use a warm, direct voice. Researchers should be able to understand the task without reading a policy paragraph first. Put qualifications that affect interpretation beside the relevant claim/result; move supporting detail into clearly labelled expansion. Keep chemical names, identifiers and reported units exact.

The following are **proposed edits**, subject to context and language/scientific review:

| Context | English proposal | Finnish proposal |
| --- | --- | --- |
| Catalogue introduction | Check product availability and the original documents for your selected batch. | Tarkista tuotteen saatavuus ja valitun erän alkuperäiset asiakirjat. |
| Unconfirmed specifications | Product specifications are not yet confirmed. Ask about the documents you need. | Tuotetietoja ei ole vielä vahvistettu. Kysy tarvitsemistasi asiakirjoista. |
| Compact public-document state | No public documents | Ei julkisia asiakirjoja |
| Document-service failure | Documents could not be loaded. Try again. | Asiakirjoja ei voitu ladata. Yritä uudelleen. |
| Search submit | Search | Hae |
| Educational tool card | Learn what different analytical methods can tell you about a material. | Tutustu siihen, mitä eri analyysimenetelmät kertovat materiaalista. |
| Averia welcome | Find a product, inspect its published records or work through a laboratory calculation. | Hae tuote, tarkista sen julkaistut asiakirjat tai käy läpi laboratoriolaskelma. |
| Support persistence success | Message received | Viesti vastaanotettu |
| Source label | Product record | Tuotetieto |
| Educational link | Understanding test results | Analyysitulosten tulkinta |

Choose British English consistently, including catalogue. Use natural Finnish sentence case; remove CSS capitalization from translated categories. Agree a termbase for tuote, tuoteversio, tuotekoodi, erä, asiakirja, analyysitodistus, pitoisuus, osanäyte/alikvootti and moolimassa. Use the precise term the context requires. Replace awkward institutional-buyer wording with clear audience language after confirming its eligibility meaning.

Create a content ledger with **route/component, translation key or data source, state, current EN/FI text, proposed text, factual source, reviewer and approval status**. Cover navigation, metadata/social cards, CMS/database text, forms/errors/toasts, accessible labels, account actions, moderation, emails/subjects/preheaders, calculator copy/CSV/print, assistant tool/result cards, image captions and legal/support pages. Key parity remains a technical check, separate from editorial approval.

## 5. Upgrade images without manufacturing credibility

**Available now:** one better-proportioned neutral illustrative container, canonical SVG branding, consistent icons, localized social images and three original educational diagrams: final solution volume versus added solvent; nominal quantity versus measured content; product → SKU → batch → original report. Review scientific diagrams and provide a text equivalent.

Move category color onto a surrounding accent, rather than depicting colored contents. Keep the visible illustration label. Make 3D receive the selected variant/locale, use a single calm rotation path, support pause/close and respond to reduced-motion changes. Record the actual source/license of the existing HDR asset; do not infer permission from its filename.

**When owner originals arrive:** commission authentic front packshots, label detail, supplied package/closure views and meaningful variant-size comparisons. Use a consistent square composition, scale, neutral background and lighting. Link each image to its exact approved product/variant. Use real facility/team photography only with accurate identity and permission. Original report previews must come from approved public files and retain their original links/version.

Every asset needs an inventory record: purpose, source/owner, license/permission, actual photograph/illustration/diagram classification, SKU/batch association where relevant, locale, alt text, caption, review status and responsive variants. Meaningful scientific figures need their full aspect ratio, readable labels and an equivalent explanation/table; the existing glossary `alt=""`/fixed `object-cover` pattern must be replaced before such figures are published.

Use responsive optimized images with reserved dimensions and graceful fallbacks. Keep 3D, HDR and PDF code outside initial route downloads. Validate the actual FI/EN 1200 × 630 social images and their crop-safe layout. Replace the stale static-demo fallback and verify environment-specific URLs.

## 6. Extend capabilities in the right order

**Calculator:** first fix input provenance, mobile layout, announcements and named/clear history states. Keep one deterministic engine and existing export/handoff parity. Additional modes follow demonstrated customer needs. Molar concentration needs correct chemical forms, composition, molar masses and source review; do not substitute HPLC area purity for quantitative content.

**Community:** first protect unsaved text, clarify draft/publication state and improve discovery/onboarding. Then consider author-accepted answers and opt-in AI drafting/translation with source links. Acceptance/reactions must not imply peer review or credentials. Keep explicit user review and human publication decisions.

**LLM:** first fix answer presentation, source inspection, input editing, interruptions and completion feedback. Then broaden useful exact-record workflows. Original-report summaries require approved originals, permissions, version tracking and separate source-faithfulness evaluation. Broader community summaries need attribution, visibility checks and correction/removal behavior. Retain no-persistence semantics and action confirmation.

## 7. Implementation packages in the best order

| Package | Deliverable | Exit condition |
| --- | --- | --- |
| 1 — Confidence and comprehension | A1–A4, honest document-state contract, semantic Markdown, calculator field provenance; hydration diagnosis. | Targeted regression/failure fixtures pass; original intermittent evidence remains traceable until resolved. |
| 2 — Shared foundation | Finalize the board, typography/spacing/state patterns, accessible controls, navigation and overlay/loading rules. | Reference components work in EN/FI, light/dark, narrow/zoomed/loading states. |
| 3 — Core discovery | Home, catalogue, product, document library and mobile comparison; consistent search/filter behavior. | Customers can find a SKU, identify its selected quantity/status and find or recognize absent evidence. |
| 4 — Research workspace | Calculator, assistant and community refinements using the shared foundation. | Calculation/source handoffs, private drafts, reading position, retry and publication understanding remain intact. |
| 5 — Content and assets | Full FI/EN ledger review, diagrams, brand/social assets, help/about/forms/emails/exports. Authentic photographs and seller/report data join when supplied. | Each changed claim/asset has a source or explicit pending state; native Finnish/scientific decisions are recorded. |
| 6 — Validation and review release | Complete route/state matrix, researcher task sessions, performance checks and a review deployment with evidence. | Publish only the verified artifact; keep merchant prerequisites separate. Record exact source, results and remaining findings. |

Content inventory and asset preparation can run alongside packages 1–2. Roll components through one complete journey before changing every page. Keep data/schema and commerce changes narrowly scoped; do not bundle a visual refactor with unreviewed purchase or publication behavior.

## 8. Acceptance and quality bar

- Review EN/FI at 320, 390, 414, 768, 1024 and 1440 px; light/dark, reduced motion, 200% zoom/text spacing, long chemical names/URLs and representative mobile keyboards.
- Include fresh/returning visits, eligibility/consent layers, empty/no-match/loading/error/restricted states, long assistant/table answers, retained drafts, provider interruption and expired links. The delayed fresh-visit check observed the age dialog; keyboard/focus sequencing still needs verification.
- Check keyboard order, visible/unobscured focus, labels, selected states, contrast, reflow, meaningful alternatives and restrained live announcements against [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Automated axe checks complement manual/screen-reader testing.
- Add route budgets for calculator, assistant and community. Use repeated mobile lab measurements and real-device checks. Field targets are LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile; consent-respecting field data is required before claiming those outcomes. See [Web Vitals](https://web.dev/articles/vitals).
- Test meaningful customer tasks with Finnish/English laboratory buyers: find a product/SKU, understand nominal quantity and availability, locate or recognize absent batch evidence, enter a calculation, inspect an assistant source, save privately and understand human publication review. Proposed target: ≥90% unassisted task completion and zero critical misunderstandings of evidence, units, privacy or publication. Treat the sessions as qualitative evidence, not proof of conversion gain.
- Run relevant calculator, ownership, privacy, moderation, document and checkout regressions after changes; exercise mocked failures and slow loading. Repeat the full bilingual assistant evaluation on the final changed behavior and maintain the broader approved-source/action/privacy evaluation. Preserve failed attempts and provider skips honestly.
- Finish with native Finnish/English editorial review, independent scientific review of changed scientific material, visual comparison, original-source checks and a deployment record. The previous 274 unit tests and 18 focused live cases are historical baselines, not results for this proposed redesign.

## First implementation slice

Start with calculator source/example separation, honest document failures and explicit assistant Markdown. In parallel, finalize the visual reference components and copy termbase. Then apply the new reading hierarchy to catalogue → product → documents and calculator → assistant. This gives customers immediate gains while the owner-dependent records are still pending.

The [React #418 reference](https://react.dev/errors/418) identifies the captured warning as hydration mismatch; it does not establish this site's root cause. The [review evidence](verification/site-experience-review-2026-10-15/README.md) retains both that observation and the five clean follow-up reads.
