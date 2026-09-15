"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils/cn"
import { Loader2, Mail } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

interface NewsletterFormProps {
  placeholder?: string
  ctaLabel?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function NewsletterForm({
  placeholder = "you@lab.eu",
  ctaLabel,
  size = "md",
  className,
}: NewsletterFormProps) {
  const t = useTranslations("common")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting || !email) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t("subscribeFailed"))
      }
      setEmail("")
      toast.success(t("subscribed"), { description: t("subscribedDesc") })
    } catch {
      toast.error(t("subscribeFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-1 flex-col gap-2 sm:flex-row", className)}>
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        aria-label={t("emailAddress")}
        autoComplete="email"
        leftIcon={<Mail className="h-4 w-4" />}
        inputSize={size}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (ctaLabel ?? t("subscribe"))}
      </Button>
    </form>
  )
}
