/* Extra dummy data for Network access (NetBird) and Secrets (Vault) screens. */

export type GrantState = "expiring" | "active" | "pending" | "failed" | "expired"

export type Grant = {
  id: string
  dest: string
  addr: string
  proto?: string
  group: string
  state: GrantState
  label: string
  sub?: string
  /** 0..1 remaining time */
  left?: number
  action: string
}

export const grants: Grant[] = [
  { id: "warehouse-api", dest: "warehouse-api", addr: "10.30.8.40:443", proto: "tcp", group: "commerce-order", state: "expiring", label: "Expiring · 3 days", left: 0.1, action: "Renew 30d" },
  { id: "pg-prod-orders", dest: "pg-prod-orders", addr: "10.30.2.11:5432", proto: "tcp", group: "dba-readonly", state: "active", label: "Active · 22 days", left: 0.73, action: "…" },
  { id: "grafana-internal", dest: "grafana-internal", addr: "10.30.5.2:3000", proto: "tcp", group: "observability", state: "active", label: "Active · permanent", action: "…" },
  { id: "kafka-prod-core", dest: "kafka-prod-core", addr: "10.30.7.0/28:9093", group: "kafka-admins", state: "pending", label: "Pending · Priya", sub: "requested 2h ago", action: "Withdraw" },
  { id: "redis-cache-qa", dest: "redis-cache-qa", addr: "10.40.1.9:6379", proto: "tcp", group: "commerce-order", state: "failed", label: "Failed · routing peer offline", sub: "rp-bkk-03 · 40m", action: "Retry" },
  { id: "legacy-erp", dest: "legacy-erp", addr: "10.10.0.4:1433", proto: "tcp", group: "erp-users", state: "expired", label: "Expired · Nov 2", action: "Request again" },
]

/** Classic C4b "My access" table */
export const myAccess = [
  { id: "warehouse-api", host: "warehouse-api.internal:443", who: "order-service", approver: "team-warehouse", expires: "in 12 days", expTone: "warn", status: "Active", tone: "ok" },
  { id: "pg-prod-orders", host: "pg-prod-orders:5432", who: "Alex (debug)", approver: "team-orders", expires: "in 6 hours", expTone: "", status: "Active", tone: "ok" },
  { id: "inventory-api", host: "inventory-api.internal:443", who: "order-service", approver: "—", expires: "—", expTone: "", status: "In review", tone: "busy" },
  { id: "grafana-internal", host: "grafana.internal:3000", who: "team-orders", approver: "platform", expires: "permanent", expTone: "", status: "Active", tone: "ok" },
  { id: "legacy-erp", host: "legacy-erp:8443", who: "cart-api", approver: "—", expires: "expired 2d ago", expTone: "muted", status: "Expired", tone: "idle" },
] as const

export const accessGroups = [
  { id: "commerce-order", name: "commerce-order", members: 12, resources: 4, mismatch: 1, okta: "eng-commerce", policy: "p-118" },
  { id: "dba-readonly", name: "dba-readonly", members: 6, resources: 9, mismatch: 0, okta: "eng-dba", policy: "p-104" },
  { id: "kafka-admins", name: "kafka-admins", members: 4, resources: 3, mismatch: 0, okta: "eng-kafka", policy: "p-121" },
  { id: "observability", name: "observability", members: 41, resources: 2, mismatch: 0, okta: "eng-all", policy: "p-090" },
]

export const groupPeople = [
  { id: "alex", initials: "AC", name: "Alex Chen", role: "owner", online: "1 device online", isOnline: true, avatar: true },
  { id: "sam", initials: "SK", name: "Sam Kowalski", online: "offline 2d", isOnline: false },
  { id: "mia", initials: "MR", name: "Mia Romero", note: "left team in Okta", online: "offline 18d", isOnline: false, mismatch: true },
]

export const directory = [
  { id: "jordan", initials: "JL", name: "Jordan Lee", sub: "team-orders · 2 devices online", member: false },
  { id: "jorge", initials: "JP", name: "Jorge Pinto", sub: "already a member", member: true },
  { id: "jasmine", initials: "JT", name: "Jasmine Tan", sub: "team-pricing · 1 device online", member: false },
]

export const lookupUser = {
  initials: "MR",
  name: "Mia Romero",
  sub: "moved to team-crm · Nov 4",
  stats: [
    ["Devices", "2 · last seen 18d"],
    ["Groups", "3"],
    ["Reachable hosts", "11"],
  ] as const,
  rows: [
    { group: "commerce-order", okta: false, netbird: true, idp: true, action: "Remove", mismatch: true },
    { group: "crm-users", okta: true, netbird: false, idp: true, action: "Sync", mismatch: true },
    { group: "observability", okta: true, netbird: true, idp: true, action: "in sync", mismatch: false },
  ],
}

export const orgMismatches = [
  { n: 4, label: "in NetBird, not in Okta (stale)" },
  { n: 3, label: "in Okta, not yet in NetBird" },
  { n: 0, label: "orphan routing peers" },
]

export type ReviewDecision = "keep" | "revoke" | null
export const reviewRows = [
  { id: "jordan", who: "Jordan Lee", dest: "warehouse-api · pg-prod-orders", usage: [3, 5, 4, 5, 6], last: "today", stale: false, suggestion: "keep" as const, why: "active", decision: null as ReviewDecision },
  { id: "mia", who: "Mia Romero", dest: "warehouse-api · left team", usage: [0, 0, 0, 0, 0], last: "18 days ago", stale: true, suggestion: "revoke" as const, why: "unused", decision: "revoke" as ReviewDecision },
  { id: "sam", who: "Sam Kowalski", dest: "pg-prod-orders", usage: [1, 0, 2, 0, 0], last: "2 days ago", stale: false, suggestion: "keep" as const, why: "active", decision: "keep" as ReviewDecision },
  { id: "etl", who: "analytics-etl (service)", dest: "kafka-prod-core", usage: [0, 0, 0, 0, 0], last: "62 days ago", stale: true, suggestion: "revoke" as const, why: "unused", decision: null as ReviewDecision },
]

export const reachTargets = [
  { id: "kafka-prod-core", addr: "10.30.7.0/28 · 9093", approver: "Priya (kafka-admins)", group: "kafka-admins", peer: "rp-bkk-02" },
  { id: "kafka-qa", addr: "10.40.7.0/28 · 9093", approver: "Nattaya (kafka-qa)", group: "kafka-qa", peer: "rp-bkk-03" },
  { id: "warehouse-api", addr: "10.30.8.40 · 443", approver: "team-warehouse", group: "commerce-order", peer: "rp-bkk-02" },
  { id: "pg-prod-orders", addr: "10.30.2.11 · 5432", approver: "team-orders", group: "dba-readonly", peer: "rp-bkk-02" },
  { id: "grafana-internal", addr: "10.30.5.2 · 3000", approver: "platform", group: "observability", peer: "rp-bkk-02" },
]

/* ---------------- Secrets ---------------- */

export type SecretRow = {
  key: string
  value: string
  masked: string
  note?: string
  noteTone?: "muted" | "warn"
  secret: boolean
  updated: string
  action?: string
  inherited?: boolean
}

export const envCounts = { dev: 12, qa: 11, prod: 11 } as const

export const secretRows: SecretRow[] = [
  { key: "DATABASE_URL", value: "postgres://orders:9xF…@pg-prodban0x000:5432/orders", masked: "••••••••••••••••", note: "from shared/commerce", noteTone: "muted", secret: true, updated: "34d · auto", inherited: true },
  { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_9fK2…old", masked: "••••••••••••••", secret: true, updated: "today · Alex" },
  { key: "REDIS_URL", value: "redis://cache-orders:6379", masked: "••••••••••••", secret: true, updated: "12d · Sam" },
  { key: "TAX_ROUNDING", value: "bankers", masked: "bankers", note: "not secret", noteTone: "muted", secret: false, updated: "3d · Priya" },
  { key: "SECRET_ID", value: "s.7Qf2…kLp", masked: "••••••••••", note: "expires in 3d", noteTone: "warn", secret: true, updated: "87d · Vault", action: "Rotate" },
  { key: "KAFKA_BOOTSTRAP", value: "b-1.makro-prod-core:9093", masked: "••••••••••", note: "from shared/commerce", noteTone: "muted", secret: true, updated: "40d · auto", inherited: true },
  { key: "LOG_LEVEL", value: "info", masked: "info", note: "not secret", noteTone: "muted", secret: false, updated: "90d · Alex" },
  { key: "FEATURE_NEW_CHECKOUT", value: "true", masked: "true", note: "not secret", noteTone: "muted", secret: false, updated: "2h · Alex" },
  { key: "SENTRY_DSN", value: "https://8a2…@sentry.makro", masked: "••••••••••", secret: true, updated: "6mo · platform", inherited: true },
  { key: "JWT_PUBLIC_KEY", value: "-----BEGIN PUBLIC KEY-----", masked: "••••••••••", secret: true, updated: "4mo · platform", inherited: true },
  { key: "DATADOG_API_KEY", value: "dd_7c1f…", masked: "••••••••••", secret: true, updated: "6mo · platform", inherited: true },
]

/** Classic C4c table */
export const classicSecrets = [
  { key: "DATABASE_URL", value: "••••••••••orders", source: "this service", version: "v6", updated: "12d" },
  { key: "STRIPE_WEBHOOK_SECRET", value: "••••••••whsec_p2", source: "this service", version: "v14", updated: "today" },
  { key: "KAFKA_BOOTSTRAP", value: "b-1.makro-prod-core…", source: "inherited", version: "v3", updated: "40d" },
  { key: "VAULT_SECRET_ID", value: "••••••••••••", source: "expires", version: "v9", updated: "27d" },
  { key: "LOG_LEVEL", value: "info", source: "inherited", version: "v1", updated: "90d" },
]

export const secretVersions = [
  { v: "v14", label: "v14 · current", when: "Oct 21", note: "auto-rotated with Postgres v8", current: true },
  { v: "v13", label: "v13", when: "Sep 6 · Alex", diff: ["…@pg-old:5432/orders", "…@pg-prodban0x000:5432/orders"] },
]

export type CompareCell = { v: string; tone?: "same" | "warn" | "missing" | "none" }
export const compareRows: { key: string; dev: CompareCell; qa: CompareCell; prod: CompareCell; note: string; noteTone?: "action" | "muted" | "warn"; diff: boolean }[] = [
  { key: "FEATURE_NEW_CHECKOUT", dev: { v: "a91f" }, qa: { v: "a91f" }, prod: { v: "missing", tone: "missing" }, note: "Copy qa → prod", noteTone: "action", diff: true },
  { key: "STRIPE_WEBHOOK_SECRET", dev: { v: "3c0d" }, qa: { v: "3c0d" }, prod: { v: "7e22", tone: "warn" }, note: "expected · live key", noteTone: "muted", diff: true },
  { key: "DEBUG_SQL", dev: { v: "true" }, qa: { v: "—", tone: "none" }, prod: { v: "—", tone: "none" }, note: "dev only", noteTone: "muted", diff: true },
  { key: "REDIS_URL", dev: { v: "11ab" }, qa: { v: "11ab", tone: "warn" }, prod: { v: "f40c" }, note: "qa points at dev?", noteTone: "warn", diff: true },
  { key: "DATABASE_URL", dev: { v: "02be" }, qa: { v: "5d19" }, prod: { v: "c7a3" }, note: "", diff: false },
  { key: "TAX_ROUNDING", dev: { v: "88e1" }, qa: { v: "88e1" }, prod: { v: "88e1" }, note: "", diff: false },
  { key: "LOG_LEVEL", dev: { v: "4f0a" }, qa: { v: "9b21" }, prod: { v: "9b21" }, note: "", diff: false },
  { key: "SECRET_ID", dev: { v: "e3c2" }, qa: { v: "1af8" }, prod: { v: "70dd" }, note: "", diff: false },
]

export const sampleEnv = `EXPORT_BUCKET=order-exports-qa
EXPORT_QUEUE_URL=https://sqs.ap-southeast-1/qa-exports
FEATURE_EXPORTS=true
LOG_LEVEL=debug
REDIS_URL=redis://cache-orders-qa:6379
STRIPE_SECRET_KEY=sk_live_51Hx…
DATABASE_URL=postgres://orders@pg-qa:5432/orders
TAX_ROUNDING=bankers
SECRET_ID=s.qa…
KAFKA_BOOTSTRAP=b-1.makro-qa-core:9093
SENTRY_DSN=https://8a2…@sentry.makro
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
DATADOG_API_KEY=dd_7c1f…
FEATURE_NEW_CHECKOUT=true`

/** Current qa values the upload is diffed against. */
export const qaCurrent: Record<string, string> = {
  LOG_LEVEL: "info",
  REDIS_URL: "redis://cache-orders:6379",
  DATABASE_URL: "postgres://orders@pg-qa:5432/orders",
  TAX_ROUNDING: "bankers",
  SECRET_ID: "s.qa…",
  KAFKA_BOOTSTRAP: "b-1.makro-qa-core:9093",
  SENTRY_DSN: "https://8a2…@sentry.makro",
  JWT_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----",
  DATADOG_API_KEY: "dd_7c1f…",
  FEATURE_NEW_CHECKOUT: "true",
}
export const inheritedKeys = ["REDIS_URL"]

export const readsPerDay = [36, 40, 38, 42, 39, 18, 15, 41, 44, 40, 43, 62, 42, 39]

export type LogKind = "reveal" | "change" | "service"
export const accessLog: { id: string; when: string; who: string; kind: LogKind; verb: string; key?: string; rest: string }[] = [
  { id: "l1", when: "10:02", who: "Alex", kind: "reveal", verb: "revealed", key: "STRIPE_SECRET_KEY", rest: ' · "debug webhook 401"' },
  { id: "l2", when: "09:40", who: "Priya", kind: "change", verb: "changed", key: "TAX_ROUNDING", rest: " v2 → v3" },
  { id: "l3", when: "09:12", who: "order-service", kind: "service", verb: "read 11 keys at pod start", rest: "" },
  { id: "l4", when: "Nov 20", who: "Sam", kind: "reveal", verb: "revealed", key: "STRIPE_SECRET_KEY", rest: " · no reason given" },
  { id: "l5", when: "Nov 20", who: "Sam", kind: "reveal", verb: "revealed", key: "STRIPE_SECRET_KEY", rest: " · no reason given" },
  { id: "l6", when: "Nov 19", who: "Alex", kind: "change", verb: "changed", key: "REDIS_URL", rest: " v4 → v5" },
]

export const serviceTokens = [
  { id: "gitlab-ci", name: "gitlab-ci", sub: "dev, qa · used 3h ago" },
  { id: "argo-cd", name: "argo-cd", sub: "prod · used 2m ago" },
]
