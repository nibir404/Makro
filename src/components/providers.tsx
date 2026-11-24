"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem value={{ dark: "dark", light: "light" }} disableTransitionOnChange>
      <TooltipProvider delay={200}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!bg-popover !border-line-3 !text-foreground !rounded-[12px] !shadow-2xl",
              description: "!text-subtle",
              actionButton: "!bg-primary !text-primary-foreground",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  )
}
