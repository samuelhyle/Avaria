import { cryptoCheckoutSessions, orderItems, orders } from "@/db/schema"
import { CHAINS, type ChainId, isChainId } from "@/lib/crypto/chains"
import {
  type SessionWithOrder,
  claimSession,
  getSessionByToken,
  markSessionDelivered,
  paymentUriFor,
} from "@/lib/crypto/session"
import { checkSessionPayment } from "@/lib/crypto/watcher"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { orderAccessToken } from "@/lib/orders/access"
import { and, desc, eq, inArray } from "drizzle-orm"
import { type TelegramUpdate, answerCallbackQuery, sendTelegramMessage } from "./client"
import {
  type TelegramLocale,
  copyFor,
  localeFromLanguageCode,
  renderAwaitingPayment,
  renderExpired,
  renderInvoice,
  renderOpsOrder,
  renderOpsPaid,
  renderPaymentReview,
} from "./messages"
import { enqueueTelegramMessage } from "./outbox"

/**
 * Telegram update handlers.
 *
 * Deliberately free of framework concerns: the handlers take an update and a
 * sender, so the same code can run behind the Next.js webhook route or inside
 * a standalone worker process.
 *
 * The bot never computes a price. It reads the order that already exists on
 * the server, so the amount in the message is the amount the server will
 * accept.
 */

export interface TelegramSender {
  answerCallback?(id: string): Promise<void>
  send(params: { chatId: string | number; text: string; replyMarkup?: unknown }): Promise<{
    messageId: number
  }>
}

export interface HandlerContext {
  update: TelegramUpdate
  sender: TelegramSender
}

/** Buttons shown under the invoice. */
function invoiceKeyboard(sessionId: string, orderId: string, locale: string) {
  return {
    inline_keyboard: [
      [{ text: "✅ I have paid", callback_data: `paid:${sessionId}` }],
      [
        {
          text: "Order in store",
          url: `${getServerEnv().AUTH_URL}/${locale}/checkout/confirm/${orderId}?token=${orderAccessToken(orderId)}`,
        },
      ],
      [
        { text: "🔄 Check status", callback_data: `status:${sessionId}` },
        { text: "💬 Support", callback_data: "support" },
      ],
    ],
  }
}

function orderKeyboard(sessionId: string) {
  return {
    inline_keyboard: [[{ text: "🔄 Check status", callback_data: `status:${sessionId}` }]],
  }
}

/** The items of an order, formatted for the invoice message. */
async function orderLines(
  orderId: string,
): Promise<Array<{ name: string; sku: string; size: string; qty: number; priceCents: number }>> {
  const rows = await db
    .select({
      name: orderItems.nameSnapshot,
      sku: orderItems.skuSnapshot,
      sizeValue: orderItems.sizeValueSnapshot,
      sizeUnit: orderItems.sizeUnitSnapshot,
      qty: orderItems.qty,
      unitPriceCents: orderItems.unitPriceCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
  return rows.map((row) => ({
    name: row.name ?? row.sku ?? "",
    sku: row.sku ?? "",
    size: `${row.sizeValue ?? 0} ${row.sizeUnit ?? ""}`.trim(),
    qty: row.qty,
    priceCents: row.unitPriceCents,
  }))
}

async function buildInvoiceText(
  session: SessionWithOrder,
  locale: TelegramLocale,
): Promise<string> {
  const chain = session.session.chain as ChainId
  const info = CHAINS[chain]
  const lines = await orderLines(session.order.id)
  const minutesRemaining = Math.max(
    0,
    Math.round((session.session.expiresAt.getTime() - Date.now()) / 60_000),
  )
  return renderInvoice(
    {
      orderNumber: session.order.number,
      email: session.order.email,
      lines,
      productsCents: session.order.subtotalCents + session.order.discountCents,
      discountCents: session.order.discountCents,
      promoCode: session.order.promoCode,
      shippingCents: session.order.shippingCents,
      vatCents: session.order.vatCents,
      totalCents: session.order.totalCents,
      chainLabel: info.label,
      chainSymbol: info.symbol,
      amountCrypto: session.session.amountCrypto,
      rateEurPerUnit: session.session.rateEurPerUnit,
      walletAddress: session.session.walletAddress,
      paymentUri: paymentUriFor(
        chain,
        session.session.walletAddress,
        session.session.amountCrypto,
        session.order.number,
      ),
      expiresAt: session.session.expiresAt,
      minutesRemaining,
    },
    locale,
  )
}

/**
 * Handle `/start`.
 *
 * With a token it issues the invoice for that session. Without one it
 * greets the customer and points at the store.
 */
export async function handleStart(context: HandlerContext): Promise<void> {
  const message = context.update.message
  if (!message?.chat) return
  const locale = localeFromLanguageCode(message.from?.language_code)
  const c = copyFor(locale)
  const text = message.text ?? ""
  const token = text.split(/\s+/).slice(1).join("").trim()

  if (!token) {
    await context.sender.send({
      chatId: message.chat.id,
      text: c.welcome.replaceAll(c.storeUrl, getServerEnv().AUTH_URL ?? c.storeUrl),
    })
    return
  }

  const session = await getSessionByToken(token)
  if (
    !session ||
    message.chat.type !== "private" ||
    !message.from ||
    !(await claimSession(token, String(message.from.id), String(message.chat.id)))
  ) {
    await context.sender.send({ chatId: message.chat.id, text: c.unknownOrder })
    return
  }
  if (session.session.status === "paid") {
    await context.sender.send({
      chatId: message.chat.id,
      text: renderPaidFor(session, locale),
    })
    return
  }
  if (session.session.expiresAt.getTime() <= Date.now()) {
    await context.sender.send({
      chatId: message.chat.id,
      text: renderExpired(session.order.number, locale),
    })
    return
  }

  const invoice = await buildInvoiceText(session, locale)
  const sent = await context.sender.send({
    chatId: message.chat.id,
    text: invoice,
    replyMarkup: invoiceKeyboard(session.session.id, session.order.id, session.order.locale),
  })
  await markSessionDelivered(session.session.id, {
    userId: String(message.from?.id ?? ""),
    chatId: String(message.chat.id),
    messageId: String(sent.messageId),
  })

  // The team always has the order in front of them.
  const opsChatId = getServerEnv().TELEGRAM_OPS_CHAT_ID
  if (opsChatId) {
    const lines = await orderLines(session.order.id)
    const chain = session.session.chain as ChainId
    const info = CHAINS[chain]
    await enqueueTelegramMessage(
      {
        chatId: opsChatId,
        text: renderOpsOrder(
          {
            orderNumber: session.order.number,
            email: session.order.email,
            items: lines.map((line) => `${line.name} · ${line.size} × ${line.qty}`).join("\n"),
            totalCents: session.order.totalCents,
            amountCrypto: session.session.amountCrypto,
            chainSymbol: info.symbol,
            walletAddress: session.session.walletAddress,
            expiresAt: session.session.expiresAt,
          },
          locale,
        ),
      },
      `crypto-ops-created:${session.session.id}`,
    )
  }
}

function renderPaidFor(session: SessionWithOrder, locale: TelegramLocale): string {
  if (session.order.status === "payment_review")
    return renderPaymentReview(session.order.number, locale)
  const c = copyFor(locale)
  const chain = session.session.chain as ChainId
  return [
    `✅ <b>${c.paidTitle}</b>`,
    c.paidBody
      .replace("{amount}", session.session.amountCrypto)
      .replace("{symbol}", CHAINS[chain].symbol),
    `${c.paidOrder}: ${session.order.number}`,
  ].join("\n")
}

/** Handle `/status` and `/order`. */
export async function handleStatus(context: HandlerContext): Promise<void> {
  const message = context.update.message
  if (!message?.chat) return
  const locale = localeFromLanguageCode(message.from?.language_code)
  const c = copyFor(locale)
  const token = (message.text ?? "").split(/\s+/).slice(1).join("").trim()
  const session = token ? await getSessionByToken(token) : await latestSessionFor(message.chat.id)
  if (
    !session ||
    message.chat.type !== "private" ||
    String(message.from?.id) !== session.session.telegramUserId ||
    String(message.chat.id) !== session.session.telegramChatId
  ) {
    await context.sender.send({ chatId: message.chat.id, text: c.noOrder })
    return
  }
  if (session.session.status === "paid") {
    await context.sender.send({
      chatId: message.chat.id,
      text: renderPaidFor(session, locale),
    })
    return
  }
  if (session.session.expiresAt.getTime() <= Date.now()) {
    await context.sender.send({
      chatId: message.chat.id,
      text: renderExpired(session.order.number, locale),
    })
    return
  }
  await context.sender.send({
    chatId: message.chat.id,
    text: await buildInvoiceText(session, locale),
    replyMarkup: orderKeyboard(session.session.id),
  })
}

/** The most recent session this chat opened. */
async function latestSessionFor(chatId: number | string): Promise<SessionWithOrder | null> {
  const [row] = await db
    .select({ session: cryptoCheckoutSessions, order: orders })
    .from(cryptoCheckoutSessions)
    .innerJoin(orders, eq(orders.id, cryptoCheckoutSessions.orderId))
    .where(eq(cryptoCheckoutSessions.telegramChatId, String(chatId)))
    .orderBy(desc(cryptoCheckoutSessions.createdAt))
    .limit(1)
  return row ?? null
}

/** Handle `/help`. */
export async function handleHelp(context: HandlerContext): Promise<void> {
  const message = context.update.message
  if (!message?.chat) return
  const locale = localeFromLanguageCode(message.from?.language_code)
  const c = copyFor(locale)
  await context.sender.send({
    chatId: message.chat.id,
    text: c.help.replace("{storeUrl}", getServerEnv().AUTH_URL ?? c.storeUrl),
  })
}

/** Handle a callback from an inline button. */
export async function handleCallback(context: HandlerContext): Promise<void> {
  const query = context.update.callback_query
  if (!query?.message?.chat) return
  await context.sender.answerCallback?.(query.id).catch(() => undefined)
  const locale = localeFromLanguageCode(query.from?.language_code)
  const data = query.data ?? ""
  if (data === "support") {
    await context.sender.send({
      chatId: query.message.chat.id,
      text: copyFor(locale).help.replace(
        "{storeUrl}",
        getServerEnv().AUTH_URL ?? copyFor(locale).storeUrl,
      ),
    })
    return
  }
  const [action, sessionId] = data.split(":")
  if (!sessionId) return
  const session = await getSessionByToken(sessionId)
  if (
    !session ||
    query.message.chat.type !== "private" ||
    String(query.from?.id) !== session.session.telegramUserId ||
    String(query.message.chat.id) !== session.session.telegramChatId
  ) {
    await context.sender.send({
      chatId: query.message.chat.id,
      text: copyFor(locale).unknownOrder,
    })
    return
  }
  if (session.session.status === "paid") {
    await context.sender.send({
      chatId: query.message.chat.id,
      text: renderPaidFor(session, locale),
    })
    return
  }
  if (action === "paid") {
    // The customer says they have paid. Check the chain now rather than
    // telling them to wait for the next sweep. The check runs inside a
    // Telegram webhook, so the explorer call gets a short budget.
    const result = await checkSessionPayment(sessionId, { timeoutMs: 5_000 })
    if (result.outcome === "paid") {
      await context.sender.send({
        chatId: query.message.chat.id,
        text: renderPaidFor((await getSessionByToken(sessionId)) ?? session, locale),
      })
      return
    }
    await context.sender.send({
      chatId: query.message.chat.id,
      text: renderAwaitingPayment(result.reason, locale),
    })
    return
  }
  if (action === "status") {
    await context.sender.send({
      chatId: query.message.chat.id,
      text: await buildInvoiceText(session, locale),
      replyMarkup: orderKeyboard(session.session.id),
    })
  }
}

/** Route an update to the right handler. */
export async function handleUpdate(context: HandlerContext): Promise<void> {
  const update = context.update
  if (update.callback_query) {
    await handleCallback(context)
    return
  }
  const message = update.message
  if (!message?.chat) return
  const text = (message.text ?? "").trim()
  const [command] = text.split(/\s+/)
  switch (command?.split("@")[0]) {
    case "/start":
      await handleStart(context)
      return
    case "/status":
    case "/order":
      await handleStatus(context)
      return
    case "/help":
      await handleHelp(context)
      return
    default:
      return
  }
}

/** A sender backed by the Bot API. */
export const apiSender: TelegramSender = {
  async answerCallback(id) {
    await answerCallbackQuery(id)
  },
  async send({ chatId, text, replyMarkup }) {
    const message = await sendTelegramMessage({ chatId, text, replyMarkup })
    return { messageId: message.message_id }
  },
}
