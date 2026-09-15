import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-44 rounded-full" />
      <Skeleton className="mt-4 h-10 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((id) => (
          <div
            key={id}
            className="space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
          >
            <Skeleton className="aspect-square rounded-[var(--radius)]" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </Container>
  )
}
