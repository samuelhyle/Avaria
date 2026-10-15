# Historical release7 repeated mobile Lighthouse laboratory evidence

This folder retains the actual source-e8 / Node22.20 baseline. The later final Node24 results are recorded separately under [performance](../performance/README.md); these historical measurements are not relabeled as final-source evidence.

Runtime source: `e8e511e3f323fa439070864ac5873e301fb0ca8f`. Frozen build: `IEATsP20c06gq_xW_bo4C`. All 23 audits completed: three runs across seven content routes, plus separate EN/FI first-visit age-gate reports. The coordinated window excluded team browser/build/test/compression work. All 46 before/after API/database checks passed; the owned server exited afterward. No forms, model prompts, customer actions or external writes were submitted.

Lighthouse 12.6.1, Google Chrome for Testing 148.0.7778.96, simulated mobile 390×844/dpr1, default simulated mobile network and 4×CPU slowdown. HTTP cache was cleared before each audit while essential/age consent persisted. Full font downloads were observed; browser/font-decode warmth remains possible. The warm local production server used isolated QA fixtures, so this is not a production-network or [field Core Web Vitals](https://web.dev/articles/vitals) result. TBT is not field INP.

All 23 reports scored 100 accessibility, 100 best practices and 0 CLS. SEO 66 reflects intentional review-site noindex, the sole failed SEO audit. The 2.5 s LCP target is not met in this laboratory set. Automated accessibility scores supplement the browser/manual review; they are not a universal accessibility certification.

Performance scores follow [Lighthouse metric weighting](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). Medians and ranges retain the [measurement variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) across all three observations.

| Content route | Performance median (range) | LCP seconds median (range) | TBT ms median (range) |
| --- | ---: | ---: | ---: |
| /en | 91 (90–91) | 3.16 (3.16–3.17) | 187 (173–206) |
| /fi/shop | 86 (86–86) | 3.31 (3.31–3.31) | 292 (274–296) |
| /en/shop/bpc-157 | 77 (73–78) | 5.59 (5.47–5.60) | 182 (156–300) |
| /fi/peptide-calculator | 87 (77–91) | 3.16 (3.16–3.18) | 293 (176–634) |
| /en/assistant | 85 (69–90) | 4.16 (3.16–4.24) | 196 (119–686) |
| /fi/community | 84 (75–90) | 4.16 (3.31–5.64) | 176 (174–220) |
| /en/documents | 78 (77–92) | 3.04 (3.04–5.46) | 179 (179–631) |

The following are single first-visit observations, kept separate from the content medians.

| First visit | Performance | LCP seconds | TBT ms |
| --- | ---: | ---: | ---: |
| /en | 84 | 4.15 | 181 |
| /fi | 85 | 3.17 | 351 |

The repeated PDP LCP element is the ordinary description paragraph at `app/[locale]/shop/[slug]/page.tsx:101`. The median sample attributes 92% of simulated LCP to render delay; there is no LCP-image resource delay or gallery reveal animation. Its reported critical chain is document→manifest, not an image chain. `pdp-render-delay-findings.json` preserves the element, timing phases, observed versus simulated values, chunk mapping and concrete follow-up. The idle-loaded floating chat imports its motion/markdown code while closed; on-demand loading is a supported next experiment that requires A/B measurement before assigning causality or claiming an improvement. No application source was changed for this result.


Raw JSON and HTML reports are preserved in `lighthouse-raw-reports.zip`. `archive-manifest.json` lists every original filename, byte count and SHA-256 and the archive checksum. The archive was verified before removing the loose duplicate files. The readable `mobile-lighthouse-summary.json` retains every measurement and laboratory limitation.
