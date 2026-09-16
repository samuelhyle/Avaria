# Agent Chat System — Review & Improvement Plan

**Scope:** `/Users/samuelhyle/AverianLabs/averianlabs-web/components/ai/`, `/lib/ai/`, `/app/api/ai/`, `/styles/globals.css`, `/messages/*.json`.
**Date:** 2026-09-16
**Status:** Audit complete. Plan ready for execution.

---

## TL;DR — what is broken

1. **Markdown is unstyled.** `@tailwindcss/typography` is missing from `package.json` and not loaded in `globals.css`, so every `prose` class (used heavily in the assistant bubble, legal pages, blog, glossary) is inert. Assistant replies look like a wall of preformatted text.
2. **The message input does not auto-grow.** `rows={1}` + `max-h-32` with no JS resize — long messages get an internal scrollbar in a 40 px box and the unused `ref` proves it was never wired up.
3. **Messages get cut off / overflow horizontally.** No `overflow-wrap-anywhere` on the assistant bubble and no `overflow-x-auto` on tables / code blocks / chips. Any long URL, SKU, or 4-column comparison table breaks the drawer width.
4. **Markdown streams with visible flicker.** `ReactMarkdown` is rebuilt on every token, so partial tables / code fences snap in mid-stream.
5. **Auto-scroll misses tool traces & action cards.** Scroll effect only depends on `content`, not on `toolTrace` / `proposedActions` / `citations`, so chips and cards can appear off-screen.
6. **Focus management.** `ChatDrawer` does not pass `initialFocusRef` to `useOverlay` (other dialogs do), so the textarea is never auto-focused when the drawer opens.
7. **i18n bug.** Swedish error title `"Kunde inte skickä meddelandet"` contains a typo (`skickä` → `skicka`).
8. **Parallel-tool-call mis-grouping** in the agent loop (`lib/ai/agent/loop.ts:202–222`) — args from a second parallel tool call can be appended to the first call, producing malformed JSON and silently running with `{}`.
9. **IME Enter submits mid-composition** — typing Japanese / Chinese and pressing Enter to commit a candidate sends the half-typed message.
10. **Citation regex gaps** — `[123]` (3-digit) leaks through; truncated `[cite:som` leaks through; `<think>` with no close tag silently wipes the rest of the answer.

Everything else is small (perf churn, scroll smoothness, missing unit tests, file-size, translation ordering).

---

## 1. Audit Findings (with evidence)

### 1.1 — Critical: typography plugin missing

- `package.json` dev-deps include `@tailwindcss/postcss`, `tailwindcss-animate`, but **no `@tailwindcss/typography`**.
- `styles/globals.css` only declares `@plugin "tailwindcss-animate";`.
- `components/ai/MessageList.tsx:238` (and similar in legal / blog / glossary pages) uses:
  ```
  prose prose-sm prose-neutral max-w-none … prose-p:my-1.5 prose-pre:my-2 prose-table:my-2 prose-th:text-left …
  ```
  Without the plugin these are zero-effect. Result: assistant replies render with **no paragraph spacing, no list bullets, no table grid, no code styling**.

### 1.2 — Critical: textarea does not auto-resize

`components/ai/ChatInput.tsx:54–69`:

```tsx
<textarea
  ref={ref}                       // ref declared, never used
  rows={1}
  maxLength={maxLength}           // 2000
  className="… min-h-[40px] max-h-32 …"
/>
```

- `ref` is dead code.
- No `useLayoutEffect` to set `el.style.height = "auto"` then `el.scrollHeight`.
- Long pastes are silently capped by `maxLength=2000` (browser truncates without warning) **and** the server Zod schema caps at `8000` (`/app/api/ai/chat/route.ts:53`).

### 1.3 — Critical: assistant bubble overflows / messages cut off

`components/ai/MessageList.tsx:228–247`:

```tsx
<div className="flex max-w-[85%] flex-col gap-2">
  …
  <div className={cn("rounded-2xl rounded-tl-md border border-line/60 bg-surface …")}>
    <div className="prose prose-sm … max-w-none …">   {/* ← no break-words */}
      <ReactMarkdown …>{renderedContent}</ReactMarkdown>
      …
    </div>
  </div>
</div>
```

- No `break-words` / `overflow-wrap-anywhere` / `word-break-break-word` on the prose container.
- No `prose-pre:overflow-x-auto`, no `prose-table:overflow-x-auto`.
- Citation chips (`MessageList.tsx:473–494`) use `max-w-[180px] truncate` but no wrapping fallback; long single-word titles are cut.
- `CitationChips` uses `href={c.url ?? "#"}` → empty URL scrolls the page to top. Should `preventDefault` or render a `<button>`.

### 1.4 — High: markdown streaming flicker

Every streamed token triggers a `ReactMarkdown` rebuild. With GFM tables / fenced code, partial content causes the DOM tree to swap from `<p>` → `<table>` / `<pre>` mid-message, producing a visible "snap".

- `use-averia-chat.ts:230–234` writes `m.content + delta` on every text event.
- `MessageList.tsx:515` reads `lastMessageContent` for scroll-trigger.
- `MessageList.tsx:239` renders `<ReactMarkdown>` synchronously.

Fix path: keep `ReactMarkdown` output stable by either (a) parsing the markdown only at idle, or (b) splitting into a "committed" portion (closed fences) and an "in-flight" trailing text segment.

### 1.5 — High: scroll misses tool trace & action card additions

`MessageList.tsx:513–522`:

```tsx
const lastMessageContent = messages.at(-1)?.content ?? ""
useEffect(() => {
  …
  el.scrollTo({ top: el.scrollHeight, behavior: messageCount <= 1 ? "auto" : "smooth" })
}, [messageCount, lastMessageContent, isStreaming])
```

When a `tool-call` / `tool-result` / `citations` / `action` event arrives (from `use-averia-chat.ts:242–258`), `content` is unchanged so the effect does not fire. The user sees new chips appear below the fold and has to scroll manually.

Fix: derive a "last message changed" signal that also includes tool trace length, citations length, and proposed-actions length.

### 1.6 — High: no autofocus on chat open

`ChatDrawer.tsx:49`:

```tsx
const containerRef = useOverlay<HTMLElement>({ open, onClose })
```

Compare to `components/home/NewsletterModal.tsx:33` which does pass `initialFocusRef`. The chat drawer focuses the first tabbable element (Clear / Close button), not the textarea. Power users must click before they can type.

### 1.7 — High: parallel-tool-call mis-grouping

`lib/ai/agent/loop.ts:202–222`:

```ts
for (const tc of d.tool_calls) {
  if (tc.id) { … push id … }
  else {
    const last = pendingOrder[pendingOrder.length - 1]
    if (last) { prev.argsJson += tc.function?.arguments ?? "" }
  }
}
```

When the model emits two parallel tool calls, the API can interleave id-bearing deltas and arg-only deltas. The code assumes "no id" = "append to the most recent call," which is wrong when the second call's id arrives after the first call's args.

Result: `argsJson` is concatenated across calls → `safeParse` fails → tool runs with `{}` (or whatever the default is).

Fix: when a delta has no `id`, route by index (`tc.index`) if provided; otherwise buffer by the last-seen id from this same `chunk`.

### 1.8 — Medium: IME Enter submits mid-composition

`ChatInput.tsx:32–39`:

```tsx
if (e.key === "Enter" && !e.shiftKey) { … onSubmit(value) }
```

Typing Japanese / Chinese / Korean and pressing Enter to commit a candidate fires `onSubmit` with the half-typed string.

Fix: also check `e.nativeEvent.isComposing` (and `keyCode === 229` for older browsers).

### 1.9 — Medium: citation / `<think>` regex gaps

`MessageList.tsx:184–194`:

```ts
let out = content.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
out = out.replace(/\[cite:[^\]]*\]/g, "")          // only if `]` present
if (citations?.length) {
  out = out.replace(/\[(\d{1,2})\](?!\()/g, …)      // 1-2 digits only
}
```

- `[cite:som` (truncated mid-stream) is left visible.
- `[123]` leaks through.
- An unclosed `<think>…` swallows everything after it with no placeholder → the user sees the rest of the answer vanish with no explanation.

### 1.10 — Medium: identity cookie race on first message

`lib/ai/memory/consent-client.ts:39` fires `void provisionAnonIdentity(id)` but doesn't wait. If the user's first `POST /api/ai/chat` happens before the identity POST resolves, the server has no `averia_anon` cookie → the conversation is created with no owner and cannot be reconciled on the next turn.

Mitigation: `await provisionAnonIdentity()` inside `submit()` (with timeout) before posting the chat request, **or** have `route.ts` mint the cookie server-side if missing (one-time HMAC sign) instead of relying on a client round-trip.

### 1.11 — Low / hygiene

| # | Issue | Where |
|---|-------|-------|
| L1 | `submit` dep array includes `messages` → identity churn | `use-averia-chat.ts:281` |
| L2 | `retry` dep array includes `submit` → identity churn | `use-averia-chat.ts:310` |
| L3 | `enrichedMessages` recomputes on every render | `use-averia-chat.ts:331–335` |
| L4 | `MessageList` 553 LOC mixes rendering, markdown preprocessor, product extraction, action cards, citation chips, tool trace, feedback bar | `MessageList.tsx` |
| L5 | No unit tests for SSE parser / `linkCitations` / `placeholderForError` / `classifyHttpError` | `tests/` |
| L6 | Swedish typo `"skickä"` (should be `"skicka"`) | `messages/sv.json:472` |
| L7 | `fi.json` error-key ordering differs from `en.json` | `messages/fi.json:468–471` |
| L8 | `ChatDrawer` desktop has no scrim (intentional, but undocumented) | `ChatDrawer.tsx:62–67` |
| L9 | `ToolTraceList` lacks `aria-live` for screen readers | `MessageList.tsx:319–346` |
| L10 | Hard cap mismatch: client `2000` vs. server `8000` | `ChatInput.tsx:27`, `route.ts:53` |
| L11 | No tests for empty / long / pasted input | `tests/chat.spec.ts` |
| L12 | `useOverlay` doesn't expose `aria-describedby` for the drawer | `ChatDrawer.tsx:69–82` |

---

## 2. Plan — execution order

The work is grouped into 4 phases. Each phase is shippable independently; phases 1–2 unblock all user-visible bugs, phases 3–4 are quality / structure.

### Phase 1 — "It looks broken" (must ship first)

> Removes the worst user-visible defects with minimal risk.

| # | Task | Files | Est. |
|---|------|-------|------|
| 1.1 | Add `@tailwindcss/typography` and register it in `globals.css` (`@plugin "@tailwindcss/typography";`) | `package.json`, `styles/globals.css` | XS |
| 1.2 | Auto-grow the textarea on input (cap at `max-h-48`, fall back to internal scroll after cap). Wire `ref`. | `components/ai/ChatInput.tsx` | S |
| 1.3 | Add `break-words` (Tailwind `break-words`) to the prose wrapper, `overflow-x-auto` to `prose-pre` and `prose-table`, and `prose-code:break-all`. Add `min-w-0` on the flex column for nested overflow. | `components/ai/MessageList.tsx:228–248` | XS |
| 1.4 | Replace `<a href="#">` in `CitationChips` with `<button>` when `c.url` is null; truncate to 2 lines (`line-clamp-2`) instead of single-line `truncate`. | `components/ai/MessageList.tsx:473–494` | XS |
| 1.5 | Pass `initialFocusRef` to `useOverlay` in `ChatDrawer` (focus the textarea when opened). | `components/ai/ChatDrawer.tsx`, `lib/hooks/use-overlay.ts` (small surface tweak) | XS |
| 1.6 | IME-safe Enter: guard with `e.nativeEvent.isComposing`. | `components/ai/ChatInput.tsx` | XS |
| 1.7 | Fix Swedish typo `"skickä"` → `"skicka"`. | `messages/sv.json:472` | XS |
| 1.8 | Align client `maxLength=2000` with the server `8000` cap and surface a soft counter (`{n} / 8000`) when over 1500. | `ChatInput.tsx`, server zod | S |

**Verification:** `pnpm typecheck`, `pnpm test`, manual smoke in `/assistant` page with a long input and a table-heavy prompt.

### Phase 2 — Streaming stability & scroll correctness

> Eliminates the "messages cut off mid-stream" / "tools off-screen" class of complaints.

| # | Task | Files | Est. |
|---|------|-------|------|
| 2.1 | Reduce markdown flicker: split the assistant content into `(committed)` (closed fences + table rows + paragraphs) and `(trailing)`. Render the committed slice through `ReactMarkdown`, the trailing slice as plain `<p class="whitespace-pre-wrap">`. | new `lib/ai/streaming/markdown-split.ts`, `components/ai/MarkdownContent.tsx` | M |
| 2.2 | Add scroll-resume signature to `MessageList` that hashes `(content length, toolTrace length, citations length, proposedActions length)`; trigger scroll when the hash changes. | `components/ai/MessageList.tsx:513–522` | XS |
| 2.3 | Throttle scroll: collapse multiple `scrollTo` calls within a frame to one `requestAnimationFrame`. | `MessageList.tsx` | XS |
| 2.4 | Disable `smooth` during streaming and re-enable for the final `done` event. | `MessageList.tsx` | XS |
| 2.5 | Add `aria-live="polite"` to the tool trace list; add `aria-describedby` on `ChatDrawer` for screen-reader context. | `MessageList.tsx`, `ChatDrawer.tsx` | XS |

**Verification:** Add Playwright assertion that the last message is visible after submitting a long prompt with tool calls (`tests/chat.spec.ts`).

### Phase 3 — Backend correctness

> Fixes silent data corruption in the agent loop and the first-message race.

| # | Task | Files | Est. |
|---|------|-------|------|
| 3.1 | Route tool-call arg deltas by `tc.index` (or chunk-relative id) instead of "most recent id," to support parallel tool calls. Add a regression test using a captured SSE fixture. | `lib/ai/agent/loop.ts:202–222`, new `tests/lib/ai/agent/loop.test.ts` | M |
| 3.2 | Server-side mint the `averia_anon` cookie inside `chat/route.ts` if missing (HMAC sign with existing secret). Remove the client-side race entirely. | `app/api/ai/chat/route.ts`, `lib/ai/memory/anon.ts`, `app/api/ai/identity/route.ts` | S |
| 3.3 | Tighten `linkCitations` regexes: support 3+ digit citations, treat unterminated `[cite:` as a no-op (or strip up to EOL), and replace swallowed `<think>` tail with a tiny ellipsis to signal truncation. | `components/ai/MessageList.tsx:184–194`, extract to `lib/ai/citations.ts` with unit tests | S |
| 3.4 | Replace the `submit` / `retry` useCallback dep arrays with refs to `cart` / `context` / `conversationId` so messages changes don't churn the callback identity. | `use-averia-chat.ts:281,310` | XS |
| 3.5 | Memoize `enrichedMessages` (`useMemo`) keyed on `messages` + a version counter. | `use-averia-chat.ts:331–335` | XS |

**Verification:** New vitest unit suite for `loop.ts` (capture-replay SSE), `citations.ts`, and `classifyHttpError` / `placeholderForError`. Aim for >80 % coverage on `use-averia-chat.ts` helpers.

### Phase 4 — Structure & polish

> Splits the 553-line `MessageList` into testable pieces, improves i18n parity, and adds an E2E suite for the new behaviors.

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.1 | Split `MessageList.tsx` into `MarkdownContent.tsx`, `CitationChips.tsx`, `InlineProducts.tsx`, `ActionCard.tsx`, `FeedbackBar.tsx`, `ToolTraceList.tsx`, `EmptyState.tsx`, `use-auto-scroll.ts`. Each gets its own unit test. | `components/ai/MessageList.tsx`, new files in `components/ai/chat/` | M |
| 4.2 | Extract the SSE parser from `use-averia-chat.ts` into `lib/ai/streaming/sse.ts` with vitest coverage. The hook becomes a thin orchestrator. | `lib/ai/hooks/use-averia-chat.ts`, new `lib/ai/streaming/sse.ts` | M |
| 4.3 | i18n parity: align `fi.json` error-key ordering to `en.json`. Add a script `scripts/check-i18n-parity.mjs` to CI that diffs key sets across all locale files. | `messages/fi.json`, new script, `package.json` test script | S |
| 4.4 | Add a "Stop generating" affordance is already present; expand to a "Cancel + clear partial" UX. | `ChatDrawer.tsx`, `use-averia-chat.ts` | S |
| 4.5 | Add Playwright tests for: (a) long input pastes don't truncate silently, (b) tables don't overflow the drawer, (c) tool chips appear inside the viewport, (d) IME-safe submit, (e) retry restores last user message. | `tests/chat.spec.ts` | M |
| 4.6 | Document the chat architecture in `components/ai/README.md` (state machine, event types, error model). | new `components/ai/README.md` | XS |

---

## 3. Risk & rollback

- **Phase 1 typography plugin** — affects every page using `prose`. Run `pnpm build` and a visual smoke (home, legal pages, blog, glossary, assistant) before merging.
- **Phase 2 markdown split** — the new `markdown-split.ts` must be correct for partial fences / partial tables; rely on vitest fixtures before enabling in production. Gate behind a feature flag if necessary (`process.env.NEXT_PUBLIC_CHAT_STREAM_V2`).
- **Phase 3 identity cookie** — the server mint must reuse the existing `anon.ts` HMAC key. Don't change the cookie name or format; only the assignment location moves.
- **Phase 4 splits** — pure refactor; no behavior change. Ship behind a single PR with the new tests included.

## 4. Out of scope (later)

- Replacing the home-grown SSE parser with the Vercel AI SDK (would force a re-architecture of `loop.ts`).
- Voice input / output.
- Conversation history sidebar UI (the API already exposes it).
- Multi-modal (image upload) — would need a separate API surface.
- Persisting feedback beyond a single `aiMessage` row (analytics).
- Model fallback chain (currently single provider).

---

## 5. Success criteria

After Phase 1:
- Assistant markdown renders with paragraph spacing, list bullets, and table grids.
- The textarea grows up to ~12 rows; long pastes show a counter.
- Long URLs, SKUs, and comparison tables wrap inside the drawer.
- Typing IME candidates no longer sends.
- The drawer focuses the textarea on open.
- Swedish error title reads `"Kunde inte skicka meddelandet"`.

After Phase 2:
- Streaming tables / code fences don't snap.
- Tool chips and action cards always appear inside the viewport.
- Scroll is smooth when the user is idle, instant while streaming.

After Phase 3:
- Two parallel tool calls in one turn both execute correctly (regression test passes).
- The first chat message after a fresh visit is correctly attributed.
- `submit` / `retry` / `enrichedMessages` no longer cause render churn.

After Phase 4:
- `MessageList.tsx` is < 150 LOC.
- SSE parser and citations live in `lib/ai/streaming/` with ≥ 80 % unit-test coverage.
- All five new Playwright scenarios are green.
- i18n parity script runs in CI.
