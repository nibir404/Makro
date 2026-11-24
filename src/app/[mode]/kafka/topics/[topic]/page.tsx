"use client"

import { Suspense } from "react"
import { KafkaTopicDetail } from "@/components/screens/kafka/topic"

export default function Page() {
  return (
    <Suspense>
      <KafkaTopicDetail />
    </Suspense>
  )
}
