# Node24 critical evaluation — completed

Final candidate: https://6ad10a0d17b4322a59f0afd8--averianlabs-demo.netlify.app · Source `4e4a948fb1cf722d11bac09340d140f174b54024`.

**18/18 official API cases passed**, followed by **2/2 real composer calculations**, with exactly 20 new anonymous chat API request starts and no retries. [Run metadata and artifact hashes](run-metadata.json) distinguish actual managed serving Node **v24.21.0** from pinned build/runner Node **v24.22.0**. The [fresh private startup proof](../../local/final-serving-runtime.json) belongs to this exact deployment/source; build configuration was not substituted for serving-version proof.

| Evidence | Result / scope |
| --- | --- |
| [Official API results](api-cases.json) |16 unchanged numerical cases and 2 English/Finnish missing-molar-prerequisite guidance cases; all completed their runtime/numerical/guidance contracts with no invalid successful calculation. |
| [Real UI responses](final-ui/api-cases.json) and [browser checks](final-ui/final-live-ui.json) |English 1440 px desktop and Finnish 390 px mobile composer; actual inputs 10 mg/final 2 mL, result 5 mg/mL, formula, localised input labels and structured calculation card. No page error, horizontal overflow or axe violation. |
| [Exact English SSE](final-ui/final-live-ui-en.sse.txt) / [exact Finnish SSE](final-ui/final-live-ui-fi.sse.txt) |Actual same-origin API responses saved byte for byte. An anonymous Node fetch forwarded each real typed request once, then the complete SSE was buffered and returned unchanged to the browser. This tests response and rendering, not incremental network delivery. |
| [Request ledger](request-timing-ledger.json) |122 earlier starts retained solely as a quota seed; 20 new starts are separately identified as 18 API and 2 UI. No Cookie/Authorization header, persistence, private/memory retrieval or write-capable tools. |
| [Selection manifest](selection.json) |The unchanged 9 official IDs in both languages; critical suite hash `625487a7fc40847437fe5f342d2aac7571ad9a98cccb37877eb39c480b7266c3`. The original pre-execution planning status/history remains in that manifest. |
| [Harness source](harness/) |Exact copied wrapper, budget guard, actual-composer harness and command used. The committed official evaluator itself remains unchanged. |

All 20 requests used `readOnly: true`, `noPersist: true`, and `noRetrieve: true`. The evaluated API received content-type only, with no Cookie or Authorization header. Browser eligibility/consent fixtures were not forwarded to it. The UI pair used actual API responses, not synthetic answers; no original product or batch-report citation was requested or invented for these input-based calculations.

The shared guard reserved a strict 18 API + 2 UI budget, with no automatic retry. UI Chromium closed after the second response and checks. **No further model calls are permitted before 17:33:34 UTC on 15 October 2026**, at least ten minutes after this run closed. Subsequent extended browser display fixtures are intercepted entirely and do not consume provider requests.

The earlier [60-case source0354/Node22 evaluation](../full-bilingual-final.json) and [two real e8 UI cases](../final-ui/final-live-ui.json) remain separately attributed and unchanged. This subset was initially planned for candidate9 but made no calls there; it ran only after candidate10's browser acceptance and fresh runtime proof. It is not a new 60-case evaluation.

A [separate technical/EN–FI editorial peer review](technical-editorial-peer-review.md) read all 18 actual answers and complete tool records and found no material issue in this case set. Runtime/numerical checks and this Codex peer review do not constitute independent native-language or scientific approval. Retrieval quality, original-report fidelity, universal model quality and all future server-stream behavior are outside this subset. Physical device, screen-reader and participant acceptance remains separate in the [researcher protocol](../../../../RESEARCHER_TASK_REVIEW_PROTOCOL_2026-10-15.md).
