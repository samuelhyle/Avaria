import { getServerEnv } from "@/lib/env"

/**
 * Minimal Telegram Bot API client.
 *
 * The bot token never leaves the server: the browser only ever receives a
 * `t.me` deep link, never the token itself.
 */

export interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: string
  title?: string
  username?: string
}

export interface TelegramMessage {
  message_id: number
  chat: TelegramChat
  from?: TelegramUser
  text?: string
  caption?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: {
    id: string
    data?: string
    from?: TelegramUser
    message?: TelegramMessage
  }
}

export interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly errorCode?: number,
  ) {
    super(message)
    this.name = "TelegramError"
  }
}

const API = "https://api.telegram.org"

function botToken(): string {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN
  if (!token) throw new TelegramError("TELEGRAM_BOT_TOKEN is not configured")
  return token
}

export function isTelegramConfigured(): boolean {
  return Boolean(getServerEnv().TELEGRAM_BOT_TOKEN)
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = botToken()
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const payload = (await response.json().catch(() => null)) as TelegramResponse<T> | null
  if (!response.ok || !payload?.ok)
    throw new TelegramError(
      payload?.description ?? `Telegram ${method} failed with ${response.status}`,
      payload?.error_code,
    )
  return payload.result as T
}

export interface SendMessageParams {
  chatId: string | number
  text: string
  parseMode?: "HTML" | "MarkdownV2"
  disableWebPagePreview?: boolean
  replyMarkup?: unknown
}

export async function sendTelegramMessage(params: SendMessageParams): Promise<TelegramMessage> {
  return call<TelegramMessage>("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: params.parseMode ?? "HTML",
    disable_web_page_preview: params.disableWebPagePreview ?? true,
    ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
  })
}

export interface EditMessageParams {
  chatId: string | number
  messageId: number
  text: string
  parseMode?: "HTML" | "MarkdownV2"
  replyMarkup?: unknown
}

/** Edit a message in place. Returns false when nothing changed. */
export async function editTelegramMessage(params: EditMessageParams): Promise<boolean> {
  try {
    await call<boolean>("editMessageText", {
      chat_id: params.chatId,
      message_id: params.messageId,
      text: params.text,
      parse_mode: params.parseMode ?? "HTML",
      ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
    })
    return true
  } catch (error) {
    // Telegram rejects an edit that changes nothing. That is not a failure.
    if (error instanceof TelegramError && /message is not modified/i.test(error.message))
      return true
    throw error
  }
}

export interface SendPhotoParams {
  chatId: string | number
  photo: Buffer
  filename?: string
  caption?: string
  parseMode?: "HTML" | "MarkdownV2"
  replyMarkup?: unknown
}

export async function sendTelegramPhoto(params: SendPhotoParams): Promise<TelegramMessage> {
  const token = botToken()
  const form = new FormData()
  form.append("chat_id", String(params.chatId))
  form.append("photo", new Blob([new Uint8Array(params.photo)]), params.filename ?? "qr.png")
  if (params.caption) form.append("caption", params.caption)
  form.append("parse_mode", params.parseMode ?? "HTML")
  if (params.replyMarkup) form.append("reply_markup", JSON.stringify(params.replyMarkup))
  const response = await fetch(`${API}/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(20_000),
  })
  const payload = (await response
    .json()
    .catch(() => null)) as TelegramResponse<TelegramMessage> | null
  if (!response.ok || !payload?.ok)
    throw new TelegramError(payload?.description ?? "Telegram sendPhoto failed")
  return payload.result as TelegramMessage
}

/** Register the webhook that delivers updates to the site. */
export async function setTelegramWebhook(url: string, secretToken: string): Promise<boolean> {
  return call<boolean>("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  })
}

/**
 * Publish the command menu, so the customer sees what the bot can do instead
 * of having to know the commands.
 */
export async function setTelegramCommands(
  commands: Array<{ command: string; description: string }>,
): Promise<boolean> {
  return call<boolean>("setMyCommands", { commands })
}

/** Read the webhook registration back, so a typo is noticed immediately. */
/**
 * The identity of the bot, used to check that the token belongs to the bot
 * whose username is configured.
 */
export async function getTelegramMe() {
  return call<{ id: number; username: string; first_name: string }>("getMe", {})
}

export async function getTelegramWebhookInfo() {
  return call<{ url: string; pending_update_count: number; last_error_message?: string }>(
    "getWebhookInfo",
    {},
  )
}

/** Acknowledge inline buttons so Telegram can stop its progress indicator. */
export async function answerCallbackQuery(id: string): Promise<void> {
  await call<boolean>("answerCallbackQuery", { callback_query_id: id })
}
