"use client"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { useState } from "react"
export function ConfirmDelete({ token }: { token: string }) {
  const t = useTranslations("research")
  const g = useTranslations("gdpr")
  const [state, setState] = useState("idle")
  if (state === "done") return <p role="status">{t("deletionImmediate")}</p>
  return (
    <div>
      <Button
        variant="danger"
        disabled={state === "pending"}
        onClick={async () => {
          setState("pending")
          try {
            const res = await fetch("/api/account/delete/confirm", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token }),
            })
            setState(res.ok ? "done" : "error")
          } catch {
            setState("error")
          }
        }}
      >
        {g("deleteButton")}
      </Button>
      {state === "error" && <p role="alert">{t("requestFailed")}</p>}
    </div>
  )
}
