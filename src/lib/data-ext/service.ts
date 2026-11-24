/** Extra dummy data for the service page, resource states and inspectors. */
import type { Lifecycle } from "@/lib/data"

export const kafkaRetention = ["1d", "3d", "7d", "14d", "30d"] as const

export const kafkaAclRows = [
  { principal: "svc-order-service-prod", op: "WRITE", kind: "Producer", status: "live" as Lifecycle },
  { principal: "svc-fulfilment-prod", op: "READ", kind: "Consumer · fulfilment-consumers", status: "live" as Lifecycle },
  { principal: "svc-loyalty-gateway", op: "READ", kind: "Consumer · loyalty-gw", status: "review" as Lifecycle },
]

export const kafkaHistory = [
  { when: "2h ago", who: "alex.m", what: "Requested retention 7d → 14d", status: "review" as Lifecycle, ref: "TR-001052" },
  { when: "3d ago", who: "priya.s", what: "Granted READ to svc-loyalty-gateway", status: "live" as Lifecycle, ref: "TR-001038" },
  { when: "12d ago", who: "alex.m", what: "Partitions 6 → 12", status: "live" as Lifecycle, ref: "TR-001011" },
  { when: "Mar 14", who: "system", what: "Apply failed · 409 reassignment", status: "failed" as Lifecycle, ref: "TR-000987" },
  { when: "Mar 2", who: "alex.m", what: "Created topic", status: "live" as Lifecycle, ref: "TR-000950" },
]

export const pgConnection = {
  Instance: "postgres-prodban0x000",
  "Database · schema": "orders · public",
  Role: "order_service_app",
  Password: "•••••••• v8 · 34d old",
  "Injected as": "DB_PASSWORD",
  conn: "postgres://order_service_app@…:5432/orders",
}

export const pgCredentials = [
  { version: "v8", role: "order_service_app", created: "34d ago", by: "system", state: "current" },
  { version: "v7", role: "order_service_app", created: "64d ago", by: "system", state: "expired" },
  { version: "v6", role: "order_service_app", created: "94d ago", by: "alex.m", state: "expired" },
]

export const rotateSteps = [
  { title: "Create v9 alongside v8", sub: "both work for 24h" },
  { title: "Update DB_PASSWORD in Secrets · prod", sub: "restarting 3 pods" },
  { title: "Verify connections on v9", sub: "" },
  { title: "Expire v8 after 24h", sub: "roll back any time before" },
]

export const networkDetail = {
  Destination: "10.30.8.40 : 443",
  Protocol: "tcp",
  Group: "commerce-order-service",
  "Routing peer": "rp-bkk-02 · online",
}

export const resourceHistory = [
  { when: "2h ago", who: "alex.m", what: "Viewed credentials", status: "live" as Lifecycle },
  { when: "24d ago", who: "system", what: "Rotated password v7 → v8", status: "live" as Lifecycle },
  { when: "2mo ago", who: "alex.m", what: "Bound to order-service", status: "live" as Lifecycle },
]
