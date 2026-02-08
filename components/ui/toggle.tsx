"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none border border-transparent text-xs font-medium outline-none transition-all select-none data-disabled:pointer-events-none data-disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "sm",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
