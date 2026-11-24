"use client"
import { Suspense } from "react"
import { useParams } from "next/navigation"
import { PlanReview } from "@/components/screens/infra/infra"
function Inner() {
  const { id } = useParams<{ id: string }>()
  return <PlanReview id={id} />
}
export default function Page() {
  return <Suspense><Inner /></Suspense>
}
