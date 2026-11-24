"use client"

import { useParams } from "next/navigation"
import { notFound } from "next/navigation"
import { AddForm } from "@/components/screens/add-resource"
import { ADD_TYPES, type AddType } from "@/lib/data-ext/add-resource"

export default function AddResourceTypePage() {
  const { type } = useParams<{ type: string }>()
  if (!ADD_TYPES.includes(type as AddType)) notFound()
  return <AddForm type={type as AddType} />
}
