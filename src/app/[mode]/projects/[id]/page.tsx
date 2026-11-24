"use client"
import { Suspense } from "react"
import { useParams } from "next/navigation"
import { ProjectOverview } from "@/components/screens/projects/projects"
function Inner() {
  const { id } = useParams<{ id: string }>()
  return <ProjectOverview id={id} />
}
export default function Page() {
  return <Suspense><Inner /></Suspense>
}
