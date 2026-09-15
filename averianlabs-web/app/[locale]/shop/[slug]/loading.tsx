import { Container } from "@/components/ui/Container"

export default function ProductLoading() {
  return (
    <Container className="py-12">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-4 w-16 rounded bg-surface-2 animate-pulse" />
            {i < 3 && <div className="h-3 w-3 rounded bg-surface-2 animate-pulse" />}
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
        {/* Gallery skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 aspect-square rounded-[var(--radius-xl)] bg-surface-2 animate-pulse" />
          <div className="aspect-square rounded-[var(--radius-lg)] bg-surface-2 animate-pulse" />
          <div className="aspect-square rounded-[var(--radius-lg)] bg-surface-2 animate-pulse" />
        </div>

        {/* Details skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />
          <div className="h-10 w-64 rounded bg-surface-2 animate-pulse" />
          <div className="h-5 w-80 rounded bg-surface-2 animate-pulse" />
          <div className="h-8 w-32 rounded bg-surface-2 animate-pulse" />
          <div className="h-6 w-28 rounded-full bg-surface-2 animate-pulse" />
          <div className="h-48 w-full rounded-[var(--radius-lg)] bg-surface-2 animate-pulse" />
          <div className="h-20 w-full rounded-[var(--radius-lg)] bg-surface-2 animate-pulse" />
        </div>
      </div>
    </Container>
  )
}
