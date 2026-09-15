"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

export function ContactForm() {
  const t = useTranslations("contact")
  const [loading, setLoading] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)

        setLoading(true)
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.get("name"),
              email: formData.get("email"),
              subject: formData.get("subject"),
              message: formData.get("message"),
            }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || t("errorTitle"))
          }

          toast.success(t("sentTitle"), { description: t("sentBody") })
          form.reset()
        } catch {
          toast.error(t("errorTitle"))
        } finally {
          setLoading(false)
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="name" label={t("name")} autoComplete="name" required />
        <Input name="email" type="email" label={t("email")} autoComplete="email" required />
      </div>
      <Input name="subject" label={t("subject")} autoComplete="off" required />
      <Textarea name="message" label={t("message")} rows={5} required />
      <Button type="submit" size="lg" fullWidth disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("sending")}
          </>
        ) : (
          t("send")
        )}
      </Button>
    </form>
  )
}
