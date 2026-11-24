"use client"

import { Suspense } from "react"
import { SecretsEditor } from "@/components/screens/secrets/editor"

export default function Page() {
  return (
    <Suspense>
      <SecretsEditor />
    </Suspense>
  )
}
