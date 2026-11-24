/* Platform-level Kafka & Postgres data (frames 16a/16b/16c, C4d/C4e, C16a-c). */
import type { Env, Health, Lifecycle } from "@/lib/data"

export type TopicHealth = "acl" | "healthy" | "review" | "lag" | "orphaned"
export const TOPIC_HEALTH: Record<TopicHealth, { label: string; tone: Health; cls: string }> = {
  acl: { label: "1 ACL failing", tone: "fail", cls: "text-destructive" },
  healthy: { label: "healthy", tone: "ok", cls: "text-success" },
  review: { label: "in review", tone: "warn", cls: "text-warning" },
  lag: { label: "consumer lag", tone: "warn", cls: "text-warning" },
  orphaned: { label: "orphaned", tone: "idle", cls: "text-subtle" },
}

export type Topic = {
  name: string
  owner: string
  cluster: "prod-core" | "prod-edge" | "qa"
  env: Env
  partitions: number
  rf: number
  /** base msg/s used to seed the live sparkline; 0 = no traffic */
  rate: number
  trend?: "up" | "flat"
  consumers: number
  lag?: string
  note?: string
  health: TopicHealth
  retention: string
  schema: string
}

export const topics: Topic[] = [
  { name: "orders.created.v1", owner: "team-orders", cluster: "prod-core", env: "prod", partitions: 12, rf: 3, rate: 2100, consumers: 3, health: "acl", retention: "7d", schema: "orders.OrderCreated v4" },
  { name: "payments.captured.v2", owner: "team-payments", cluster: "prod-core", env: "prod", partitions: 24, rf: 3, rate: 640, consumers: 5, health: "healthy", retention: "30d", schema: "payments.Captured v2" },
  { name: "loyalty.points.redeemed.v1", owner: "team-loyalty", cluster: "prod-core", env: "prod", partitions: 12, rf: 3, rate: 0, consumers: 0, note: "not created yet", health: "review", retention: "7d", schema: "loyalty.Redeemed v1" },
  { name: "inventory.adjusted.v3", owner: "team-ops", cluster: "prod-core", env: "prod", partitions: 6, rf: 3, rate: 1300, trend: "up", consumers: 2, lag: "41k", health: "lag", retention: "3d", schema: "inventory.Adjusted v3" },
  { name: "legacy.erp.sync.v1", owner: "no owner", cluster: "prod-core", env: "prod", partitions: 3, rf: 2, rate: 0, consumers: 0, note: "idle 90 days", health: "orphaned", retention: "14d", schema: "—" },
  { name: "pos.transactions.v1", owner: "team-pos", cluster: "prod-edge", env: "prod", partitions: 24, rf: 3, rate: 6400, consumers: 4, health: "healthy", retention: "14d", schema: "pos.Transaction v7" },
  { name: "pricing.updates", owner: "team-pricing", cluster: "qa", env: "qa", partitions: 6, rf: 2, rate: 22, consumers: 1, health: "healthy", retention: "1d", schema: "pricing.Update v2" },
  { name: "cart.events.v1", owner: "team-orders", cluster: "qa", env: "qa", partitions: 3, rf: 2, rate: 12, consumers: 1, health: "healthy", retention: "1d", schema: "cart.Event v1" },
]

/** C4d classic cluster view rows */
export const clusterTopics = [
  { name: "orders.created.v1", owner: "team-orders", prf: "12 · 3", tput: "2.1k/s", status: "Live", tone: "ok" as Health },
  { name: "pos.transactions.v1", owner: "team-pos", prf: "24 · 3", tput: "6.4k/s", status: "Lag rising", tone: "warn" as Health },
  { name: "payments.settled.v1", owner: "team-pay", prf: "6 · 3", tput: "640/s", status: "Live", tone: "ok" as Health },
  { name: "loyalty.points.redeemed.v1", owner: "team-crm", prf: "12 · 3", tput: "—", status: "In review", tone: "busy" as Health },
  { name: "inventory.adjusted.v2", owner: "team-warehouse", prf: "12 · 3", tput: "1.3k/s", status: "Live", tone: "ok" as Health },
]

export const topicConsumers = [
  { group: "fulfilment-consumers", user: "svc-fulfilment-prod", lag: [120, 140, 90, 200, 160, 110, 130, 95, 80, 120, 100, 90], members: 4, state: "Stable" },
  { group: "analytics-etl", user: "svc-analytics-etl", lag: [800, 1200, 2100, 3400, 5200, 8100, 12000, 18000, 24000, 31000, 36000, 41000], members: 2, state: "Lagging" },
  { group: "notifications", user: "svc-notify", lag: [10, 12, 8, 14, 9, 11, 7, 10, 12, 9, 8, 10], members: 2, state: "Stable" },
]

export const topicAcls = [
  { principal: "svc-order-service", op: "WRITE", resource: "TOPIC orders.created.v1", status: "live" as Lifecycle },
  { principal: "svc-fulfil-v2", op: "READ", resource: "TOPIC orders.created.v1", status: "failed" as Lifecycle },
  { principal: "svc-analytics-etl", op: "READ", resource: "TOPIC orders.created.v1", status: "live" as Lifecycle },
  { principal: "svc-analytics-etl", op: "READ", resource: "GROUP analytics-etl", status: "live" as Lifecycle },
]

export const topicConfig = [
  ["cleanup.policy", "delete"],
  ["retention.ms", "604800000 (7d)"],
  ["min.insync.replicas", "2"],
  ["max.message.bytes", "1048576"],
  ["compression.type", "zstd"],
  ["segment.ms", "86400000"],
] as const

export type KUser = {
  name: string
  service: string
  acls: number
  aclFailed?: boolean
  /** days since last rotation; null = not created in broker */
  age: number | null
}
export const kUsers: KUser[] = [
  { name: "svc-order-service", service: "order-service", acls: 4, age: 21 },
  { name: "svc-fulfil-v2", service: "fulfilment", acls: 0, aclFailed: true, age: null },
  { name: "svc-analytics-etl", service: "analytics", acls: 9, age: 94 },
  { name: "svc-loyalty-gw", service: "loyalty-gateway", acls: 2, age: 60 },
]
export const ROTATE_DAYS = 90

/* ---------------- Postgres ---------------- */
export type PgHealth = "failing" | "healthy" | "provisioning"
export type PgDb = {
  name: string
  project: string
  env: Env
  engine: string
  users: number
  pwAge: number
  conns: [number, number] | null
  storage: string
  health: PgHealth
}
export const PW_MAX = 45
export const pgDbs: PgDb[] = [
  { name: "pg-prod-orders", project: "commerce", env: "prod", engine: "PG 15.4", users: 3, pwAge: 34, conns: [182, 400], storage: "412 GB", health: "failing" },
  { name: "pg-prod-payments", project: "payments", env: "prod", engine: "PG 15.4", users: 5, pwAge: 12, conns: [64, 200], storage: "88 GB", health: "healthy" },
  { name: "pg-qa-pricing", project: "pricing", env: "qa", engine: "PG 15.4", users: 2, pwAge: 51, conns: [40, 200], storage: "56 GB", health: "healthy" },
  { name: "pg-prod-loyalty", project: "loyalty", env: "prod", engine: "PG 14.9", users: 4, pwAge: 8, conns: [120, 300], storage: "230 GB", health: "healthy" },
  { name: "pg-prod-pricing", project: "pricing", env: "prod", engine: "PG 15.4", users: 3, pwAge: 20, conns: [64, 200], storage: "88 GB", health: "healthy" },
  { name: "pg-qa-shared", project: "platform", env: "qa", engine: "PG 15.4", users: 9, pwAge: 3, conns: [40, 200], storage: "56 GB", health: "healthy" },
  { name: "orders-archive-db", project: "commerce", env: "prod", engine: "PG 15.4", users: 0, pwAge: 0, conns: null, storage: "—", health: "provisioning" },
]
/** C4e classic overview shows these five */
export const c4eDbs = ["pg-prod-orders", "pg-prod-pricing", "pg-prod-loyalty", "pg-qa-shared", "orders-archive-db"]

export const pgDbUsers = [
  { name: "order_svc_rw", db: "pg-prod-orders", tier: "Read-write", service: "order-service", age: 34, vault: "commerce/order-service/prod · DB_PASSWORD" },
  { name: "reporting_ro", db: "pg-prod-orders", tier: "Read-only", service: "reporting", age: 6, vault: "commerce/reporting/prod · PG_PASSWORD" },
  { name: "fulfilment_ro", db: "pg-prod-orders", tier: "Read-only", service: "fulfilment", age: 12, vault: "inventory/fulfilment/prod · ORDERS_PG" },
  { name: "payments_rw", db: "pg-prod-payments", tier: "Read-write", service: "payment-service", age: 12, vault: "payments/payment-service/prod · DB_PASSWORD" },
  { name: "pricing_rw", db: "pg-qa-pricing", tier: "Read-write", service: "price-api", age: 51, vault: "pricing/price-api/qa · DB_PASSWORD" },
]
export const pgBindings = [
  { service: "order-service", db: "pg-prod-orders", user: "order_svc_rw", secret: "DB_PASSWORD", synced: "2m ago" },
  { service: "reporting", db: "pg-prod-orders", user: "reporting_ro", secret: "PG_PASSWORD", synced: "1h ago" },
  { service: "fulfilment", db: "pg-prod-orders", user: "fulfilment_ro", secret: "ORDERS_PG", synced: "4h ago" },
  { service: "payment-service", db: "pg-prod-payments", user: "payments_rw", secret: "DB_PASSWORD", synced: "5m ago" },
]
export const pgRotations = [
  { when: "Today 09:12", db: "pg-prod-payments", user: "payments_rw", by: "system", ok: true },
  { when: "Yesterday", db: "pg-prod-orders", user: "reporting_ro", by: "alex.m", ok: true },
  { when: "3d ago", db: "pg-qa-pricing", user: "pricing_rw", by: "system", ok: false },
  { when: "6d ago", db: "pg-prod-loyalty", user: "loyalty_rw", by: "system", ok: true },
]
