"use client"
import { Suspense } from "react"
import { ProjectsList } from "@/components/screens/projects/projects"
export default function Page() {
  return <Suspense><ProjectsList /></Suspense>
}
