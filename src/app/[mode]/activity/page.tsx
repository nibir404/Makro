"use client"

import { useMode } from "@/lib/mode"
import { ActivityOverview, ClassicActivity } from "@/components/screens/activity/activity"

export default function Page() {
  return useMode() === "canvas" ? <ActivityOverview /> : <ClassicActivity />
}
