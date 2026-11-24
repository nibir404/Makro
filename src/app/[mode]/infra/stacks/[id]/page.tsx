"use client"
import { Suspense } from "react"
import { useParams } from "next/navigation"
import { StackDetail } from "@/components/screens/infra/infra"
function Inner() {
  const { id } = useParams<{ id: string }>()
  return <StackDetail id={id} />
}
export default function Page() {
  return <Suspense><Inner /></Suspense>
}
