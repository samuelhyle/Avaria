import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

/** Shared strict budget for the separately authorised 18 API + 2 real UI calls. */
export async function claimNode24Request(phase, origin, source, body) {
  if (process.env.AI_EVAL_READY_NODE24 !== '1') throw Error('Confirmed ready Node24 runtime required')
  if (!/^https:\/\/[a-f0-9]{24}--averianlabs-demo\.netlify\.app$/.test(origin)) throw Error('Immutable review target required')
  if (!/^[a-f0-9]{40}$/.test(source ?? '')) throw Error('Exact evaluated source required')
  if (!['api', 'ui'].includes(phase)) throw Error('Unknown evaluation phase')
  if (body.readOnly !== true || body.noPersist !== true || body.noRetrieve !== true) throw Error('Read-only anonymous evaluation flags required')
  const path = process.env.AI_EVAL_PACING_STATE
  if (!path) throw Error('Separate Node24 request ledger required')
  const state = JSON.parse(await readFile(path, 'utf8'))
  if (state.origin && state.origin !== origin) throw Error('Do not mix deployment origins in this run')
  if (state.sourceCommit && state.sourceCommit !== source) throw Error('Do not mix evaluated sources')
  const started = Date.now()
  if (state.cooldownUntil && started < Date.parse(state.cooldownUntil)) throw Error('Post20-call ten-minute cooldown remains active')
  const recent = state.requestTimes.filter(time => Number.isFinite(time) && time > started - 600000)
  if (recent.length >= 20) throw Error('Rolling20-request budget unavailable; no automatic retry')
  const phaseCount = state.requests.filter(request => request.phase === phase).length
  if (phaseCount >= (phase === 'api' ? 18 : 2) || state.requests.length >= 20) throw Error('Authorised18API+2UI evaluation budget exhausted')
  if (phase === 'ui' && state.requests.filter(request => request.phase === 'api').length !== 18) throw Error('Complete exactly18 API requests before the UI pair')
  state.origin = origin
  state.sourceCommit = source
  state.confirmedBackendRuntime = 'Node24; root supplies the exact private startup/build proof separately'
  state.runnerNodeVersion = process.version
  state.runtimeProofPath = process.env.AI_EVAL_RUNTIME_PROOF ?? null
  state.requestTimes.push(started)
  state.requests.push({ phase, locale: body.locale, startedAt: new Date(started).toISOString(), prompt: body.messages.at(-1)?.content, bodySha256: createHash('sha256').update(JSON.stringify(body)).digest('hex'), flags: { readOnly: true, noPersist: true, noRetrieve: true }, cookieHeaderSent: false })
  if (state.requests.length === 20) state.cooldownUntil = new Date(started + 602000).toISOString()
  await writeFile(path, JSON.stringify(state, null, 2) + '\n')
  return started
}
