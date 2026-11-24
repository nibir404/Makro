"use client"

import { Suspense } from "react"
import { PgOverview } from "@/components/screens/postgres/postgres"

export default function Page() {
  return (
    <Suspense>
      <PgOverview />
    </Suspense>
  )
}
