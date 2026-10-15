import { Container } from "@/components/ui/Container"
export default function Loading() {
  return (
    <Container className="py-8 sm:py-12">
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="h-10 w-2/3 max-w-md rounded-lg bg-surface-3" />
        <div className="h-5 w-full max-w-xl rounded bg-surface-2" />
        <div className="h-20 rounded-xl border border-line bg-surface" />
        <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
          <div className="hidden h-96 rounded-xl bg-surface-2 lg:block" />
          <div className="space-y-3">
            {["one", "two", "three", "four", "five", "six"].map((key) => (
              <div
                key={key}
                className="flex min-h-28 items-center gap-4 rounded-xl border border-line bg-surface p-4"
              >
                <div className="h-16 w-12 shrink-0 rounded-lg bg-surface-2" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-5 w-2/3 max-w-xs rounded bg-surface-3" />
                  <div className="h-4 w-1/2 max-w-40 rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  )
}
