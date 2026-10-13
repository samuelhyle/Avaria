import { locales } from "@/lib/i18n/config"
import { z } from "zod"

export const itemsSchema = z
  .array(z.object({ sku: z.string().min(1).max(64), qty: z.number().int().min(1).max(20) }))
  .min(1)
  .max(20)
export const addressSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  postal: z.string().trim().min(2).max(20),
  country: z
    .string()
    .length(2)
    .transform((country) => country.toUpperCase())
    .refine((country) => country === "FI"),
})
export const checkoutSchema = z.object({
  requestKey: z.string().uuid(),
  expectedQuoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  email: z.string().trim().email().max(254),
  items: itemsSchema,
  shippingMethodId: z.string().min(1).max(64),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  vatId: z.string().max(32).optional(),
  paymentMethod: z.enum(["stripe", "coinbase"]).default("stripe"),
  locale: z.enum(locales).default("en"),
  researchConsent: z.literal(true),
})
export const quoteSchema = z.object({
  items: itemsSchema,
  locale: z.enum(locales).default("en"),
  shippingMethodId: z.string().max(64).optional(),
  country: z
    .string()
    .length(2)
    .default("FI")
    .transform((country) => country.toUpperCase())
    .refine((country) => country === "FI"),
  postal: z.string().max(20).optional(),
  city: z.string().max(120).optional(),
})
