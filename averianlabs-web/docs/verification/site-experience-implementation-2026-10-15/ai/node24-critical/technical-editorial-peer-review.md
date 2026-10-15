# Technical/editorial peer review — candidate 10

All **18 actual answers and complete tool records** in [api-cases.json](api-cases.json) were read. **No material issue was found in this case set.** This is a separate Codex technical/English–Finnish editorial review; independent scientific and native-language approval remain pending.

Source `4e4a948fb1cf722d11bac09340d140f174b54024`, [exact candidate](https://6ad10a0d17b4322a59f0afd8--averianlabs-demo.netlify.app); actual managed serving Node **24.21.0**, separate from pinned build/local **24.22.0**. See [deploy-filtered private runtime proof](../../local/final-serving-runtime.json) and [source/runtime comparison](../final-server-source-equivalence.json).

Exact raw-result SHA256: `0aa79b5b88c1a95e1dce69d8dde2e9f274c0d2a9e39f01607a56b399f7466667`. The raw file and caller assessment were not edited. Per-case input/tool outcomes are in [the peer-review JSON](technical-editorial-peer-review.json).

| Case IDs (each EN/FI) | Reviewed result |
| --- | --- |
| concentration | 10 mg / final 2 mL → 5 mg/mL. |
| micrograms | 500 µg = 0.5 mg; final 1 mL → 0.5 mg/mL. |
| microlitres | 500 µL = 0.5 mL; 1 mg → 2 mg/mL. |
| volume | 10 mg at 5 mg/mL → final 2 mL. |
| dilution | 0.4 mL stock + ideal 1.6 mL make-up; additive-volume assumption explicit. |
| aliquots | 40 × 50 µL aliquots at 250 µg, zero remainder. |
| remainder | 3 × 300 µL aliquots; 100 µg / 0.1 mL remainder,correct displayed rounding. |
| decimal | 0.5 mg / final 0.25 mL → 2 mg/mL; FI comma decimals consistent. |
| missing-molar-mass | No inferred molarity/chemistry; actual reviewed guidance, correct locale link and site-guidance scope. |

The 16 numeric replies preserve final-volume, ideal-mass-balance, nominal-versus-measured and measurement-precision limits. EN/FI meaning is consistent and units readable. The 2 molar replies identify missing inputs and abstain appropriately; this is safe handling of an under-specified task, not a numerical molarity answer.

No approved original batch-report corpus was supplied, so this review does not validate original-report recall, product-specific measurements, preparation safety or independent research claims. The separate 2 actual UI requests and the completed 18 display-state/synthetic-fixture browser checks are outside this peer review. No additional model/browser/build activity was performed.
