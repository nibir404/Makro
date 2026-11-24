"use client"

import { useMode } from "@/lib/mode"
import { CanvasHome, ClassicHome } from "@/components/screens/home"

export default function HomePage() {
  const mode = useMode()
  return mode === "canvas" ? <CanvasHome /> : <ClassicHome />
}
