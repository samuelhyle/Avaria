import { cn } from "@/lib/utils/cn"

interface TestRowProps {
  test: string
  result: string
  method: string
  unit?: string
}

export function TestRow({ test, result, method, unit }: TestRowProps) {
  return (
    <tr className="hover:bg-surface-2/40">
      <td className="px-4 py-3 font-medium text-ink">{test}</td>
      <td className={cn("px-4 py-3 font-mono", unit ? "" : "")}>
        {result}
        {unit ? <span className="ml-1 text-ink-subtle">{unit}</span> : null}
      </td>
      <td className="px-4 py-3 text-ink-muted">{method}</td>
    </tr>
  )
}
