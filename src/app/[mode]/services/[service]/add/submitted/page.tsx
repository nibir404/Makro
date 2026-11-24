"use client"

import { Suspense } from "react"
import { AddSubmitted } from "@/components/screens/add-resource"

export default function AddSubmittedPage() {
  return (
    <Suspense>
      <AddSubmitted />
    </Suspense>
  )
}
