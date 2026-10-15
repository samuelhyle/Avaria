# Footer hydration finding and boundary experiment — 2026-10-15

**Initial status: observed failure; proposed mechanism remains unproven.** This note records the evidence before validating the single-variable Footer Suspense experiment. It is not a claim that React issue #37321 is the proven cause, or that the app change has passed acceptance.

The pre-experiment local runtime was built from `dd62af2231e6a1a3974ea591a4d5e94c434c6293`. Its [browser findings](dd62-browser-findings.json) preserve the failed run and trace hashes. Existing successful online observations from older candidates do not override this local failure.

## Observations

- [Native served-JavaScript CDP capture](averian-hydration-diagnostics-cdp-system-theme-local-20261015.json) has two actual page-error rows with React #418, one Finnish and one English. Its diagnostics array is shared within each context: repeated rows containing the same diagnostic are not independent new mismatch events. No source JavaScript patch was applied by that probe.
- At the captured failure, the Footer host fiber refers to the actual `<footer>`. Its Container fiber instead refers to the grid div, and the grid fiber refers to the logo div. The next unnamed div claim fails. This is evidence of a displaced hydration cursor; the capture alone does not establish why it became displaced.
- A fresh anonymous public `GET /en` inspected before the experiment contains the expected `footer → div.mx-auto → div.grid → div` nesting in both the HTML and the serialized Flight footer row. The footer text and links agree in those representations. No demonstrated mismatched copy, locale or invalid nesting explains the captured shift. The inspected full HTML is retained locally at `/tmp/averian-bilingual-footer-review-html-20261015.html`; this read did not issue a customer/provider write.
- [Subsequent bounded footer probe](averian-hydration-footer-probe-20261015.json) completed 144 native GET observations without reproducing a mismatch: 72 with browser-only DOM observation and 72 without. It therefore supplies no failing readyState/cursor capture. Clean isolated timing does not disprove the failure already observed under browser-suite load.

## Supported hypothesis and selected experiment

Chrome renders an async server Footer after main inside the client CatalogueProvider. The Footer has no explicit Suspense boundary and awaits request-scoped translations. The shipped React host claim path immediately descends into the claimed node's first child. Its dehydrated Suspense path has separate boundary markers, retry handling and cursor entry/reset. The [React Suspense documentation](https://react.dev/reference/react/Suspense) describes its integration with streaming and selective hydration.

The first experiment changes only `components/layout/Chrome.tsx`: import `Suspense` and enclose the existing Footer in `<Suspense fallback={null}>`. It supplies an explicit hydration unit for the deferred footer. Provider placement, Footer markup and copy, catalogue retrieval, APIs and configuration remain the same. Root and the independent diagnostic agent agreed to this single-variable comparison.

The upstream [React streaming-hydration report #37321](https://github.com/react/react/issues/37321) describes a timing-related cursor problem with cached JavaScript and HTML still parsing. That report concerns other framework/React versions and a different captured location. It is a plausible analogue, not proof of this app's mechanism. No vendor scheduler patch, guessed delay, error suppression or dependency upgrade is part of the experiment.

Moving Footer outside CatalogueProvider would reduce its context scope but leave other client providers above it. Awaiting footer copy and rendering a synchronous Footer would remove one deferred server hop. Neither alternative independently proves a correction to parser/hydration interleaving, so neither was combined with the first experiment.

## Validation required before claiming resolution

1. Rebuild the actual runtime and rerun the strict full browser suite, including repeated Finnish/English full navigations under the workload that exposed the mismatch. Preserve the original failed records.
2. Run the independent cached-JavaScript/slower-HTML diagnostic as a labelled diagnostic condition; it is not production-performance measurement. Retain any failing cursor/readyState capture.
3. Check both languages with JavaScript disabled: the footer content and important links must remain visible and usable. A null fallback must not silently hide the footer. If streamed completion requires JavaScript, replace the experiment with a supported approach that preserves meaningful no-JavaScript content before acceptance.
4. Check normal footer layout, cookie settings and accessibility after the final build. Online final screenshots must carry that build's exact immutable deployment/source identity.

Subsequent validation results belong in the implementation/evidence index. This pre-validation finding remains a record of the original failure and the reason for the chosen experiment.

## Follow-up: boundary experiment rejected; synchronous data refactor pending browser validation

Root reported the rebuilt `1d4fe833e690d32b35ffe14d0c4b4a36def3f3cf` full suite as 129 passed, 8 failed and 2 skipped. The run used the suite default of eight workers. Both no-JavaScript footer checks failed because the streamed null fallback left the footer hidden. The boundary experiment therefore failed its acceptance condition and was removed; it must not be reported as a successful fix.

The [post-boundary timing capture](averian-hydration-footer-boundary-probe-20261015.json), supplied by the independent diagnostic agent, captured another mismatch in the home hero while `document.readyState` was `loading`: the expected section's cursor had entered a nested BrandBlock div. This broadens the observed location beyond Footer and prevents claiming that a Footer-only change establishes a global hydration solution. The probe uses deliberate cached-script/slower-HTML conditions and is diagnostic evidence, not production-performance measurement.

At root's direction, the replacement resolves all footer source data with an explicit-locale `getFooterContent(locale)` server loader, awaited alongside catalogue retrieval before Chrome returns. Footer is synchronous client presentation using only serializable resolved labels, columns, public legal display values, year and the existing payment display condition. No secret value is serialized; no API or configuration was changed. The Footer DOM, visible text and classes are retained, and the failed Suspense wrapper is removed. This removes deferred Footer server-child rendering and restores a design capable of complete server-rendered footer HTML. It is not yet proof of global hydration resolution.

Three focused tests passed against the replacement source: real EN/FI source copy produces complete synchronous footer HTML with existing links/disclosures and pending legal wording, and serialization exposes the payment label rather than the secret. The strict EN/FI browser no-JavaScript footer/navigation checks and rebuilt full suite remain required. Any subsequent browser result must identify its actual new build; it must not reuse the 1d4 or older candidate identity.

## Rebuilt e8e local validation

Root's completed local validation for source `e8e511e3f323fa439070864ac5873e301fb0ca8f` passed 374 unit tests and 138 of 140 browser cases, with two explicit real-provider skips, using eight browser workers. The passing browser coverage includes six slow cached-HTML navigations, 12 repeated hydration navigations, both strict no-JavaScript footer/navigation cases and the tested privacy flows. No React #418 appeared within that recorded coverage.

This supports the application correction for those regressions; it does not prove the exact upstream mechanism or a framework-wide fix. One Node TransformStream controller error remained in the server log during the passing browser run, with its relationship to hydration unproven. That event is retained and prevents claiming wholly clean server logs. Fresh immutable hosted verification remains separate and must carry its own deployment/source identity.
