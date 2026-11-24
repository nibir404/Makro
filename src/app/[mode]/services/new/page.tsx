"use client"

import { Suspense } from "react"
import { NewService } from "@/components/screens/new-service"

export default function NewServicePage() {
  return (
    <Suspense>
      <NewService />
    </Suspense>
  )
}
