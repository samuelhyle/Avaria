/**
 * Tool-call delta assembly for streaming chat completions.
 *
 * OpenAI-compatible providers (including MiniMax) emit parallel tool calls as
 * a stream of small deltas. Each delta carries an `index` that identifies
 * which parallel call it belongs to, plus optional `id` / `function.name` /
 * `function.arguments`. The `id` and `name` typically arrive on the first
 * delta for each call; subsequent deltas carry only the next fragment of
 * `arguments`.
 *
 * The naive "append to the most recent call" heuristic is wrong: when the
 * model emits two parallel tool calls, args from the second call can land on
 * top of the first call, producing malformed JSON and silently running the
 * tool with `{}`.
 *
 * This helper routes deltas by `index` and yields a list of fully-assembled
 * tool calls in the order they were first seen.
 */

export interface ToolCallDelta {
  index: number
  id?: string
  type?: "function"
  function?: { name?: string; arguments?: string }
}

export interface AssembledToolCall {
  id: string
  name: string
  argsJson: string
}

export interface AssemblerState {
  toolCalls: Map<string, { name: string; argsJson: string }>
  pendingOrder: string[]
  indexToKey: Map<number, string>
}

export function createAssembler(): AssemblerState {
  return {
    toolCalls: new Map(),
    pendingOrder: [],
    indexToKey: new Map(),
  }
}

export function applyToolCallDelta(state: AssemblerState, delta: ToolCallDelta): void {
  let key = state.indexToKey.get(delta.index)
  if (!key) {
    key = delta.id ?? `__idx_${delta.index}`
    state.indexToKey.set(delta.index, key)
    state.toolCalls.set(key, {
      name: delta.function?.name ?? "",
      argsJson: delta.function?.arguments ?? "",
    })
    if (!state.pendingOrder.includes(key)) state.pendingOrder.push(key)
    return
  }

  const prev = state.toolCalls.get(key)
  if (!prev) return
  if (delta.function?.name) prev.name = delta.function.name
  if (delta.function?.arguments) prev.argsJson += delta.function.arguments

  // Upstream `id` may arrive after the first delta — upgrade the key so
  // downstream consumers see the real id.
  if (delta.id && key !== delta.id) {
    state.toolCalls.delete(key)
    state.indexToKey.set(delta.index, delta.id)
    state.toolCalls.set(delta.id, { name: prev.name, argsJson: prev.argsJson })
    const orderIdx = state.pendingOrder.indexOf(key)
    if (orderIdx !== -1) state.pendingOrder[orderIdx] = delta.id
  }
}

export function finalizeAssembler(state: AssemblerState): AssembledToolCall[] {
  return state.pendingOrder
    .map((id) => {
      const tc = state.toolCalls.get(id)
      if (!tc) return null
      return { id, name: tc.name, argsJson: tc.argsJson }
    })
    .filter((tc): tc is AssembledToolCall => Boolean(tc))
}
