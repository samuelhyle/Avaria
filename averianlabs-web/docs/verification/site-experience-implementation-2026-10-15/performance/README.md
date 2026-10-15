# Final Node24 repeated mobile Lighthouse laboratory evidence

Runtime source: `4e4a948fb1cf722d11bac09340d140f174b54024`. Frozen build: `gbVoYSCId_d8o20D5NFmL`. Actual local server and audit-process Node: **24.22.0**. All **23 audits** completed: three runs across seven content routes, plus separate EN/FI first-visit age-gate reports. All **46 before/after API/database checks** passed. The owned server and all audit browsers stopped afterward. No forms, model prompts, customer actions or provider writes were submitted.

Lighthouse **12.6.1**, Google Chrome for Testing **148.0.7778.96**, simulated mobile **390×844/dpr1**, mobile simulation (RTT 150 ms, throughput 1638.4 Kbps; Lighthouse’s applied request latency 562.5 ms, download 1474.56 Kbps, upload 675 Kbps) and **4×CPU** slowdown. HTTP cache was cleared before each audit while essential/age consent persisted for the 21 content observations. Both local fonts transferred in full in the inspected PDP reports (about144KB including headers); browser/font-decode warmth remains possible. The warm local production server used 15 draft reference products and isolated synthetic commerce fixtures, so this is neither production-network evidence nor [field Core Web Vitals](https://web.dev/articles/vitals). TBT is not field INP.

The team paused its other builds, tests and browser work for this window. **Whole-host CPU isolation is not claimed:** unrelated workloads were left running. Forty-eight aggregate OS samples recorded 16 available processors, one-minute load averages 7.80–15.46, five-minute 13.03–15.18 and fifteen-minute 24.87–28.51. OS free memory ranged 0.34–1.98GB of 77.31GB; this is not a measurement of reclaimable/available memory or proof of memory pressure. Per-audit values remain in the summary; no other application names or credentials were collected.

All 23 reports scored **100 accessibility**, **100 best practices** and **0 CLS**. SEO 66 reflects deliberate review-site noindex, the sole failed SEO check. Automated scores supplement the browser/manual checks and are not a universal accessibility certification. **The 2.5 s LCP target is not met** by any content-route median. The first home observation (performance 56, TBT 1725 ms) is retained in the range and raw reports; no slow observations were discarded.

Performance scores follow [Lighthouse metric weighting](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). Medians and complete ranges retain the [measurement variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) across all three observations.

| Content route | Performance median (range) | LCP seconds median (range) | TBT ms median (range) |
| --- | ---: | ---: | ---: |
| /en | 91 (56–91) | 3.16 (3.16–4.67) | 177 (173–1725) |
| /fi/shop | 88 (85–89) | 3.31 (3.31–3.46) | 219 (172–330) |
| /en/shop/bpc-157 | 79 (78–89) | 5.00 (3.47–5.11) | 179 (172–216) |
| /fi/peptide-calculator | 85 (72–91) | 4.02 (3.16–4.11) | 187 (168–559) |
| /en/assistant | 91 (79–91) | 3.16 (3.16–5.08) | 170 (158–170) |
| /fi/community | 86 (78–91) | 4.14 (3.31–5.17) | 120 (104–206) |
| /en/documents | 93 (77–94) | 3.04 (3.04–5.48) | 134 (98–184) |

The following single first-visit observations use fresh browser profiles and are kept separate from content medians.

| First visit | Performance | LCP seconds | TBT ms |
| --- | ---: | ---: | ---: |
| /en | 84 | 4.15 | 174 |
| /fi | 82 | 4.30 | 201 |

The full earlier 23-run **source e8 / Node 22.20** baseline remains under [performance-release7](../performance-release7/README.md). [release7-comparison.json](release7-comparison.json) compares actual environments descriptively. Source, runtime and ambient conditions differ, and the earlier run did not retain equivalent host telemetry. Changes in median score are therefore not causal evidence of a Node, provider-placement or gate improvement.

The repeated PDP LCP remains the ordinary description paragraph at `app/[locale]/shop/[slug]/page.tsx:101`, with 91% render delay in the median sample. Its reported critical chain is document→manifest; there is no image load phase or gallery reveal animation. [pdp-render-delay-findings.json](pdp-render-delay-findings.json) retains all three elements/phases, observed versus simulated timings and late chunk evidence. The closed floating chat still imports motion/markdown through its idle loader. An on-demand loader is a concrete later experiment; these traces do not establish it as the sole LCP cause, and this release did not implement that optimization.

A zero-report browser-startup attempt is preserved separately in [performance-node24-startup-attempt.json](../local/performance-node24-startup-attempt.json). The same Chrome 148 binary subsequently passed readiness/CDP checks; the completed run adds an explicit bounded debugging-endpoint readiness check before any measurement. No failed startup was classified as a performance observation. [performance-node24-server.json](../local/performance-node24-server.json) records the owned server lifecycle, source/build/version and all 46 healthy checks.

Raw JSON and HTML reports are preserved in `lighthouse-raw-reports.zip`. `archive-manifest.json` lists every original filename, byte count and SHA-256 and the archive checksum. The archive was verified before removing the loose duplicate files. The readable `mobile-lighthouse-summary.json` retains every measurement and laboratory limitation.
