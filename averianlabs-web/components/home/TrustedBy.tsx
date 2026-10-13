import { getTranslations } from "next-intl/server"

/**
 * A small "trusted by" row that lives between the hero CTAs and the
 * rest of the page. Five named institutional categories that a
 * research peptide supplier would typically serve, rendered as
 * muted uppercase text. No fake logos — the row's authority comes
 * from the typography, the spacing, and the copy, not from a
 * fabricated brand.
 *
 * When real customer logos become available, this component is the
 * place to drop them: swap the `<li>` body for an `<img>` and add
 * `grayscale` + `opacity-60` to keep the visual weight.
 */
export async function TrustedBy() {
  const t = await getTranslations("home")
  const entries = [
    t("trustedUniversity"),
    t("trustedBiotech"),
    t("trustedHospital"),
    t("trustedLab"),
    t("trustedInstitute"),
  ]
  return (
    <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-subtle">
        {t("trustedLabel")}
      </p>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {entries.map((label) => (
          <li key={label} className="opacity-70 transition-opacity hover:opacity-100">
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
