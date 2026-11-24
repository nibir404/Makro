"use client"

import { Suspense } from "react"
import { GroupsScreen } from "@/components/screens/network/groups"

export default function Page() {
  return (
    <Suspense>
      <GroupsScreen />
    </Suspense>
  )
}
