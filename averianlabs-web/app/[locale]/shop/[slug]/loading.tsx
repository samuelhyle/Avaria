import { Container } from "@/components/ui/Container"
export default function ProductLoading() {
  return (
    <Container className="py-8 sm:py-12">
      <div aria-hidden="true" className="animate-pulse">
        <div className="mb-6 h-4 w-3/4 max-w-sm rounded bg-surface-2" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="order-2 aspect-[4/3] rounded-xl border border-line bg-surface-2 lg:order-1" />
          <div className="order-1 min-w-0 space-y-6 lg:order-2">
            <div className="h-5 w-1/3 rounded bg-surface-2" />
            <div className="h-10 w-2/3 rounded bg-surface-3" />
            <div className="h-12 w-full rounded bg-surface-2" />
            <div className="flex gap-3">
              <div className="h-20 w-28 rounded-lg bg-surface-2" />
              <div className="h-20 w-28 rounded-lg bg-surface-2" />
            </div>
            <div className="h-12 w-full rounded-lg bg-surface-3" />
            <div className="h-5 w-3/4 rounded bg-surface-2" />
          </div>
        </div>
        <div className="mt-10 h-40 rounded-xl border border-line bg-surface" />
      </div>
    </Container>
  )
}
