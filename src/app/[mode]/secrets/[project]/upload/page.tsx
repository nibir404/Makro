"use client"

import { Suspense } from "react"
import { UploadScreen } from "@/components/screens/secrets/pages"

export default function Page() {
  return (
    <Suspense>
      <UploadScreen />
    </Suspense>
  )
}
