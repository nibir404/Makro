"use client"

import { Suspense } from "react"
import { PgDbDetail } from "@/components/screens/postgres/postgres"

export default function Page() {
  return (
    <Suspense>
      <PgDbDetail />
    </Suspense>
  )
}
