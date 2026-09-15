"use client"

import { SaveToPlanButton } from "@/components/research-plans/SaveToPlanButton"
import { BookmarkPlus } from "lucide-react"
import { useTranslations } from "next-intl"

interface SaveToPlanWrapperProps {
  productSlug: string
  productName: string
  locale: string
  isAuthed: boolean
  plans: { id: string; title: string }[]
}

/**
 * Thin client wrapper around the save-to-plan modal. The parent (a client
 * island on the product page) resolves the session and plans after hydration
 * so the product page itself can stay statically rendered.
 */
export function SaveToPlanWrapper({
  productSlug,
  productName,
  locale,
  isAuthed,
  plans,
}: SaveToPlanWrapperProps) {
  const _t = useTranslations("plans")
  return (
    <SaveToPlanButton
      productId={productSlug}
      productName={productName}
      plans={plans}
      isAuthed={isAuthed}
      signInHref={`/${locale}/account`}
    />
  )
}
