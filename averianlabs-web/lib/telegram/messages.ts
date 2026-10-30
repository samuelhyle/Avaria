/**
 * Telegram message templates.
 *
 * Telegram's `parse_mode=HTML` supports a small subset of HTML. Every value
 * interpolated into a message is escaped, because product names and customer
 * emails are user-controlled and Telegram renders the message as HTML.
 */

export const TELEGRAM_LOCALES = ["en", "fi", "sv", "ru"] as const
export type TelegramLocale = (typeof TELEGRAM_LOCALES)[number]

/** Map a Telegram `language_code` onto a supported locale. */
export function localeFromLanguageCode(code: string | undefined): TelegramLocale {
  const base = (code ?? "en").split("-")[0]?.toLowerCase() ?? "en"
  if ((TELEGRAM_LOCALES as readonly string[]).includes(base)) return base as TelegramLocale
  return "en"
}

const ENTITIES: Record<string, [string, string]> = {
  "&": ["&", "&amp;"],
  "<": ["<", "&lt;"],
  ">": [">", "&gt;"],
  '"': ['"', "&quot;"],
}

/** Escape a value for Telegram's HTML parse mode. */
export function escapeTelegramHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ENTITIES[char]?.[1] ?? char)
}

/** Render a decimal amount without trailing zeroes. */
function trimAmount(amount: string): string {
  return amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount
}

export interface InvoiceLine {
  name: string
  sku: string
  size: string
  qty: number
  priceCents: number
}

export interface InvoiceInput {
  orderNumber: string
  email: string
  lines: InvoiceLine[]
  productsCents: number
  discountCents: number
  promoCode?: string | null
  shippingCents: number
  vatCents: number
  totalCents: number
  chainLabel: string
  chainSymbol: string
  amountCrypto: string
  rateEurPerUnit: number
  walletAddress: string
  paymentUri: string
  expiresAt: Date
  minutesRemaining: number
}

const COPY = {
  en: {
    invoiceTitle: "Your order",
    products: "Products",
    discount: "Discount",
    shipping: "Shipping",
    vat: "VAT included",
    total: "Total",
    payExactly: "Send exactly",
    lockedFor: "Rate locked for {minutes} more minutes.",
    address: "Send only {symbol} on the {chain} network to this address:",
    addressWarning:
      "Send any other asset, a different amount or the wrong network and the order will not clear.",
    deadline: "Please pay before {deadline}.",
    checkStatus: "Check payment status",
    support: "Contact support",
    paidTitle: "Payment received",
    paidBody:
      "We have received your payment of {amount} {symbol} and marked the order as paid. You will get a separate email with the receipt.",
    paidOrder: "Order",
    expiredTitle: "Order expired",
    expiredBody:
      "The payment window for this order has closed and the reserved stock has been released. Place a new order whenever you are ready.",
    opsTitle: "New crypto order",
    opsBody:
      "{order} · {email}\n{items}\nTotal {total}\nSend {amount} {symbol} to {address}\nExpires {deadline}",
    opsPaid: "Paid",
    opsPaidBody: "{order} · {amount} {symbol} ({total}) — pack and ship.",
    opsExpired: "Expired",
    opsExpiredBody: "{order} — payment window closed, stock released.",
    welcome:
      "Welcome to AverianLabs.\n\nThis bot issues crypto invoices for orders placed on averianlabs.eu. Open the store to start an order; the invoice appears here automatically.",
    help: "Commands:\n/status — check a payment\n/order — your latest order\n/help — this message\n\nOpen the store: {storeUrl}",
    storeUrl: "https://averianlabs.eu",
    unknownOrder: "I could not find that order. Open the store and start a new order.",
    noOrder: "You have no open orders.",
    awaitingUnconfirmed:
      "Thanks — we are checking the blockchain now. Your payment has not been confirmed yet; it usually takes a few minutes. We will message you as soon as it lands.",
    awaitingShort:
      "Thanks — we can see a transfer, but it is for less than the invoice amount. Send the missing amount and we will release the order straight away.",
    awaitingNotFound:
      "Thanks. We cannot see a payment yet. It may still be propagating — give it a few minutes and press the button again, or message support if it does not arrive.",
    awaitingUnavailable:
      "Thanks. We could not reach the blockchain right now, so we could not check yet. We will message you as soon as the payment lands.",
  },
  fi: {
    invoiceTitle: "Tilauksesi",
    products: "Tuotteet",
    discount: "Alennus",
    shipping: "Toimitus",
    vat: "ALV sisältyy",
    total: "Yhteensä",
    payExactly: "Lähetä täsmälleen",
    lockedFor: "Kurssi on lukittu vielä {minutes} minuutiksi.",
    address: "Lähetä vain {symbol} {chain}-verkossa tähän osoitteeseen:",
    addressWarning: "Muu omaisuus, eri summa tai väärä verkko estää tilauksen vahvistumisen.",
    deadline: "Maksa ennen {deadline}.",
    checkStatus: "Tarkista maksun tila",
    support: "Ota yhteyttä tukeen",
    paidTitle: "Maksu vastaanotettu",
    paidBody:
      "Vastaanotimme maksun {amount} {symbol} ja merkitsimme tilauksen maksetuksi. Saat erillisen sähköpostiviestin laskulla.",
    paidOrder: "Tilaus",
    expiredTitle: "Tilaus vanhentui",
    expiredBody:
      "Tilaus maksuikkunan sulkeutui ja varattu tuote palautettiin myyntiin. Tee uusi tilaus, kun olet valmis.",
    opsTitle: "Uusi kryptotilaus",
    opsBody:
      "{order} · {email}\n{items}\nYhteensä {total}\nLähetä {amount} {symbol} osoitteeseen {address}\nVanhenee {deadline}",
    opsPaid: "Maksettu",
    opsPaidBody: "{order} · {amount} {symbol} ({total}) — pakkaa ja lähetä.",
    opsExpired: "Vanhentui",
    opsExpiredBody: "{order} — maksuikkuna sulkeutui, tuote palautettiin.",
    welcome:
      "Tervetuloa AverianLabsiin.\n\nTämä botti myöntää kryptolaskuja verkkokaupan tilauksiin. Avaa kauppa aloittaaksesi tilauksen; lasku näkyy täällä automaattisesti.",
    help: "Komennot:\n/status — tarkista maksu\n/order — viimeisin tilauksesi\n/help — tämä viesti\n\nAvaa kauppa: {storeUrl}",
    storeUrl: "https://averianlabs.eu",
    unknownOrder: "Tilausta ei löytynyt. Avaa kauppa ja tee uusi tilaus.",
    noOrder: "Sinulla ei ole avoimia tilauksia.",
    awaitingUnconfirmed:
      "Kiitos — tarkistamme nyt lohkoketjua. Maksua ei ole vielä vahvistettu; se kestää yleensä muutaman minuutin. Ilmoitamme heti kun se saapuu.",
    awaitingShort:
      "Kiitos — näemme siirron, mutta se on pienempi kuin laskun summa. Lähetä puuttuva summa, niin vapautamme tilauksen heti.",
    awaitingNotFound:
      "Kiitos. Emme vielä näe maksua. Se voi olla yhä levittäytymässä — anna sille muutama minuutti ja paina painiketta uudelleen, tai ota yhteyttä tukeen jos se ei saavu.",
    awaitingUnavailable:
      "Kiitos. Emme tavoittaneet lohkoketjua juuri nyt, joten emme voineet tarkistaa. Ilmoitamme heti kun maksu saapuu.",
  },
  sv: {
    invoiceTitle: "Din beställning",
    products: "Produkter",
    discount: "Rabatt",
    shipping: "Frakt",
    vat: "Moms ingår",
    total: "Totalt",
    payExactly: "Skicka exakt",
    lockedFor: "Kursen är låst i ytterligare {minutes} minuter.",
    address: "Skicka endast {symbol} i {chain}-nätverket till den här adressen:",
    addressWarning:
      "En annan tillgång, ett annat belopp eller fel nätverk gör att ordern inte godkänns.",
    deadline: "Betala före {deadline}.",
    checkStatus: "Kontrollera betalningen",
    support: "Kontakta supporten",
    paidTitle: "Betalningen mottagen",
    paidBody:
      "Vi har mottagit din betalning på {amount} {symbol} och markerat ordern som betald. Du får en separat faktura med e-post.",
    paidOrder: "Order",
    expiredTitle: "Ordern har gått ut",
    expiredBody:
      "Betalningsfönstret har stängts och den reserverade varan har frigjorts. Lägg en ny order när du är redo.",
    opsTitle: "Ny kryptoorder",
    opsBody:
      "{order} · {email}\n{items}\nTotalt {total}\nSkicka {amount} {symbol} till {address}\nGår ut {deadline}",
    opsPaid: "Betald",
    opsPaidBody: "{order} · {amount} {symbol} ({total}) — packa och skicka.",
    opsExpired: "Utgången",
    opsExpiredBody: "{order} — betalningsfönstret stängdes, varan frigjordes.",
    welcome:
      "Välkommen till AverianLabs.\n\nBoten utfärdar kryptofakturor för beställningar. Öppna butiken så visas fakturan här automatiskt.",
    help: "Kommandon:\n/status — kontrollera betalning\n/order — senaste ordern\n/help — detta meddelande\n\nÖppna butiken: {storeUrl}",
    storeUrl: "https://averianlabs.eu",
    unknownOrder: "Ordern hittades inte. Lägg en ny order i butiken.",
    noOrder: "Du har inga öppna ordrar.",
    awaitingUnconfirmed:
      "Thanks — we are checking the blockchain now. Your payment has not been confirmed yet; it usually takes a few minutes. We will message you as soon as it lands.",
    awaitingShort:
      "Thanks — we can see a transfer, but it is for less than the invoice amount. Send the missing amount and we will release the order straight away.",
    awaitingNotFound:
      "Thanks. We cannot see a payment yet. It may still be propagating — give it a few minutes and press the button again, or message support if it does not arrive.",
    awaitingUnavailable:
      "Thanks. We could not reach the blockchain right now, so we could not check yet. We will message you as soon as the payment lands.",
  },
  ru: {
    invoiceTitle: "Ваш заказ",
    products: "Товары",
    discount: "Скидка",
    shipping: "Доставка",
    vat: "НДС включён",
    total: "Итого",
    payExactly: "Отправьте ровно",
    lockedFor: "Курс зафиксирован ещё на {minutes} минут.",
    address: "Отправьте только {symbol} в сети {chain} на этот адрес:",
    addressWarning:
      "Любой другой актив, другая сумма или неверная сеть — и заказ не будет подтверждён.",
    deadline: "Оплатите до {deadline}.",
    checkStatus: "Проверить статус платежа",
    support: "Связаться с поддержкой",
    paidTitle: "Платёж получен",
    paidBody:
      "Мы получили ваш платёж {amount} {symbol} и отметили заказ как оплаченный. Чек придёт отдельным письмом на электронную почту.",
    paidOrder: "Заказ",
    expiredTitle: "Срок заказа истёк",
    expiredBody:
      "Окно оплаты по этому заказу закрылось, а зарезервированный товар вернулся в продажу. Оформите новый заказ, когда будете готовы.",
    opsTitle: "Новый криптовалютный заказ",
    opsBody:
      "{order} · {email}\n{items}\nИтого {total}\nОтправьте {amount} {symbol} на адрес {address}\nДействует до {deadline}",
    opsPaid: "Оплачен",
    opsPaidBody: "{order} · {amount} {symbol} ({total}) — упакуйте и отправьте.",
    opsExpired: "Истёк",
    opsExpiredBody: "{order} — окно оплаты закрыто, товар возвращён в продажу.",
    welcome:
      "Добро пожаловать в AverianLabs.\n\nЭтот бот выставляет криптовалютные счета за заказы на averianlabs.eu. Откройте магазин, чтобы оформить заказ, — счёт появится здесь автоматически.",
    help: "Команды:\n/status — проверить платёж\n/order — ваш последний заказ\n/help — это сообщение\n\nОткройте магазин: {storeUrl}",
    storeUrl: "https://averianlabs.eu",
    unknownOrder: "Я не нашёл этот заказ. Откройте магазин и оформите новый заказ.",
    noOrder: "У вас нет открытых заказов.",
    awaitingUnconfirmed:
      "Спасибо — мы проверяем блокчейн прямо сейчас. Ваш платёж ещё не подтверждён, обычно это занимает несколько минут. Мы напишем, как только он поступит.",
    awaitingShort:
      "Спасибо — мы видим перевод, но его сумма меньше суммы счёта. Доплатите разницу, и мы сразу подтвердим заказ.",
    awaitingNotFound:
      "Спасибо. Платёж пока не виден. Возможно, он ещё распространяется по сети — подождите несколько минут и нажмите кнопку ещё раз, либо напишите в поддержку, если он не поступит.",
    awaitingUnavailable:
      "Спасибо. Сейчас мы не смогли связаться с блокчейном, поэтому проверить платёж не удалось. Мы напишем, как только он поступит.",
  },
} as const

export type TelegramCopy = (typeof COPY)["en"]

export function copyFor(locale: TelegramLocale): TelegramCopy {
  return (COPY[locale as keyof typeof COPY] ?? COPY.en) as TelegramCopy
}

function money(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fi" ? "fi-FI" : locale === "ru" ? "ru-RU" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

export function renderInvoice(input: InvoiceInput, locale: TelegramLocale): string {
  const c = copyFor(locale)
  const lines = input.lines
    .map(
      (line) =>
        `${escapeTelegramHtml(line.name)} · ${escapeTelegramHtml(line.size)} × ${line.qty} — ${money(
          line.priceCents * line.qty,
          locale,
        )}`,
    )
    .join("\n")
  const rows = [
    `<b>${escapeTelegramHtml(c.products)}</b>  ${money(input.productsCents, locale)}`,
    input.discountCents > 0
      ? `<b>${escapeTelegramHtml(c.discount)}</b>${
          input.promoCode ? ` (${escapeTelegramHtml(input.promoCode)})` : ""
        }  −${money(input.discountCents, locale)}`
      : "",
    `<b>${escapeTelegramHtml(c.shipping)}</b>  ${money(input.shippingCents, locale)}`,
    `<b>${escapeTelegramHtml(c.vat)}</b>  ${money(input.vatCents, locale)}`,
    `<b>${escapeTelegramHtml(c.total)}</b>  ${money(input.totalCents, locale)}`,
  ].filter(Boolean)
  const deadline = `${input.expiresAt.toISOString().replace("T", " ").slice(0, 16)} UTC`
  return [
    `<b>${escapeTelegramHtml(c.invoiceTitle)} ${escapeTelegramHtml(input.orderNumber)}</b>`,
    "",
    lines,
    "",
    ...rows,
    "",
    `${escapeTelegramHtml(c.payExactly)} <code>${escapeTelegramHtml(
      trimAmount(input.amountCrypto),
    )} ${escapeTelegramHtml(input.chainSymbol)}</code>`,
    escapeTelegramHtml(c.lockedFor.replace("{minutes}", String(input.minutesRemaining))),
    "",
    escapeTelegramHtml(
      c.address.replace("{symbol}", input.chainSymbol).replace("{chain}", input.chainLabel),
    ),
    `<code>${escapeTelegramHtml(input.walletAddress)}</code>`,
    "",
    escapeTelegramHtml(c.addressWarning),
    escapeTelegramHtml(c.deadline.replace("{deadline}", deadline)),
  ].join("\n")
}

export function renderPaid(
  input: {
    orderNumber: string
    amountCrypto: string
    chainSymbol: string
  },
  locale: TelegramLocale,
): string {
  const c = copyFor(locale)
  return [
    `✅ <b>${escapeTelegramHtml(c.paidTitle)}</b>`,
    escapeTelegramHtml(
      c.paidBody
        .replace("{amount}", trimAmount(input.amountCrypto))
        .replace("{symbol}", input.chainSymbol),
    ),
    `${escapeTelegramHtml(c.paidOrder)}: <code>${escapeTelegramHtml(input.orderNumber)}</code>`,
  ].join("\n")
}

/**
 * The answer to "I have paid" when the payment has not landed yet.
 *
 * The reason decides the wording: a transaction that is still propagating
 * needs patience, a short payment needs the missing amount, and an
 * unreachable chain is our problem rather than the customer's.
 */
export function renderAwaitingPayment(
  reason: "unconfirmed" | "short" | "not_found" | "unavailable",
  locale: TelegramLocale,
): string {
  if (reason === "short")
    return locale === "fi"
      ? "Siirron summa ei vastaa laskua. Älä lähetä lisämaksua ennen yhteydenottoa asiakaspalveluun."
      : "We found a transfer that does not match the invoice. Contact support before sending any additional payment."
  const c = copyFor(locale)
  const text =
    reason === "unconfirmed"
      ? c.awaitingUnconfirmed
      : reason === "unavailable"
        ? c.awaitingUnavailable
        : c.awaitingNotFound
  return escapeTelegramHtml(text)
}

export function renderExpired(orderNumber: string, locale: TelegramLocale): string {
  const c = copyFor(locale)
  return [
    `⌛ <b>${escapeTelegramHtml(c.expiredTitle)}</b>`,
    escapeTelegramHtml(c.expiredBody),
    `${escapeTelegramHtml(c.paidOrder)}: <code>${escapeTelegramHtml(orderNumber)}</code>`,
  ].join("\n")
}

export function renderOpsOrder(
  input: {
    orderNumber: string
    email: string
    items: string
    totalCents: number
    amountCrypto: string
    chainSymbol: string
    walletAddress: string
    expiresAt: Date
  },
  locale: TelegramLocale = "en",
): string {
  const c = copyFor(locale)
  const deadline = `${input.expiresAt.toISOString().replace("T", " ").slice(0, 16)} UTC`
  return [
    `🧬 <b>${escapeTelegramHtml(c.opsTitle)}</b>`,
    escapeTelegramHtml(
      c.opsBody
        .replace("{order}", input.orderNumber)
        .replace("{email}", input.email)
        .replace("{items}", input.items)
        .replace("{total}", money(input.totalCents, locale))
        .replace("{amount}", trimAmount(input.amountCrypto))
        .replace("{symbol}", input.chainSymbol)
        .replace("{address}", input.walletAddress)
        .replace("{deadline}", deadline),
    ),
  ].join("\n")
}

export function renderOpsPaid(
  input: { orderNumber: string; amountCrypto: string; chainSymbol: string; totalCents: number },
  locale: TelegramLocale = "en",
): string {
  const c = copyFor(locale)
  return `💰 <b>${escapeTelegramHtml(c.opsPaid)}</b> — ${escapeTelegramHtml(
    c.opsPaidBody
      .replace("{order}", input.orderNumber)
      .replace("{amount}", trimAmount(input.amountCrypto))
      .replace("{symbol}", input.chainSymbol)
      .replace("{total}", money(input.totalCents, locale)),
  )}`
}

export function renderOpsExpired(orderNumber: string, locale: TelegramLocale = "en"): string {
  const c = copyFor(locale)
  return `⌛ <b>${escapeTelegramHtml(c.opsExpired)}</b> — ${escapeTelegramHtml(
    c.opsExpiredBody.replace("{order}", orderNumber),
  )}`
}

/** A confirmed deposit can still require fulfilment review. */
export function renderPaymentReview(orderNumber: string, locale: TelegramLocale): string {
  return locale === "fi"
    ? `Maksu vastaanotettu. Tilaus ${escapeTelegramHtml(orderNumber)} vaatii tarkistuksen. Älä maksa uudelleen. Ota yhteys asiakaspalveluun.`
    : `Payment received. Order ${escapeTelegramHtml(orderNumber)} needs manual review. Do not pay again. Contact support.`
}
