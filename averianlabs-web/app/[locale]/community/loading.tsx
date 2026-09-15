import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-4 h-10 w-72" />
      <Skeleton className="mt-2 h-4 w-96" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => i).map((id) => (
          <div key={id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="mt-4 h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-4/5" />
          </div>
        ))}
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 4 }, (_, i) => i).map((id) => (
          <Skeleton key={id} className="h-16 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </Container>
  )
}
