import { Container } from "@/components/ui/Container"
import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <Container className="py-10">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-2/3 max-w-xl" />
      <div className="mt-2 flex gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-8 space-y-4">
        {Array.from({ length: 5 }, (_, i) => i).map((id) => (
          <div key={id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Container>
  )
}
