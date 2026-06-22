import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-slate-200 placeholder:text-slate-400 focus-visible:border-violet-300 focus-visible:ring-violet-100 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:border-neutral-800 dark:bg-neutral-950 dark:focus-visible:border-violet-700 dark:focus-visible:ring-violet-950 flex field-sizing-content min-h-16 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[4px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
