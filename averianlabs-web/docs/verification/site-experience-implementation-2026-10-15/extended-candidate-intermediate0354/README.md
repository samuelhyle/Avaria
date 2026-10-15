# Intermediate extended browser verification — source 0354c14

These are preserved results from immutable candidate 4, https://6ad0f4d8d24ede22e5d83db6--averianlabs-demo.netlify.app, source `0354c14fc50a5b032c0265e790246b22d3ed0969`. They were collected 2026-10-15, 15:51:33–15:52:58 UTC, before the later plan-sharing and client SSE parser changes. They are not relabelled as results for a newer deployment.

[checks.json](checks.json) records 18 passing states, 9 per language, with zero critical/serious axe findings, page errors, document overflow or blocked writes. Two anonymous assistant requests were intercepted entirely by labelled synthetic browser display fixtures, with no provider call. The remaining application journeys cover narrow document no-match/reset, dark/reduced motion, text spacing, reflow-equivalent viewport, first-visit age-dialog keyboard containment and cookie keyboard navigation. Two extra code-focus screenshots accompany the 18 state screenshots.

Both English and Finnish code blocks were keyboard-focusable and scrolled with ArrowRight, with visible focus outlines; named table regions also accepted focus. This verifies the correction to the initial long-code accessibility finding preserved in [extended-candidate-initial](../extended-candidate-initial/checks.json).

The 720 CSS-pixel viewport models the reflow width of a 1440-pixel desktop at 200% zoom; actual native browser/OS zoom was not tested. Physical mobile keyboards, screen readers, participant usability and independent native/scientific approval remain pending. No accounts, orders, posts, payments or emails were created by this verification. The only allowed server POST was existing anonymous session identity issuance.

A subsequent candidate must receive its own fresh results in `extended-candidate/`; these files remain evidence for the deployment and source above.
