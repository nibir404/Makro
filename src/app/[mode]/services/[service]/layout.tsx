import { Suspense } from "react"
import { ServiceFrame } from "@/components/screens/service/frame"
import { ServiceOpsHost } from "@/components/screens/service/ops"

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ mode: string; service: string }>
}) {
  const { service } = await params
  return (
    <ServiceFrame service={service}>
      {children}
      <Suspense>
        <ServiceOpsHost service={service} />
      </Suspense>
    </ServiceFrame>
  )
}
