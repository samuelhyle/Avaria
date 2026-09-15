import { Container } from "@/components/ui/Container"

export default function Loading() {
  return (
    <Container className="py-12">
      <div className="shimmer h-8 w-32 rounded-full" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="shimmer aspect-[4/5] rounded-[var(--radius-lg)]" />
            <div className="shimmer h-5 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </Container>
  )
}
