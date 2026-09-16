# Averia — chat system

The Averia assistant ("Averia") is a streaming chat widget that floats on
every page, persists conversations when consented, and can take actions
(add-to-cart, save preferences, escalate to support) via a server-side tool
registry.

## Architecture at a glance

```
[Browser]
  ChatBubble → ChatWidget → ChatDrawer ─▶ ChatInput / MessageList
                    │                │
                    ▼                ▼
              useAveriaChat      components/ai/chat/*
                    │
                    ▼
        POST /api/ai/chat  (SSE stream)
                    │
   ┌────────────────┼─────────────────┐
   ▼                ▼                 ▼
 input guardrail  rate-limit     runAgent (loop.ts)
                                    │
                  ┌─────────────────┼──────────────┐
                  ▼                 ▼              ▼
        retrieveContext      streamMiniMax   tool registry
        (BM25 + pgvector)    (OpenAI-compat)
                                    │
                                    ▼
                       SSE wire events:
        { text, thinking, tool-call, tool-result,
          action, citations, conversation, done, error }
```

## File map

### Hooks (`lib/ai/hooks/`)
| File | Purpose |
|------|---------|
| `use-averia-chat.ts` | Client state machine. Owns messages, conversation id, anon id, consent. Owns the SSE consumer. |
| `use-page-context.ts` | Derives the `ChatContext` from the current pathname. |
| `lib/hooks/use-auto-scroll.ts` | Auto-scroll a list to the bottom, with "user scrolled up" detection. |

### Streaming (`lib/ai/streaming/`)
| File | Purpose |
|------|---------|
| `sse.ts` | `parseSseStream(stream)` — turns a `ReadableStream<Uint8Array>` into `AsyncGenerator<AgentEvent>`. Pure, unit-tested. |
| `tool-call-assembler.ts` | `applyToolCallDelta` / `finalizeAssembler` — routes streamed tool-call deltas by `index`, not by "most recent id". Critical for parallel tool calls. |
| `markdown-split.ts` | `splitMarkdownForStreaming` — splits in-flight content into a `committed` prefix (rendered through `react-markdown`) and a `trailing` tail (rendered as plain text). Prevents the streaming "snap". |

### Markdown pre-processing (`lib/ai/`)
| File | Purpose |
|------|---------|
| `citations.ts` | `prepareAssistantContent` — strips `<think>…</think>`, `[cite:…]` (incl. truncated), rewrites `[N]` markers into markdown links. |

### UI (`components/ai/`)
| File | Purpose |
|------|---------|
| `ChatBubble.tsx` | Floating launcher button. |
| `ChatWidget.tsx` | Top-level wrapper, owns open/close state and consent. |
| `chat/LazyChatWidget.tsx` | Defers chat bundle load via `requestIdleCallback`. |
| `ChatDrawer.tsx` | Modal/side-panel with header, message list, error banner, input. |
| `ChatInput.tsx` | Auto-growing textarea with IME-safe Enter, char counter, stop button. |
| `QuickActions.tsx` | "Recommend / Compare / Track / Reconstitute" chips. |
| `ConsentBanner.tsx` | GDPR opt-in banner. |
| `AssistantCanvas.tsx` | Full-page canvas at `/assistant`. |
| `icons/HelixGlyph.tsx` | Brand SVG glyph used as assistant avatar. |
| `MessageList.tsx` | Barrel re-export — concrete pieces live in `chat/`. |
| `chat/types.ts` | `ChatMessage`, `ToolTrace`, `MessageProps`, `MessageListProps`. |
| `chat/MessageList.tsx` | Main scrollable list with auto-scroll + `aria-busy`. |
| `chat/Message.tsx` | User vs assistant bubble routing. |
| `chat/AssistantMarkdown.tsx` | Stable streaming markdown renderer (uses `splitMarkdownForStreaming`). |
| `chat/ActionCard.tsx` | "Add to cart" and "Remember this" cards. |
| `chat/CitationChips.tsx` | `[N]` citation chips below the bubble. |
| `chat/FeedbackBar.tsx` | Thumbs up/down. |
| `chat/InlineProducts.tsx` | Product cards extracted from completed tool calls. |
| `chat/ToolTraceList.tsx` | Pill chips showing tool invocations. |

### Agent backend (`lib/ai/agent/`)
| File | Purpose |
|------|---------|
| `loop.ts` | Multi-step tool-use reasoning. Streams events via `AgentSink`. |

### Provider (`lib/ai/providers/`)
| File | Purpose |
|------|---------|
| `minimax.ts` | Direct OpenAI-compatible fetch to MiniMax with retries. |
| `local-embeddings.ts` | ONNX-based fallback embedding model. |

### API routes (`app/api/ai/`)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai/chat` | Streaming chat. Sets `averia_anon` cookie if missing. |
| `GET/PUT/DELETE /api/ai/memory` | Durable user preferences. |
| `POST /api/ai/consent` | Set `averia_consent`. |
| `POST /api/ai/feedback` | Thumbs up/down. |
| `POST /api/ai/identity` | Legacy: mints the signed anon cookie directly. |
| `GET/POST /api/ai/conversations` | Admin / sidebar listings. |

## Event types

All SSE frames are `data: <json>\n\n`. The discriminated union lives in
`lib/ai/types/events.ts` as `AgentEvent`:

- `text` — streaming assistant text delta.
- `thinking` — emitted before the first delta of each step. Currently a no-op on the client (`isLoading` drives the spinner) but kept on the wire for parity with server logs.
- `citations` — retrieved context citations (one per turn).
- `tool-call` — a tool invocation starts. The client adds a chip to the trace.
- `tool-result` — tool finished; chip updates with result.
- `action` — the agent proposes a side-effect (`add_to_cart`, `remember`, `escalate`). UI renders a confirmation card.
- `conversation` — server assigns a conversation id (only on first turn).
- `done` — final frame for the turn. May carry a `messageId` for DB id reconciliation.
- `error` — terminal error; throws to bubble up to the catch block.

## Error model

`useAveriaChat` throws a synthetic `Error` per failure mode. The `name` field
discriminates:

- `rate_limited` → `429` → user-facing "slow down".
- `provider_unavailable` → `503` → "Averia is offline".
- `invalid_request` → `400` → "couldn't send that message".
- `server_error` → `5xx` → "hit a problem on our side".
- other → generic.

`ChatDrawer` maps `err.name` → translation key.

## Testing

- Unit tests for every pure helper in `lib/ai/streaming/` and
  `lib/ai/citations.ts` (vitest).
- E2E for the widget shell, message stream, rate-limit, prompt injection,
  and quick-actions (Playwright, `tests/chat.spec.ts`).
- i18n parity check: `pnpm test:i18n` exits non-zero if any locale is
  missing keys present in `en.json` (or has extras).
