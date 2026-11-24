"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { HomeStates } from "@/components/screens/shell-states/pages"

function Inner() {
  return <HomeStates state={useSearchParams().get("state") ?? "new-user"} />
}
export default function Page() {
  return <Suspense><Inner /></Suspense>
}
