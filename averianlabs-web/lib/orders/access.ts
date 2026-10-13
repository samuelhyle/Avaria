import crypto from "node:crypto"

export function orderAccessToken(orderId: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error("Order access requires AUTH_SECRET")
  return crypto.createHmac("sha256", secret).update(`guest-order:${orderId}`).digest("hex")
}

export function hasOrderAccess(orderId: string, token: string | undefined): boolean {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false
  const expected = orderAccessToken(orderId)
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}
