import { claimNode24Request } from '/tmp/averian-node24-eval-budget-20261015.mjs'

// The official evaluator remains unchanged; this adds only the shared quota and
// anonymous-request assertions before forwarding its original fetch arguments.
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.pathname === '/api/ai/chat') {
    if (url.origin !== new URL(process.env.BASE_URL).origin) throw Error('Unexpected model origin')
    const headers = new Headers(options?.headers)
    if (headers.has('cookie') || headers.has('authorization')) throw Error('Evaluation cannot send authentication or cookies')
    if (options?.method !== 'POST' || typeof options.body !== 'string') throw Error('Expected the official JSON POST')
    await claimNode24Request('api', url.origin, process.env.EVALUATED_SOURCE, JSON.parse(options.body))
  }
  return originalFetch(input, options)
}
