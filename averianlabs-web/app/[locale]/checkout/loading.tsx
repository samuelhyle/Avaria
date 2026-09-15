import { Container } from "@/components/ui/Container"

export default function CheckoutLoading() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        {/* Step indicator skeleton */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-surface-2 animate-pulse" />
              {i < 3 && <div className="h-px w-12 bg-line" />}
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 animate-pulse" />
          <div className="mt-4 h-8 w-48 rounded bg-surface-2 animate-pulse" />
          <div className="mt-6 space-y-4">
            <div className="h-11 w-full rounded-[var(--radius)] bg-surface-2 animate-pulse" />
            <div className="h-11 w-full rounded-[var(--radius)] bg-surface-2 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 rounded-[var(--radius)] bg-surface-2 animate-pulse" />
              <div className="h-11 rounded-[var(--radius)] bg-surface-2 animate-pulse" />
            </div>
            <div className="h-11 w-full rounded-[var(--radius)] bg-surface-2 animate-pulse" />
            <div className="h-12 w-full rounded-[var(--radius)] bg-accent/30 animate-pulse" />
          </div>
        </div>
      </div>
    </Container>
  )
}
