import { createServer } from "node:http"
const wallet = "MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6"
const account = "BGocb4GEpbTFm8UFV2VsDSaBXHELPfAXrvd4vtt8QWrA"
const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const program = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const signature =
  "4ReKprwf3WdLHRrzp4ctPWNBsQDPL3VZz3zMmoZfcGJMJCHh5Vq937mPdyxhCbw54wNnA6hZ7KfNpQdpt13yY7A9"
let state = { mode: "none", amount: "0", messages: [], emails: [], rpcCalls: [] }
const server = createServer(async (req, res) => {
  try {
    let raw = ""
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : {}
    let result
    if (req.url === "/control") {
      state = { ...state, ...body }
      result = { ok: true }
    } else if (req.url === "/state") result = state
    else if (req.url.startsWith("/mock/rates.e2e.invalid")) result = { "usd-coin": { eur: 0.9 } }
    else if (req.url.startsWith("/mock/api.telegram.org")) {
      const method = req.url.split("/").at(-1)
      state.messages.push({ method, ...body })
      result = {
        ok: true,
        result:
          method === "sendMessage"
            ? {
                message_id: state.messages.length,
                chat: { id: body.chat_id, type: "private" },
                text: body.text,
              }
            : true,
      }
    } else if (req.url.startsWith("/mock/api.resend.com")) {
      state.emails.push(body)
      result = { id: `mock-email-${state.emails.length}` }
    } else if (req.url.startsWith("/mock/rpc.e2e.invalid")) {
      state.rpcCalls.push(body.method)
      const balance = (amount) => ({
        accountIndex: 1,
        mint: state.mode === "wrong_mint" ? "So11111111111111111111111111111111111111112" : mint,
        owner: wallet,
        programId: program,
        uiTokenAmount: { amount, decimals: 6 },
      })
      if (body.method === "getGenesisHash") result = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
      else if (body.method === "getTokenAccountsByOwner")
        result = {
          value: [
            {
              pubkey: account,
              account: {
                owner: program,
                data: {
                  parsed: {
                    type: "account",
                    info: { owner: wallet, mint, tokenAmount: { decimals: 6 } },
                  },
                },
              },
            },
          ],
        }
      else if (body.method === "getSignaturesForAddress")
        result =
          state.mode === "none"
            ? []
            : [
                {
                  signature,
                  slot: 400000001,
                  err: null,
                  confirmationStatus: state.mode === "unconfirmed" ? "confirmed" : "finalized",
                },
              ]
      else if (body.method === "getTransaction")
        result = {
          slot: 400000001,
          blockTime: Math.floor(Date.now() / 1000) - (state.mode === "historical" ? 7200 : 0),
          transaction: {
            signatures: [signature],
            message: { accountKeys: [{ pubkey: wallet }, { pubkey: account }] },
          },
          meta: {
            err: null,
            preTokenBalances: [balance("0")],
            postTokenBalances: [
              balance(
                state.mode === "short" ? (BigInt(state.amount) / 2n).toString() : state.amount,
              ),
            ],
          },
        }
      else throw new Error(`Unexpected RPC method ${body.method}`)
      result = { jsonrpc: "2.0", id: body.id, result }
    } else {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify(result))
  } catch (error) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: error.message }))
  }
})
server.listen(3457, "127.0.0.1", () =>
  process.stdout.write("Isolated payment provider mocks ready on 3457\n"),
)
