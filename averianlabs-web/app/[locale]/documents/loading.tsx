import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-8 sm:py-12">
      <Skeleton className="h-10 w-full max-w-72" />
      <Skeleton className="mt-4 h-12 w-full max-w-2xl" />
      <div className="mt-8 grid gap-4 rounded-xl border border-line p-5 sm:grid-cols-2 lg:grid-cols-3">
        {["search", "product", "sku", "batch", "type"].map((field) => (
          <Skeleton key={field} className="h-16 w-full" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 7 }, (_, i) => i).map((id) => (
          <div
            key={id}
            className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
          >
            <Skeleton className="h-10 w-10 rounded-[var(--radius)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Container>
  )
}
