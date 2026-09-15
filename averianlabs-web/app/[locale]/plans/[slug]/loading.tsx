import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-56 rounded-full" />
      <Skeleton className="mt-4 h-9 w-72" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }, (_, i) => i).map((id) => (
          <div key={id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <Skeleton className="h-5 w-1/3" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}
