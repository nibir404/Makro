"use client"

import { Suspense } from "react"
import { PgAllDatabases } from "@/components/screens/postgres/postgres"

export default function Page() {
  return (
    <Suspense>
      <PgAllDatabases />
    </Suspense>
  )
}
