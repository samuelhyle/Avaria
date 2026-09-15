import { Container } from "@/components/ui/Container"

export default function AccountLoading() {
  return (
    <Container className="py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar skeleton */}
        <div className="space-y-3">
          <div className="h-10 w-full rounded-[var(--radius)] bg-surface-2 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-full rounded-[var(--radius-sm)] bg-surface-2 animate-pulse"
            />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-surface-2 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
                <div className="h-5 w-24 rounded bg-surface-2 animate-pulse" />
                <div className="mt-2 h-8 w-16 rounded bg-surface-2 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <div className="h-6 w-32 rounded bg-surface-2 animate-pulse" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-full rounded-[var(--radius)] bg-surface-2 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
