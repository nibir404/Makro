"use client"

import { useMode } from "@/lib/mode"
import { CanvasServices, ClassicServices } from "@/components/screens/service/list"

export default function ServicesPage() {
  return useMode() === "canvas" ? <CanvasServices /> : <ClassicServices />
}
