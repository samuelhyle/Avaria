# Evidence integrity

Preserve generated captures byte for byte. Do not format, normalize or reserialize raw results. Add corrections and reruns as separately labelled evidence while retaining original origins, source commits, responses and failed checkpoints.

Two assessments reference exact JSON file bytes:

- [editorial-assessment.json](editorial-assessment.json) → [full-bilingual.json](full-bilingual.json), SHA256 `e17b1558255815a1c4de92cc8742f0d45a7fab07723db001473c558f40ceb426`.
- [editorial-assessment-final.json](editorial-assessment-final.json) → [full-bilingual-final.json](full-bilingual-final.json), SHA256 `195615a2672e8e34edbb6b579aabdf1cb0df024bcab80eedeb342c5dafb216fe`.

[Client replay](client-replay/checks.json) hashes the exact captured [SSE response](final-live-ui-en.sse.txt). Metadata records hash PNG bytes; local findings hash retained trace archives. Source comparisons and import graphs hash files at the named Git commits, including source JSON files; they do not prove environment or data equality. `suiteHash` identifies the unchanged benchmark-case serialization. Benchmark cases, expectations and raw answers were not rewritten to obtain a pass.

The scoped Biome exclusion protects generated verification artifacts. Application source, translations, configuration, scripts and handwritten plans remain checked. See [FINAL_ASSESSMENT.md](FINAL_ASSESSMENT.md) for results and scope.

The later [Node24 readiness report](../local/node24-runtime-readiness-20261015.json) also references the exact bytes of its separate [100-sample runtime probe](../local/node24-cancel-write-race-100.json). Preserve that capture too. Release7 and release8 source-proof archives retain their original embedded file-name references; use the explicitly named archive pairs for historical comparisons.
