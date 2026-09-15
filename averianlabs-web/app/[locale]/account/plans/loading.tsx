import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-52 rounded-full" />
      <Skeleton className="mt-4 h-9 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => i).map((id) => (
          <div
            key={id}
            className="space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-2 h-8 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </Container>
  )
}
