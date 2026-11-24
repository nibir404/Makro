import { notFound } from "next/navigation"

/** Any unknown path inside a mode renders the in-shell 404 (09e). */
export default function Missing() {
  notFound()
}
