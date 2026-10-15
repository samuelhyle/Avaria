# Recurring Node TransformStream error — 15 October 2026

The final local 142-test run passed **140 tests, with 2 intentional provider skips**, but its server log still contains one `controller[kState].transformAlgorithm is not a function` event at lines 55–57 (digest `3303778231`). Server logs are **not wholly clean**. The earlier passing release7 run also logged one event. Four earlier diagnostic logs retain the same error signature; occurrence counts and source-log hashes are recorded in the [structured triage](node-transformstream-triage-20261015.json).

Local runtime is Node **22.20.0**, Next **15.5.27**, React **19.2.1**. The supplied final8 Netlify build log explicitly selected Node **22.23.3** at 16:46:18 UTC. At this pre-migration triage snapshot (source96249d6), the repository set `NODE_VERSION="22"` in `netlify.toml:27` and `engines.node>=22.0.0` in `package.json:119`; it had no `.nvmrc`. A build log does not establish the exact serving-function patch. Netlify documents that the function runtime normally follows the build major, with a separately configurable override. Its actual invocation version/override was not exposed in the evidence reviewed. [Netlify runtime configuration](https://docs.netlify.com/build/functions/configuration/?fn-language=js)

The primary upstream [Node issue62036](https://github.com/nodejs/node/issues/62036) describes this exact internal error when cancellation races a pending TransformStream write. [Official fix1647288](https://github.com/nodejs/node/commit/1647288) checks whether the transform algorithm was cleared before invoking it. A small, isolated, in-memory reproduction of that sequence on local22.20.0 produced the identical error **3/3 times**, without network requests or application execution. This establishes local runtime susceptibility; it does not establish which application request triggered the suite log.

Exact upstream source files were fetched read-only and hashed in the structured report:

| Source tag | Cleared-algorithm guard |
| --- | --- |
| [22.20.0](https://raw.githubusercontent.com/nodejs/node/v22.20.0/lib/internal/webstreams/transformstream.js) | Absent, matching the embedded local implementation |
| [22.23.3](https://raw.githubusercontent.com/nodejs/node/v22.23.3/lib/internal/webstreams/transformstream.js) | Absent, matching the hosted build version |
| [24.15.0](https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/webstreams/transformstream.js) | Present |

The official [Node24.15.0 release](https://nodejs.org/en/blog/release/v24.15.0) lists the backported fix (commit `531e62cd74`, PR62040). This is a verified containing release, not a claim that a runtime upgrade has been applied or validated here. There is no evidence that the hosted build already contains this fix; the exact serving runtime and production occurrence remain unverified.

The application event has no timestamp, request ID, route, abort marker or stack. Eight workers interleave output, so nearby completed tests—including `/en/shop`—cannot identify its request. Passing requests have no retained failure trace under the current Playwright policy. No process crash or customer-task failure is demonstrated in the final passing run, and no request-level error rate can be inferred from142 tests. The finding remains an unresolved runtime reliability issue; calling it harmless would exceed the evidence.

Next diagnostic work should capture a privacy-safe timestamp/stack and request start/abort/close/completion correlation, compare complete-body requests with deliberately aborted HTML/RSC requests in isolation, and confirm the actual deployed function version. A separate controlled runtime canary containing the upstream fix should then repeat streaming/abort and full-browser checks. No application/framework patch, error suppression, configuration change, new build, browser session or provider request was performed for this triage.

Subsequent authorized Node24 canary preparation is recorded separately in [node24-runtime-readiness-20261015.json](node24-runtime-readiness-20261015.json). This original finding and its request-correlation limits remain preserved.
