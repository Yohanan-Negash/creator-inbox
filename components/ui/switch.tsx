"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-checked:bg-primary data-[checked]:bg-primary aria-checked:bg-primary border-input inline-flex h-5 w-9 shrink-0 items-center rounded-full border bg-background px-0.5 transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="border-border bg-background data-checked:translate-x-4 data-[checked]:translate-x-4 aria-checked:translate-x-4 block size-4 rounded-full border transition-transform"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
