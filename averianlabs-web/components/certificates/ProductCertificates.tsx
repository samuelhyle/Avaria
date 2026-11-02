import { CertificateCard } from "@/components/certificates/CertificateCard"
import type { BatchCertificate } from "@/lib/certificates/types"

/**
 * The published certificates for one product.
 *
 * A certificate belongs to a lot, so the list is ordered the way a researcher
 * reads it: the newest lot first. The size in front of the reader is marked,
 * because the lot they can order is the lot for the size they have selected.
 */
export function ProductCertificates({
  certificates,
  locale,
  selectedSku,
}: {
  certificates: BatchCertificate[]
  locale: string
  selectedSku: string
}) {
  if (!certificates.length) return null
  const ordered = [...certificates].sort(
    (a, b) => new Date(b.manufacturedAt).getTime() - new Date(a.manufacturedAt).getTime(),
  )
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {ordered.map((certificate) => (
        <li key={certificate.batchId} className="min-w-0">
          <div className={certificate.sku === selectedSku ? "" : "opacity-80"}>
            <CertificateCard certificate={certificate} locale={locale} showProduct={false} />
          </div>
        </li>
      ))}
    </ul>
  )
}
