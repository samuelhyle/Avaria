import { cn } from "@/lib/utils/cn"
import { ArrowRight, FileText, Package, Ruler } from "lucide-react"
import type { ReactNode } from "react"

type DiagramProps = { locale?: string; className?: string; compact?: boolean }

function Figure({
  title,
  caption,
  className,
  compact,
  children,
}: DiagramProps & { title: string; caption: string; children: ReactNode }) {
  return (
    <figure
      className={cn(
        "rounded-xl border border-line bg-surface",
        compact ? "p-4" : "p-5 sm:p-6",
        className,
      )}
    >
      <figcaption className="text-base font-semibold tracking-tight text-ink">{title}</figcaption>
      <div className="my-5">{children}</div>
      <p className="text-sm leading-relaxed text-ink-muted">{caption}</p>
    </figure>
  )
}

/** Explanatory schematic, with its meaning available as ordinary localized text. */
export function FinalVolumeDiagram({ locale = "en", ...props }: DiagramProps) {
  const fi = locale === "fi"
  return (
    <Figure
      {...props}
      title={
        fi
          ? "Lopputilavuus on liuoksen kokonaistilavuus"
          : "Final volume is the total solution volume"
      }
      caption={
        fi
          ? "Laskuri käyttää valmiin liuoksen lopputilavuutta. Se ei tarkoita samaa kuin lisätyn liuottimen määrä. Havainnekuva selittää suureen, ei materiaalin käsittelymenetelmää."
          : "The calculator uses the final volume of the complete solution. This is not the same as the amount of solvent added. This schematic explains a quantity, not a material-handling method."
      }
    >
      <div className="grid items-center gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 120 150"
          className="mx-auto h-36 w-28 text-accent"
          fill="none"
        >
          <path
            d="M47 12h26M50 13v48L24 119c-5 11 0 19 12 19h48c12 0 17-8 12-19L70 61V13"
            className="fill-surface-2"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M51 51h18v10l24 61c3 7 1 11-7 11H34c-8 0-10-4-7-11l24-61V51Z"
            fill="currentColor"
            fillOpacity=".12"
          />
          <path d="M39 51h42" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">
              {fi ? "Massa ÷ lopputilavuus" : "Mass ÷ final volume"}
            </dt>
            <dd className="mt-1 text-ink-muted">{fi ? "Massapitoisuus" : "Mass concentration"}</dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="font-medium text-ink">{fi ? "Liuottimen lisäys" : "Solvent added"}</dt>
            <dd className="mt-1 text-ink-muted">
              {fi
                ? "Erillinen suure; noudata materiaalin hyväksyttyä dokumentaatiota."
                : "A separate quantity; follow the material’s approved documentation."}
            </dd>
          </div>
        </dl>
      </div>
    </Figure>
  )
}

export function NominalContentDiagram({ locale = "en", ...props }: DiagramProps) {
  const fi = locale === "fi"
  return (
    <Figure
      {...props}
      title={fi ? "Nimellismäärä ja mitattu sisältö" : "Nominal quantity and measured content"}
      caption={
        fi
          ? "Luettelon nimellismäärä ei vahvista mitattua sisältöä. HPLC-pinta-alaprosentti ei yksin määritä sisällön määrää eikä toimi suoraan massan korjauskertoimena. Tarkista eräkohtainen raportti ja menetelmän soveltamisala."
          : "A catalogue’s nominal quantity does not establish measured content. HPLC area percentage alone does not determine content quantity or directly provide a mass-correction factor. Check the batch-specific report and the method’s scope."
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <Package className="mb-3 h-5 w-5 text-ink-muted" aria-hidden />
          <p className="text-sm font-medium">
            {fi ? "Luettelon nimellismäärä" : "Catalogue nominal quantity"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {fi ? "Tuotetieto ja ilmoitettu yksikkö" : "Product record and stated unit"}
          </p>
        </div>
        <span className="text-center text-xs font-medium text-ink-muted">
          {fi ? "Ei vahvista" : "Does not establish"}
        </span>
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <Ruler className="mb-3 h-5 w-5 text-accent" aria-hidden />
          <p className="text-sm font-medium">{fi ? "Mitattu sisältö" : "Measured content"}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {fi
              ? "Edellyttää soveltuvaa mittausta ja raporttia"
              : "Requires an appropriate measurement and report"}
          </p>
        </div>
      </div>
    </Figure>
  )
}

export function RecordsScopeDiagram({ locale = "en", compact = false, ...props }: DiagramProps) {
  const fi = locale === "fi"
  const steps = fi
    ? [
        { title: "Tuote ja SKU", detail: "Täsmällinen tuoteversio tarvittaessa" },
        {
          title: "Asiakirjan soveltamisala",
          detail: "Tuote tai täsmällinen erä, asiakirjan mukaan",
        },
        { title: "Alkuperäinen asiakirja", detail: "Sisältö, päiväys ja versio" },
      ]
    : [
        { title: "Product and SKU", detail: "Exact variant where applicable" },
        { title: "Document scope", detail: "Product-wide or an exact batch, as stated" },
        { title: "Original document", detail: "Content, date and version" },
      ]
  return (
    <Figure
      {...props}
      compact={compact}
      title={fi ? "Mihin tieto liittyy?" : "What does the record apply to?"}
      caption={
        compact
          ? fi
            ? "Tarkista, koskeeko asiakirja tuotetta vai tiettyä erää. Yleinen menetelmäkuvaus ei ole erän mittaustulos."
            : "Check whether the document covers the product or a specific batch. General method guidance is not a batch result."
          : fi
            ? "Tuotespesifikaatio tai käyttöturvallisuustiedote voi koskea tuotetta tai useita tuoteversioita, jos asiakirjan soveltamisala kattaa ne. Eräkohtaisen analyysiraportin on vastattava täsmällistä tuotetta ja erää. Yleinen menetelmäkuvaus ei ole erän mittaustulos."
            : "A specification or safety data sheet may cover a product or several variants when its scope states this. A batch-specific analytical report must match the exact product and batch. A general method description is not a batch measurement result."
      }
    >
      <ol className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-3"}>
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              "relative rounded-lg border border-line bg-surface-2",
              compact ? "flex items-start gap-3 p-3" : "p-4",
            )}
          >
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-medium text-accent",
                !compact && "mb-3",
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{step.detail}</p>
            </div>
            {!compact && index < 2 ? (
              <ArrowRight
                className="absolute -right-3 top-5 z-10 hidden h-5 w-5 bg-surface text-ink-muted sm:block"
                aria-hidden
              />
            ) : !compact ? (
              <FileText className="absolute right-3 top-4 h-4 w-4 text-ink-muted" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </Figure>
  )
}
