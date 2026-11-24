/**
 * Dummy data for the Makro IDP prototype.
 * Mirrors the copy used in the Paper file "IDP V.2" so every screen reads the same story.
 */

export type Env = "dev" | "qa" | "prod"
export type Lifecycle =
  | "draft"
  | "review"
  | "approved"
  | "applying"
  | "verifying"
  | "live"
  | "failed"
  | "rejected"
export type Health = "ok" | "warn" | "fail" | "busy" | "idle"
export type ResourceType =
  | "kafka"
  | "postgres"
  | "secrets"
  | "network"
  | "monitoring"
  | "database"
  | "cache"
  | "bucket"
export type Logo =
  | "argocd"
  | "kubernetes"
  | "gitlab"
  | "vault"
  | "kafka"
  | "postgres"
  | "netbird"
  | "pulumi"
  | "datadog"
  | "okta"

export const me = {
  name: "Alex Chen",
  first: "Alex",
  handle: "alex.m",
  email: "alex.chen@makro.co.th",
  team: "team-orders",
  role: "Team lead",
  namespaces: ["commerce", "pricing", "inventory", "loyalty", "payments"],
}

export const namespaces = [
  { id: "commerce", name: "commerce", services: 12, role: "Team lead" },
  { id: "pricing", name: "pricing", services: 6, role: "Developer" },
  { id: "inventory", name: "inventory", services: 8, role: "Developer" },
  { id: "loyalty", name: "loyalty", services: 4, role: "Viewer" },
  { id: "payments", name: "payments", services: 6, role: "Developer" },
]

export type Resource = {
  id: string
  name: string
  type: ResourceType
  typeLabel: string
  logo: Logo
  status: Lifecycle | "health-fail" | "expiring"
  statusLabel: string
  detail: string
  env: Env
  spark: number[]
  meta: Record<string, string>
}

export type Service = {
  id: string
  name: string
  namespace: string
  host: string
  owner: string
  repo: string
  version: string
  pods: string
  deployed: string
  note?: { text: string; tone: "fail" | "busy" }
  envHealth: [Health, Health, Health] // dev, qa, prod
  logos: Logo[]
  resources: Resource[]
}

const spark = (seed: number, n = 16, base = 10, amp = 6) =>
  Array.from({ length: n }, (_, i) =>
    Math.max(1, Math.round(base + Math.sin(i * 0.9 + seed) * amp + ((i * seed) % 5) - 2)),
  )

export const orderServiceResources: Resource[] = [
  {
    id: "pg-prod-orders",
    name: "pg-prod-orders",
    type: "postgres",
    typeLabel: "Postgres",
    logo: "postgres",
    status: "health-fail",
    statusLabel: "Health check failing",
    detail: "shared · 3 services",
    env: "prod",
    spark: [9, 9, 10, 9, 8, 9, 7, 6, 5, 6, 4, 3, 3, 2, 3, 2],
    meta: {
      Engine: "PostgreSQL 15.6",
      Instance: "tencent-bkk · db.r6.large",
      Endpoint: "pg-prod-orders.internal:5432",
      Users: "order_svc_rw, reporting_ro",
      Rotation: "every 30 days · next in 6d",
    },
  },
  {
    id: "orders.created.v1",
    name: "orders.created.v1",
    type: "kafka",
    typeLabel: "Kafka topic",
    logo: "kafka",
    status: "live",
    statusLabel: "Live",
    detail: "12 partitions · producer",
    env: "prod",
    spark: spark(2),
    meta: {
      Cluster: "makro-prod-core",
      "Partitions · RF": "12 · 3",
      Retention: "7 days",
      Consumers: "fulfilment, loyalty-gateway",
    },
  },
  {
    id: "secrets-prod",
    name: "Secrets · prod",
    type: "secrets",
    typeLabel: "Secrets",
    logo: "vault",
    status: "expiring",
    statusLabel: "Expires in 3d",
    detail: "11 keys · SecretID",
    env: "prod",
    spark: spark(4, 16, 8, 2),
    meta: {
      Path: "kv/commerce/order-service/prod",
      Keys: "11",
      "SecretID expires": "in 3 days",
      Inherits: "commerce/shared",
    },
  },
  {
    id: "warehouse-api-443",
    name: "warehouse-api:443",
    type: "network",
    typeLabel: "Network access",
    logo: "netbird",
    status: "draft",
    statusLabel: "Draft",
    detail: "not submitted",
    env: "prod",
    spark: [],
    meta: {
      Destination: "warehouse-api.inventory.svc:443",
      Protocol: "TCP",
      Validity: "30 days",
      Group: "commerce-order-service",
    },
  },
  {
    id: "datadog",
    name: "Datadog",
    type: "monitoring",
    typeLabel: "Monitoring",
    logo: "datadog",
    status: "live",
    statusLabel: "Live",
    detail: "APM + logs",
    env: "prod",
    spark: spark(6),
    meta: { APM: "enabled", Logs: "enabled", Monitors: "4 · 0 alerting" },
  },
]

export const services: Service[] = [
  {
    id: "order-service",
    name: "order-service",
    namespace: "commerce",
    host: "api.makro.co.th/orders",
    owner: "team-orders",
    repo: "makro/order-service",
    version: "v2.3.6",
    pods: "3/3 pods",
    deployed: "deployed 2h ago",
    envHealth: ["ok", "ok", "busy"],
    logos: ["kubernetes", "postgres", "kafka", "vault"],
    resources: orderServiceResources,
  },
  {
    id: "cart-api",
    name: "cart-api",
    namespace: "commerce",
    host: "api.makro.co.th/cart",
    owner: "team-orders",
    repo: "makro/cart-api",
    version: "v1.14.0",
    pods: "2/3 pods",
    deployed: "deployed 40m ago",
    note: { text: "qa degraded · 40m", tone: "fail" },
    envHealth: ["ok", "fail", "ok"],
    logos: ["kubernetes", "vault"],
    resources: orderServiceResources.filter((r) => ["secrets", "monitoring"].includes(r.type)),
  },
  {
    id: "checkout-bff",
    name: "checkout-bff",
    namespace: "commerce",
    host: "api.makro.co.th/checkout",
    owner: "team-checkout",
    repo: "makro/checkout-bff",
    version: "v4.0.2",
    pods: "4/4 pods",
    deployed: "deployed yesterday",
    envHealth: ["ok", "ok", "ok"],
    logos: ["kubernetes", "kafka", "vault"],
    resources: orderServiceResources.filter((r) => ["kafka", "secrets", "monitoring"].includes(r.type)),
  },
  {
    id: "payment-gateway",
    name: "payment-gateway",
    namespace: "commerce",
    host: "api.makro.co.th/pay",
    owner: "team-payments",
    repo: "makro/payment-gateway",
    version: "v3.8.1",
    pods: "6/6 pods",
    deployed: "deployed 3d ago",
    envHealth: ["ok", "ok", "ok"],
    logos: ["kubernetes", "postgres", "vault"],
    resources: orderServiceResources.filter((r) => ["postgres", "secrets", "monitoring"].includes(r.type)),
  },
  {
    id: "promo-engine",
    name: "promo-engine",
    namespace: "commerce",
    host: "api.makro.co.th/promo",
    owner: "team-promo",
    repo: "makro/promo-engine",
    version: "v0.9.4",
    pods: "2/2 pods",
    deployed: "deploying to prod…",
    note: { text: "deploying to prod…", tone: "busy" },
    envHealth: ["ok", "ok", "busy"],
    logos: ["kubernetes", "vault"],
    resources: orderServiceResources.filter((r) => ["kafka", "monitoring"].includes(r.type)),
  },
  {
    id: "price-api",
    name: "price-api",
    namespace: "pricing",
    host: "api.makro.co.th/price",
    owner: "team-pricing",
    repo: "makro/price-api",
    version: "v5.2.0",
    pods: "3/3 pods",
    deployed: "deployed 5h ago",
    envHealth: ["ok", "busy", "ok"],
    logos: ["kubernetes", "postgres", "vault"],
    resources: [],
  },
]

export const getService = (id: string) => services.find((s) => s.id === id) ?? services[0]
export const getResource = (svc: Service, id: string) =>
  svc.resources.find((r) => r.id === decodeURIComponent(id)) ?? svc.resources[0]

/* ---------------- Inbox ---------------- */
export type InboxItem = {
  id: string
  kind: "kafka" | "infra" | "network" | "secret" | "postgres" | "service"
  logo: Logo
  title: string
  target: string
  env: Env
  by: string
  ns: string
  age: string
  ref: string
  note?: string
  file: string
  diff: string[]
  checks: { label: string; ok: boolean }[]
  mr: string
}

export const inbox: InboxItem[] = [
  {
    id: "TR-001041",
    kind: "kafka",
    logo: "kafka",
    title: "Create topic",
    target: "loyalty.points.redeemed.v1",
    env: "prod",
    by: "priya.s",
    ns: "loyalty",
    age: "2h",
    ref: "TR-001041",
    note: "Points redemption events for the new rewards flow.",
    file: "topics/prod/loyalty.points.redeemed.v1.yaml",
    diff: [
      "name: loyalty.points.redeemed.v1",
      "cluster: makro-prod-core",
      "partitions: 12",
      "replicationFactor: 3",
      "config:",
      "  retention.ms: 604800000   # 7 days",
      "  cleanup.policy: delete",
      "  min.insync.replicas: 2",
      "owner: team-loyalty",
    ],
    checks: [
      { label: "Naming policy", ok: true },
      { label: "Cluster capacity · 64 / 300 partitions", ok: true },
      { label: "No conflicting change", ok: true },
    ],
    mr: "!517",
  },
  {
    id: "IR-1042",
    kind: "infra",
    logo: "pulumi",
    title: "Add rds-postgres",
    target: "pricing/price-api",
    env: "qa",
    by: "nattaya.k",
    ns: "pricing",
    age: "4h",
    ref: "IR-1042",
    note: "Dedicated DB for price history.",
    file: "stacks/pricing/price-api/qa/Pulumi.yaml",
    diff: [
      "resources:",
      "  price-history-db:",
      "    type: makro:postgres",
      "    properties:",
      "      engine: postgres15",
      "      size: db.t4g.medium",
      "      storageGb: 50",
      "      backupDays: 7",
    ],
    checks: [
      { label: "Cost estimate · ฿4,200/mo", ok: true },
      { label: "Quota · 3 / 10 databases", ok: true },
      { label: "Pulumi preview · +3 to create", ok: true },
    ],
    mr: "!522",
  },
  {
    id: "NA-103",
    kind: "network",
    logo: "netbird",
    title: "Network access",
    target: "warehouse-api:443 · 30 days",
    env: "qa",
    by: "somchai.k",
    ns: "inventory",
    age: "1d",
    ref: "#103",
    note: "Stock sync needs to call the warehouse API.",
    file: "netbird/inventory/warehouse-api.yaml",
    diff: [
      "group: inventory-stock-sync",
      "destination: warehouse-api.inventory.svc",
      "ports: [443]",
      "protocol: tcp",
      "validFor: 30d",
    ],
    checks: [
      { label: "Destination exists", ok: true },
      { label: "Least privilege · single port", ok: true },
      { label: "Expires automatically", ok: true },
    ],
    mr: "!509",
  },
]

export const myRequests = [
  { id: "r1", title: "order-service → prod", status: "applying" as Lifecycle, step: 3, note: "MR merged · Argo syncing 2/3 pods · ~1 min" },
  { id: "r2", title: "Secret rotation · pricing/qa", status: "review" as Lifecycle, step: 2, note: "Waiting on pricing leads · 2 can approve" },
  { id: "r3", title: "Topic pos.transactions.v1", status: "failed" as Lifecycle, step: 4, note: "409 · reassignment in progress", action: "Retry apply" },
]

export const needsYou = [
  { id: "n1", tone: "warn" as const, text: ["Approve topic ", "loyalty.points.redeemed.v1", " · prod · priya.s"], action: "Review", href: "inbox" },
  { id: "n2", tone: "fail" as const, text: ["Apply failed on ", "pos.transactions.v1", " · 409, reassignment in progress"], action: "Retry", href: "activity" },
  { id: "n3", tone: "warn" as const, text: ["Network access to warehouse-api expires in 12 days"], action: "Renew", href: "network" },
]

/* ---------------- Deploys ---------------- */
export const deploys = [
  { id: "d1", version: "v2.3.6", env: "prod" as Env, by: "alex.m", when: "2h ago", status: "live" as Lifecycle, commit: "a91f3c2", msg: "feat: idempotent order create", duration: "3m 12s" },
  { id: "d2", version: "v2.3.6", env: "qa" as Env, by: "alex.m", when: "yesterday", status: "live" as Lifecycle, commit: "a91f3c2", msg: "feat: idempotent order create", duration: "2m 48s" },
  { id: "d3", version: "v2.3.5", env: "prod" as Env, by: "priya.s", when: "3d ago", status: "live" as Lifecycle, commit: "7be0d14", msg: "fix: retry on 409 from inventory", duration: "3m 02s" },
  { id: "d4", version: "v2.3.4", env: "prod" as Env, by: "somchai.k", when: "6d ago", status: "failed" as Lifecycle, commit: "1c22e9a", msg: "chore: bump kafka client", duration: "—" },
  { id: "d5", version: "v2.3.3", env: "prod" as Env, by: "alex.m", when: "9d ago", status: "live" as Lifecycle, commit: "f0e8a71", msg: "perf: batch outbox writes", duration: "3m 40s" },
]

/* ---------------- Activity / audit ---------------- */
export type ActivityEvent = {
  id: string
  when: string
  actor: string
  action: string
  target: string
  ns: string
  env: Env
  status: Lifecycle
  kind: ResourceType | "deploy" | "service"
}

export const activity: ActivityEvent[] = [
  { id: "ev-9812", when: "09:42", actor: "alex.m", action: "deployed", target: "order-service v2.3.6", ns: "commerce", env: "prod", status: "live", kind: "deploy" },
  { id: "ev-9811", when: "09:31", actor: "priya.s", action: "requested topic", target: "loyalty.points.redeemed.v1", ns: "loyalty", env: "prod", status: "review", kind: "kafka" },
  { id: "ev-9810", when: "09:18", actor: "system", action: "apply failed", target: "pos.transactions.v1", ns: "commerce", env: "prod", status: "failed", kind: "kafka" },
  { id: "ev-9809", when: "08:57", actor: "nattaya.k", action: "requested infra", target: "IR-1042 rds-postgres", ns: "pricing", env: "qa", status: "review", kind: "database" },
  { id: "ev-9808", when: "08:40", actor: "somchai.k", action: "requested access", target: "warehouse-api:443", ns: "inventory", env: "qa", status: "review", kind: "network" },
  { id: "ev-9807", when: "08:12", actor: "alex.m", action: "rotated secret", target: "pricing/qa SecretID", ns: "pricing", env: "qa", status: "applying", kind: "secrets" },
  { id: "ev-9806", when: "Yesterday", actor: "ploy.w", action: "scaled", target: "cart-api 3 → 5 pods", ns: "commerce", env: "qa", status: "live", kind: "service" },
  { id: "ev-9805", when: "Yesterday", actor: "alex.m", action: "approved", target: "pg user reporting_ro", ns: "commerce", env: "prod", status: "approved", kind: "postgres" },
  { id: "ev-9804", when: "Yesterday", actor: "kittipat.r", action: "rejected", target: "topic tmp.debug.v0", ns: "commerce", env: "dev", status: "rejected", kind: "kafka" },
  { id: "ev-9803", when: "2d ago", actor: "system", action: "verified", target: "checkout-bff v4.0.2", ns: "commerce", env: "prod", status: "verifying", kind: "deploy" },
]

/* ---------------- Platform overview (classic home) ---------------- */
export const overview = [
  { id: "deployments", icon: "rocket", label: "Deployments", value: 36, unit: "services", bar: [28, 3, 2, 3], legend: [["success", "28 live"], ["destructive", "2 degraded"]], alert: "cart-api qa degraded", tone: "fail" },
  { id: "kafka", icon: "radio", label: "Kafka topics", value: 48, unit: "topics · 3 clusters", bar: [44, 2, 1, 1], legend: [["warning", "2 in review"], ["destructive", "1 failed"]], alert: "TR-001035 apply failed", tone: "fail" },
  { id: "secrets", icon: "key", label: "Secrets", value: 10, unit: "projects · 312 keys", bar: [8, 2, 0, 0], legend: [["warning", "2 rotations due"]], alert: "SecretID expires in 3d", tone: "warn" },
  { id: "postgres", icon: "database", label: "DB & credentials", value: 20, unit: "users · bindings", bar: [15, 3, 0, 2], legend: [["warning", "3 pending"], ["destructive", "2 unhealthy"]], alert: "pg-prod-orders unreachable", tone: "fail" },
  { id: "network", icon: "shield", label: "Network access", value: 14, unit: "grants", bar: [10, 2, 1, 1], legend: [["warning", "2 expiring"], ["destructive", "1 failed"]], alert: "warehouse-api in 12d", tone: "warn" },
  { id: "infra", icon: "cloud", label: "Infrastructure", value: 22, unit: "stacks", bar: [19, 2, 0, 1], legend: [["info", "2 applying"], ["destructive", "1 stalled"]], alert: "replenish/dev stalled", tone: "fail" },
] as const

/* ---------------- Kafka ---------------- */
export const kafkaTopics = [
  { name: "orders.created.v1", cluster: "makro-prod-core", env: "prod" as Env, partitions: 12, rf: 3, retention: "7d", owner: "team-orders", status: "live" as Lifecycle, throughput: "1.2k/s" },
  { name: "orders.cancelled.v1", cluster: "makro-prod-core", env: "prod" as Env, partitions: 6, rf: 3, retention: "7d", owner: "team-orders", status: "live" as Lifecycle, throughput: "84/s" },
  { name: "loyalty.points.redeemed.v1", cluster: "makro-prod-core", env: "prod" as Env, partitions: 12, rf: 3, retention: "7d", owner: "team-loyalty", status: "review" as Lifecycle, throughput: "—" },
  { name: "pos.transactions.v1", cluster: "makro-prod-core", env: "prod" as Env, partitions: 24, rf: 3, retention: "14d", owner: "team-pos", status: "failed" as Lifecycle, throughput: "3.4k/s" },
  { name: "inventory.adjustments", cluster: "makro-prod-core", env: "prod" as Env, partitions: 8, rf: 3, retention: "3d", owner: "team-inventory", status: "live" as Lifecycle, throughput: "410/s" },
  { name: "pricing.updates", cluster: "makro-qa", env: "qa" as Env, partitions: 6, rf: 2, retention: "1d", owner: "team-pricing", status: "applying" as Lifecycle, throughput: "22/s" },
  { name: "payments.settled.v2", cluster: "makro-prod-core", env: "prod" as Env, partitions: 12, rf: 3, retention: "30d", owner: "team-payments", status: "live" as Lifecycle, throughput: "260/s" },
  { name: "cart.events.v1", cluster: "makro-dev", env: "dev" as Env, partitions: 3, rf: 1, retention: "1d", owner: "team-orders", status: "live" as Lifecycle, throughput: "12/s" },
]

export const kafkaUsers = [
  { name: "svc-order-service-prod", cluster: "makro-prod-core", env: "prod" as Env, team: "team-orders", status: "live" as Lifecycle, acls: 4, updated: "2d ago" },
  { name: "svc-fulfilment-prod", cluster: "makro-prod-core", env: "prod" as Env, team: "team-fulfilment", status: "live" as Lifecycle, acls: 3, updated: "5d ago" },
  { name: "svc-loyalty-gateway", cluster: "makro-prod-core", env: "prod" as Env, team: "team-loyalty", status: "review" as Lifecycle, acls: 2, updated: "2h ago" },
  { name: "svc-pricing-qa", cluster: "makro-qa", env: "qa" as Env, team: "team-pricing", status: "applying" as Lifecycle, acls: 2, updated: "12m ago" },
  { name: "svc-pos-ingest", cluster: "makro-prod-core", env: "prod" as Env, team: "team-pos", status: "failed" as Lifecycle, acls: 1, updated: "1h ago" },
]

export const kafkaAcls = [
  { principal: "svc-order-service-prod", resource: "TOPIC orders.created.v1", op: "WRITE", status: "live" as Lifecycle },
  { principal: "svc-fulfilment-prod", resource: "TOPIC orders.created.v1", op: "READ", status: "live" as Lifecycle },
  { principal: "svc-loyalty-gateway", resource: "TOPIC orders.created.v1", op: "READ", status: "review" as Lifecycle },
  { principal: "svc-fulfilment-prod", resource: "GROUP fulfilment-consumers", op: "READ", status: "live" as Lifecycle },
]

/* ---------------- Postgres ---------------- */
export const pgDatabases = [
  { name: "pg-prod-orders", engine: "PostgreSQL 15.6", region: "ap-bangkok", env: "prod" as Env, services: 3, users: 5, status: "failed" as Lifecycle, statusLabel: "Unreachable", rotated: "24d ago" },
  { name: "pg-prod-payments", engine: "PostgreSQL 15.6", region: "ap-bangkok", env: "prod" as Env, services: 2, users: 3, status: "live" as Lifecycle, statusLabel: "Healthy", rotated: "6d ago" },
  { name: "pg-qa-pricing", engine: "PostgreSQL 14.11", region: "ap-bangkok", env: "qa" as Env, services: 2, users: 4, status: "live" as Lifecycle, statusLabel: "Healthy", rotated: "12d ago" },
  { name: "pg-dev-shared", engine: "PostgreSQL 15.6", region: "ap-bangkok", env: "dev" as Env, services: 9, users: 14, status: "live" as Lifecycle, statusLabel: "Healthy", rotated: "Never" },
]

export const pgUsers = [
  { name: "order_svc_rw", tier: "Read-write", db: "orders", status: "live" as Lifecycle, rotated: "24d ago", vault: "commerce/order-service/prod · DB_PASSWORD" },
  { name: "reporting_ro", tier: "Read-only", db: "orders", status: "live" as Lifecycle, rotated: "6d ago", vault: "commerce/reporting/prod · PG_PASSWORD" },
  { name: "fulfilment_ro", tier: "Read-only", db: "orders", status: "review" as Lifecycle, rotated: "—", vault: "inventory/fulfilment/prod · ORDERS_PG" },
]

/* ---------------- Secrets ---------------- */
export const secretKeys = [
  { key: "DB_PASSWORD", value: "p9X!vQ2m#Lr8", updated: "24d ago", by: "system", inherited: false },
  { key: "DB_HOST", value: "pg-prod-orders.internal", updated: "3mo ago", by: "alex.m", inherited: false },
  { key: "KAFKA_SASL_USER", value: "svc-order-service-prod", updated: "2mo ago", by: "alex.m", inherited: false },
  { key: "KAFKA_SASL_PASSWORD", value: "Zk3#pW9vTq!x", updated: "2mo ago", by: "system", inherited: false },
  { key: "STRIPE_SECRET", value: "sk_live_••••", updated: "11d ago", by: "priya.s", inherited: false },
  { key: "DATADOG_API_KEY", value: "dd_7c1f…", updated: "6mo ago", by: "platform", inherited: true },
  { key: "SENTRY_DSN", value: "https://8a2…@sentry.makro", updated: "6mo ago", by: "platform", inherited: true },
  { key: "FEATURE_IDEMPOTENCY", value: "true", updated: "2h ago", by: "alex.m", inherited: false },
  { key: "REDIS_URL", value: "redis://cache-orders:6379", updated: "1mo ago", by: "alex.m", inherited: false },
  { key: "JWT_PUBLIC_KEY", value: "-----BEGIN PUBLIC KEY-----", updated: "4mo ago", by: "platform", inherited: true },
  { key: "LOG_LEVEL", value: "info", updated: "2mo ago", by: "alex.m", inherited: false },
]

export const secretProjects = [
  { name: "commerce-order-service", configs: 3, keys: 11, updated: "2h ago", tags: ["commerce"] },
  { name: "commerce-cart-api", configs: 3, keys: 8, updated: "1d ago", tags: ["commerce"] },
  { name: "pricing-price-api", configs: 3, keys: 14, updated: "3h ago", tags: ["pricing"] },
  { name: "inventory-stock-sync", configs: 2, keys: 6, updated: "5d ago", tags: ["inventory"] },
  { name: "payments-gateway", configs: 3, keys: 19, updated: "11d ago", tags: ["payments"] },
]

/* ---------------- Network ---------------- */
export const networkGrants = [
  { id: "na-1", dest: "warehouse-api:443", ns: "inventory", group: "inventory-stock-sync", env: "qa" as Env, status: "review" as Lifecycle, expires: "—", by: "somchai.k" },
  { id: "na-2", dest: "warehouse-api:443", ns: "commerce", group: "commerce-order-service", env: "prod" as Env, status: "live" as Lifecycle, expires: "in 12 days", by: "alex.m" },
  { id: "na-3", dest: "pg-prod-orders:5432", ns: "commerce", group: "commerce-leads", env: "prod" as Env, status: "live" as Lifecycle, expires: "in 3 days", by: "alex.m" },
  { id: "na-4", dest: "redis-cache:6379", ns: "pricing", group: "pricing-price-api", env: "qa" as Env, status: "applying" as Lifecycle, expires: "in 30 days", by: "nattaya.k" },
  { id: "na-5", dest: "erp-gateway:8443", ns: "payments", group: "payments-gateway", env: "prod" as Env, status: "failed" as Lifecycle, expires: "—", by: "kittipat.r" },
  { id: "na-6", dest: "legacy-pos:1521", ns: "commerce", group: "commerce-leads", env: "prod" as Env, status: "rejected" as Lifecycle, expires: "—", by: "ploy.w" },
]

export const networkGroups = [
  { name: "commerce-leads", members: 4, resources: 6, source: "IDP" },
  { name: "commerce-order-service", members: 2, resources: 3, source: "IDP" },
  { name: "inventory-stock-sync", members: 3, resources: 2, source: "IDP" },
  { name: "pricing-price-api", members: 2, resources: 2, source: "IDP" },
  { name: "platform-sre", members: 7, resources: 41, source: "Terraform" },
]

export const groupMembers = [
  { name: "Alex Chen", email: "alex.chen@makro.co.th", status: "active" },
  { name: "Priya Shah", email: "priya.s@makro.co.th", status: "active" },
  { name: "Somchai K.", email: "somchai.k@makro.co.th", status: "inactive" },
  { name: "Ploy W.", email: "ploy.w@makro.co.th", status: "active" },
]

/* ---------------- Infrastructure ---------------- */
export const stacks = [
  { id: "commerce-order-service-prod", ns: "commerce", service: "order-service", env: "prod" as Env, resources: 4, status: "live" as Lifecycle, updated: "2d ago" },
  { id: "commerce-cart-api-qa", ns: "commerce", service: "cart-api", env: "qa" as Env, resources: 2, status: "live" as Lifecycle, updated: "6d ago" },
  { id: "pricing-price-api-qa", ns: "pricing", service: "price-api", env: "qa" as Env, resources: 3, status: "review" as Lifecycle, updated: "4h ago" },
  { id: "inventory-replenish-dev", ns: "inventory", service: "replenish", env: "dev" as Env, resources: 2, status: "failed" as Lifecycle, updated: "1d ago" },
  { id: "payments-gateway-prod", ns: "payments", service: "payment-gateway", env: "prod" as Env, resources: 5, status: "applying" as Lifecycle, updated: "12m ago" },
]

export const infraRequests = [
  { id: "IR-1042", service: "pricing/price-api", env: "qa" as Env, change: "+ rds-postgres", status: "review" as Lifecycle, by: "nattaya.k", updated: "4h ago" },
  { id: "IR-1041", service: "payments/payment-gateway", env: "prod" as Env, change: "~ load balancer", status: "applying" as Lifecycle, by: "kittipat.r", updated: "12m ago" },
  { id: "IR-1040", service: "commerce/order-service", env: "prod" as Env, change: "+ redis cache", status: "verifying" as Lifecycle, by: "alex.m", updated: "1h ago" },
  { id: "IR-1039", service: "inventory/replenish", env: "dev" as Env, change: "+ s3 bucket", status: "failed" as Lifecycle, by: "somchai.k", updated: "1d ago" },
  { id: "IR-1038", service: "commerce/cart-api", env: "qa" as Env, change: "- old lb", status: "live" as Lifecycle, by: "ploy.w", updated: "6d ago" },
  { id: "IR-1037", service: "loyalty/points", env: "dev" as Env, change: "+ bucket", status: "rejected" as Lifecycle, by: "priya.s", updated: "7d ago" },
]

/* ---------------- Projects ---------------- */
export const projects = [
  { id: "commerce", name: "commerce", services: 12, members: 18, envs: ["dev", "qa", "prod"] as Env[], health: "2 issues", created: "Mar 2024" },
  { id: "pricing", name: "pricing", services: 6, members: 7, envs: ["dev", "qa", "prod"] as Env[], health: "Healthy", created: "Jun 2024" },
  { id: "inventory", name: "inventory", services: 8, members: 11, envs: ["dev", "qa", "prod"] as Env[], health: "1 stalled", created: "Jan 2024" },
  { id: "loyalty", name: "loyalty", services: 4, members: 5, envs: ["dev", "qa", "prod"] as Env[], health: "Healthy", created: "Aug 2025" },
  { id: "payments", name: "payments", services: 6, members: 9, envs: ["dev", "qa", "prod"] as Env[], health: "Healthy", created: "Feb 2024" },
]

/* ---------------- Notifications ---------------- */
export const notifications = [
  { id: "no1", tone: "warn", title: "priya.s requested approval", body: "Create topic loyalty.points.redeemed.v1 on prod", when: "2h" },
  { id: "no2", tone: "fail", title: "Apply failed", body: "pos.transactions.v1 · 409 reassignment in progress", when: "3h" },
  { id: "no3", tone: "ok", title: "order-service v2.3.6 is live on prod", body: "3/3 pods healthy · verified", when: "2h" },
  { id: "no4", tone: "info", title: "SecretID rotating", body: "pricing/qa · new SecretID issued", when: "5h" },
]

export const apiKeys = [
  { name: "order-ci-pipeline", scope: "secrets:read", ns: "commerce", created: "Oct 12", expires: "Jan 12", lastUsed: "4m ago", status: "active" },
  { name: "payments-gh-action", scope: "secrets:read", ns: "payments", created: "Oct 14", expires: "Jan 14", lastUsed: "2d ago", status: "active" },
  { name: "legacy-jenkins", scope: "secrets:read", ns: "platform", created: "Jul 26", expires: "Oct 26", lastUsed: "—", status: "revoked" },
]
