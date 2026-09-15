import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-4 h-10 w-80" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => i).map((id) => (
          <div
            key={id}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface"
          >
            <Skeleton className="aspect-[16/9] rounded-none" />
            <div className="space-y-2 p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}
