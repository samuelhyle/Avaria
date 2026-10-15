import type { AgentEvent } from "@/lib/ai/types/events"

/** Decode complete SSE frames independently of how a proxy groups network chunks. */
export function createAgentEventParser() {
  let buffer = ""
  return {
    push(chunk: string): AgentEvent[] {
      buffer += chunk
      const events: AgentEvent[] = []
      let boundary = /\r?\n\r?\n/.exec(buffer)
      while (boundary) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        // Advance even for comments, empty data and malformed JSON. Heartbeats
        // may arrive alone or immediately before a real tool/text/done event.
        boundary = /\r?\n\r?\n/.exec(buffer)
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n")
        if (!data.trim()) continue
        try {
          events.push(JSON.parse(data) as AgentEvent)
        } catch {
          // A malformed frame must not consume any part of the next frame.
        }
      }
      return events
    },
  }
}
