import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-48 rounded-full" />
      <Skeleton className="mt-4 h-10 w-72" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 7 }, (_, i) => i).map((id) => (
          <div
            key={id}
            className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
          >
            <Skeleton className="h-10 w-10 rounded-[var(--radius)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Container>
  )
}
