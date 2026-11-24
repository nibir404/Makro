import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page text-center">
      <span className="font-mono text-[56px] font-medium text-foreground">404</span>
      <span className="text-[16px] text-foreground">This page doesn&apos;t exist, or you can&apos;t see it</span>
      <Link href="/canvas" className="mt-3 rounded-[10px] border border-line-3 px-3.5 py-2 text-[13px] text-foreground hover:bg-surface-2">Go home</Link>
    </main>
  )
}
