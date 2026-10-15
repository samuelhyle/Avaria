# Final extended browser verification — 15 October 2026

Immutable deployment: https://6ad0fcb3e98014388e373970--averianlabs-demo.netlify.app

Source: `e8e511e3f323fa439070864ac5873e301fb0ca8f` · Observed 16:23:44–16:24:57 UTC.

[checks.json](checks.json) records **18 passing states**, nine each in English and Finnish. There were zero critical/serious axe findings, uncaught page errors, document-level horizontal overflows, failed recorded assertions or blocked write attempts. Chromium closed after the final capture; these checks did not overlap the subsequent isolated performance run.

| State in each language | Width | Scope |
| --- | --- | --- |
| Document no-match and keyboard field order | 320 | Actual application, anonymous GET |
| Clear document filters and restore context | 320 | Actual application, ordinary GET navigation |
| Community dark theme and reduced motion | 414 | Actual application, browser preference settings |
| Selected SKU with WCAG text-spacing values | 768 | Actual application with browser-only style override |
| Home reflow equivalent | 720 | Width equivalent to a 1440 CSS-pixel desktop at 200% zoom |
| Long Markdown and multiline composer | 1024 | Clearly labelled synthetic browser response |
| Named table focus and code focus/keyboard scroll | 320 | Same synthetic response; two extra code-focus screenshots |
| Fresh age-dialog keyboard containment | 320 | No eligibility answer submitted; Tab/Escape only |
| Cookie-choice keyboard navigation | 414 | Preconfirmed-age browser fixture; no consent choice clicked |

The two assistant requests were intercepted entirely in the browser. Their display-only responses never reached the application server or an AI provider. They test headings, lists, links, long text, table/code presentation and composer behavior; they do not establish retrieval, model or scientific-answer quality. Arbitrary remote images remained deliberate links and unsafe JavaScript URLs were absent.

The code regions in both languages accepted focus, showed an outline and scrolled horizontally with ArrowRight. The named table regions accepted keyboard focus. The document clear action reset both language contexts without stale no-match text. Representative saved screenshots were visually inspected for readable Finnish text, selected-SKU agreement, dark-theme layout and visible code focus.

No accounts, orders, posts, payments or emails were created. Existing anonymous session identity issuance was the only allowed server POST; all customer/provider mutations were blocked by the browser guard, and none was attempted. No consent or eligibility action was submitted.

The 720-pixel reflow check is viewport emulation, **not native browser or operating-system zoom testing**. Physical mobile keyboards, screen readers, independent native/scientific approval and participant usability remain pending in the [researcher review protocol](../../../RESEARCHER_TASK_REVIEW_PROTOCOL_2026-10-15.md). Passing these states covers the recorded conditions; it does not establish a framework-wide hydration fix or wholly clean server logs. Local no-JavaScript, hydration regression and server-log findings are recorded separately in the [implementation ledger](../../../SITE_EXPERIENCE_IMPLEMENTATION_2026-10-15.md).

Earlier observations remain separate and are not relabelled as this build: [initial failed long-code accessibility states](../extended-candidate-initial/checks.json) and [passing source0354 intermediate states](../extended-candidate-intermediate0354/README.md).
