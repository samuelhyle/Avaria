import { cn } from "@/lib/utils/cn"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: "default" | "wide" | "narrow"
}

export function Container({ children, className, size = "default" }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 lg:px-10",
        size === "default" && "max-w-[var(--container-page)]",
        size === "wide" && "max-w-[1600px]",
        size === "narrow" && "max-w-[var(--container-prose)]",
        className,
      )}
    >
      {children}
    </div>
  )
}
