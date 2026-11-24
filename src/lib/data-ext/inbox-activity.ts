import type { Env, Logo } from "@/lib/data"

export const inboxListMeta: Record<string, { sub: string; classicTitle: string; classicMeta: string }> = {
  "TR-001041": { sub: "loyalty.points.redeemed.v1", classicTitle: "Create topic loyalty.points.redeemed.v1", classicMeta: "priya.s · TR-001041 · 2h ago" },
  "IR-1042": { sub: "pricing/price-api", classicTitle: "Add rds-postgres to pricing", classicMeta: "nattaya.k · IR-1042 · 4h ago" },
}

export const prodConfirm = {
  rows: [
    ["Creates", "loyalty.points.redeemed.v1"],
    ["On", "makro-prod-core"],
    ["Affects", "No existing consumers"],
  ],
  body: "MR !517 is merged and the topic is created within ~1 min. You can delete it later from the service canvas.",
}

export const rejectReasons = ["Too many partitions", "Naming", "Needs design review"]

export type TrackedRequest = {
  id: string
  title: string
  target: string
  logo: Logo
  env: Env
  sub: string
  status: "applying" | "review" | "failed" | "approved" | "rejected" | "live"
  age: string
  step: number // 0 submitted · 1 review · 2 approved · 3 applying · 4 live
  timeline: [string, string, ("ok" | "busy" | "fail" | "wait")][]
  note?: string
  action?: string
}

export const myInFlight: TrackedRequest[] = [
  {
    id: "r1", title: "Promote order-service", target: "qa → prod · v2.3.6", logo: "argocd", env: "prod", sub: "MR !482 merged · Argo syncing 2/3 pods", status: "applying", age: "12m", step: 3,
    timeline: [["09:20", "Requested by you", "ok"], ["09:31", "Approved by daniel.w", "ok"], ["09:32", "MR !482 merged", "ok"], ["09:33", "Argo syncing · 2/3 pods healthy", "busy"], ["—", "Verify & go live", "wait"]],
    note: "Usually live within ~1 min.", action: "Open service",
  },
  {
    id: "r2", title: "Rotate SecretID", target: "pricing/qa", logo: "vault", env: "qa", sub: "Waiting on pricing leads · 2 can approve", status: "review", age: "1h", step: 1,
    timeline: [["08:40", "Requested by you", "ok"], ["08:40", "Waiting on nattaya.k or ploy.w", "busy"], ["—", "Apply", "wait"], ["—", "Live", "wait"]],
    note: "Reviewers get a Slack ping after 2h.", action: "Nudge reviewers",
  },
]

export const doneItems: TrackedRequest[] = [
  {
    id: "d1", title: "Postgres read-only user", target: "reporting_ro · pg-prod-orders", logo: "postgres", env: "prod", sub: "Approved by you · live", status: "live", age: "yesterday", step: 4,
    timeline: [["Mon 14:02", "Requested by kittipat.r", "ok"], ["Mon 14:20", "Approved by you", "ok"], ["Mon 14:21", "Applied · credentials in Vault", "ok"], ["Mon 14:22", "Live", "ok"]],
  },
  {
    id: "d2", title: "Create topic", target: "tmp.debug.v0", logo: "kafka", env: "dev", sub: "Rejected by kittipat.r · naming", status: "rejected", age: "yesterday", step: 1,
    timeline: [["Mon 10:02", "Requested by you", "ok"], ["Mon 10:40", "Rejected · \"tmp.* topics aren't allowed\"", "fail"]],
    action: "Edit & resubmit",
  },
  {
    id: "d3", title: "Topic pos.transactions.v1", target: "scale to 64 partitions", logo: "kafka", env: "prod", sub: "Apply failed · 409 reassignment", status: "failed", age: "3h", step: 3,
    timeline: [["07:10", "Requested by you", "ok"], ["07:40", "Approved by priya.s", "ok"], ["09:02", "Apply failed · 409 partition reassignment in progress", "fail"]],
    action: "Retry apply",
  },
]

/* -------- Activity overview -------- */
export const activityKpis = [
  { label: "Changes", value: 412, unit: "", note: "+18% vs last week", tone: "success" },
  { label: "Prod changes", value: 37, unit: "", note: "all approved", tone: "subtle" },
  { label: "Failed", value: 9, unit: "", note: "3 still open", tone: "destructive" },
  { label: "Median approval", value: 11, unit: " min", note: "−4 min", tone: "success" },
] as const

export const changesPerDay = [
  { d: "Mon", base: 80, prod: 14, fail: 6 },
  { d: "Tue", base: 110, prod: 20, fail: 0 },
  { d: "Wed", base: 92, prod: 12, fail: 10 },
  { d: "Thu", base: 130, prod: 26, fail: 0 },
  { d: "Fri", base: 100, prod: 18, fail: 6 },
  { d: "Sat", base: 30, prod: 0, fail: 0, weekend: true },
  { d: "Sun", base: 22, prod: 0, fail: 0, weekend: true },
]

export const byModule = [
  { label: "Deploys", pct: 42 },
  { label: "Kafka", pct: 22 },
  { label: "Secrets", pct: 16 },
  { label: "Postgres", pct: 12 },
  { label: "Network", pct: 8 },
]

export const mostActive = [
  { name: "order-service", n: 96 },
  { name: "checkout-api", n: 71 },
  { name: "fulfilment", n: 45 },
]

export const needsALook = [
  { id: "ev-acl", text: "Kafka ACL apply failed · fulfilment", tone: "fail", when: "2h" },
  { id: "ev-build", text: "Build failed · payment-gateway", tone: "fail", when: "3h" },
  { id: "ev-rollback", text: "Prod rollback · order-service", tone: "warn", when: "5h" },
]

/* -------- Audit log -------- */
export type AuditIcon = "rollback" | "fail" | "approved" | "secret" | "deploy" | "network" | "rejected"
export type AuditEvent = {
  id: string
  day: "Today" | "Yesterday"
  icon: AuditIcon
  title: string
  resource: string
  actor: string
  env: Env
  when: string
  module: string
}
export const auditLog: AuditEvent[] = [
  { id: "ev-rollback", day: "Today", icon: "rollback", title: "Rolled back to v1.39.0", resource: "order-service", actor: "Alex", env: "prod", when: "10:42", module: "Deploys" },
  { id: "ev-acl", day: "Today", icon: "fail", title: "ACL apply failed · consumer group fulfil-v2", resource: "orders.created.v1", actor: "Argo CD", env: "prod", when: "09:15", module: "Kafka" },
  { id: "ev-pg", day: "Today", icon: "approved", title: "Approved · Postgres read-only user", resource: "pg-prod-orders", actor: "Priya", env: "prod", when: "08:51", module: "Postgres" },
  { id: "ev-secret", day: "Yesterday", icon: "secret", title: "Secret rotated · STRIPE_KEY", resource: "secrets/checkout", actor: "Vault (auto)", env: "prod", when: "22:00", module: "Secrets" },
  { id: "ev-deploy", day: "Yesterday", icon: "deploy", title: "Deployed v1.40.3", resource: "order-service", actor: "Priya", env: "prod", when: "16:20", module: "Deploys" },
  { id: "ev-net", day: "Yesterday", icon: "network", title: "Network access granted · warehouse-api", resource: "netbird/commerce", actor: "Sam", env: "prod", when: "14:03", module: "Network" },
  { id: "ev-reject", day: "Yesterday", icon: "rejected", title: "Rejected · topic retention 90d", resource: "payments.events", actor: "Priya", env: "prod", when: "11:47", module: "Kafka" },
]

export const eventDetail = {
  "ev-acl": {
    title: "ACL apply failed",
    meta: "Today 09:15 · prod · triggered by Argo CD sync",
    rows: [
      ["Resource", "orders.created.v1", true],
      ["Service", "fulfilment", false],
      ["Requested by", "Sam · approved by Priya", false],
      ["Request", "#2841 · Read access for fulfil-v2", false],
    ] as [string, string, boolean][],
    timeline: [
      ["08:40", "Requested by Sam", false],
      ["08:51", "Approved by Priya", false],
      ["09:14", "Apply started", false],
      ["09:15", "Broker rejected: principal not found", true],
    ] as [string, string, boolean][],
    payload: ['{', '  "principal": "User:fulfil-v2",', '  "operation": "READ",', '  "error": "PRINCIPAL_NOT_FOUND"', '}'],
    failed: true,
  },
} as const

/* -------- Classic activity -------- */
export const eventsPerHour = [6, 8, 14, 20, 18, 12, 24, 30, 18, 22, 16, 22, 28, 22, 14, 12, 18, 26, 20, 16, 22, 26, 16, 12]
export const failureHour = 9
export const classicFeed = [
  { t: "14:12", icon: "deploy", actor: "Alex", text: "deployed order-service v1.42.0 to dev", right: "CI passed · 2m 14s", tone: "subtle" },
  { t: "13:40", icon: "approved", actor: "daniel.w", text: "approved promote of order-service to prod", right: "MR !482 · Argo syncing", tone: "subtle" },
  { t: "12:05", icon: "secret", actor: "priya.s", text: "rotated STRIPE_WEBHOOK_SECRET in pricing/qa", right: "version 14", tone: "subtle" },
  { t: "09:02", icon: "rejected", actor: "system", text: "apply failed on TR-001035 · pos.transactions.v1", right: "409 · partition reassignment", tone: "destructive", id: "ev-acl" },
  { t: "08:30", icon: "network", actor: "somchai.k", text: "requested access to warehouse-api:443", right: "waiting on team-warehouse", tone: "subtle" },
] as const

/* -------- Profile / API keys -------- */
export const profileKeys = [
  { name: "ci-github", scope: "Deploy · commerce", used: "never", expires: "in 90 days", isNew: true },
  { name: "laptop-cli", scope: "Read · all projects", used: "2h ago", expires: "in 41 days" },
  { name: "old-jenkins", scope: "Deploy · commerce", used: "94 days ago", expires: "in 3 days", stale: true },
]

/* -------- What's new -------- */
export const changelog = [
  { title: "Canvas view for every module", body: "See projects, stacks, access and secrets as graphs", date: "Nov 24", unread: true },
  { title: "Canary promotes with auto-rollback", body: "Prod promotes now go 10 → 50 → 100%", date: "Nov 20", unread: true },
  { title: "Quarterly access reviews", body: "Review grants with usage-based suggestions", date: "Nov 12", unread: false },
]

/* -------- Platform status -------- */
export const integrations: { name: string; logo: Logo; status: "ok" | "degraded" | "warn"; label: string; bars?: ("ok" | "warn" | "fail")[]; note: string }[] = [
  { name: "Argo CD", logo: "argocd", status: "degraded", label: "degraded", bars: ["ok", "ok", "ok", "ok", "ok", "warn", "warn"], note: "sync p95 4m 40s · 7d" },
  { name: "Vault", logo: "vault", status: "ok", label: "ok", bars: ["ok", "ok", "ok", "ok", "ok", "ok", "ok"], note: "100% · 7d" },
  { name: "Kafka (3 clusters)", logo: "kafka", status: "ok", label: "ok", bars: ["ok", "ok", "fail", "ok", "ok", "ok", "ok"], note: "1 outage Nov 19 · 12m" },
  { name: "NetBird", logo: "netbird", status: "warn", label: "1 peer offline", note: "rp-bkk-03 offline 40m" },
  { name: "Pulumi", logo: "pulumi", status: "ok", label: "ok", note: "nightly drift scan 02:00 · 2 found" },
  { name: "Okta SSO", logo: "okta", status: "ok", label: "ok", note: "group sync every 15 min · last 3m ago" },
]
export const policies = [
  ["Prod changes need approval", "1 approver · not the requester"],
  ["Password rotation", "every 45 days"],
  ["Deploy freeze", "Dec 20 – Jan 2 · prod only"],
]

/* -------- Patterns: notification matrix -------- */
export const notifMatrix = [
  { label: "Needs my approval", v: [true, true, false] },
  { label: "My request decided", v: [true, true, false] },
  { label: "Prod failure on my services", v: [true, true, true] },
  { label: "Access expiring", v: [true, false, true] },
  { label: "Weekly digest", v: [false, false, true] },
]

/* -------- R1f Platform overview -------- */
export const dora = [
  { label: "Deploy frequency", value: "14.2", unit: "/ day", delta: "18%", up: true, good: true, bars: [3, 4, 4, 6, 6, 8, 10] },
  { label: "Lead time for change", value: "3h 40m", unit: "", delta: "22%", up: false, good: true, bars: [10, 9, 9, 7, 6, 5, 4] },
  { label: "Change failure rate", value: "4.1%", unit: "", delta: "0.6pt", up: true, good: false, bars: [3, 3, 3, 3, 4, 7, 4] },
  { label: "Time to restore", value: "26m", unit: "", delta: "9m", up: false, good: true, bars: [9, 8, 8, 6, 6, 4, 3] },
]
export const overviewModules = [
  { id: "deployments", name: "Deployments", logo: "argocd" as Logo, sub: "36 services · 3 envs", path: "/services", bar: [28, 4, 2, 2], stats: ["28 live", "4 syncing", "2 out of sync", "2 degraded"], issues: [["fail", "cart-api · qa · degraded 40m", "Rollback"], ["warn", "order-service · prod · out of sync", "Sync"]] },
  { id: "kafka", name: "Kafka", logo: "kafka" as Logo, sub: "48 topics · 10 users · 21 ACLs", path: "/kafka", bar: [44, 2, 1, 1], stats: ["44 live", "2 in review", "1 applying", "1 failed"], issues: [["fail", "TR-001035 · apply failed (409)", "Retry"], ["warn", "makro-prod-edge · cluster degraded", "View"]] },
  { id: "secrets", name: "Secrets", logo: "vault" as Logo, sub: "10 projects · 312 keys · 6 AppRoles", path: "/secrets", bar: [8, 2, 0, 0], stats: ["8 healthy", "2 rotation due", "18 changes / 7d"], issues: [["warn", "order-service/prod · SecretID expires 3d", "Rotate"], ["warn", "pricing/qa · 4 keys unchanged 180d", "Review"]] },
  { id: "postgres", name: "Postgres & credentials", logo: "postgres" as Logo, sub: "10 users · 10 bindings", path: "/postgres", bar: [15, 3, 0, 2], stats: ["15 healthy", "3 pending approval", "2 unhealthy"], issues: [["fail", "pg-prod-orders · health check failing", "Diagnose"], ["fail", "pricing-api · last rotation failed", "Retry"]] },
  { id: "network", name: "Network access", logo: "netbird" as Logo, sub: "14 grants · 23 groups · 9 resources", path: "/network", bar: [5, 2, 3, 1], stats: ["5 active", "2 expiring", "3 expired", "1 failed"], issues: [["warn", "warehouse-api · expires in 12 days", "Renew"], ["fail", "5 group mismatches with Authentik", "Fix"]] },
  { id: "infra", name: "Infrastructure", logo: "pulumi" as Logo, sub: "22 stacks · 8 open requests", path: "/infra", bar: [18, 2, 1, 1], stats: ["18 ready", "2 applying", "1 in review", "1 stalled"], issues: [["fail", "supply-chain/replenish/dev · stalled", "Retry"], ["busy", "IR-1039 · Pulumi up running 6m", "Watch"]] },
]
export const deploysPerDay = {
  prod: [11, 11, 12, 12, 14, 14, 15, 16, 17, 17, 19, 20],
  qa: [8, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15],
  dev: [4, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10],
}
export const openByModule = [
  { label: "Kafka", n: 8 },
  { label: "Infra", n: 6 },
  { label: "Deployments", n: 4 },
  { label: "Credentials", n: 4 },
  { label: "Network", n: 3 },
]
export const applyOutcomes = [[8, 1], [9, 0], [7, 1], [10, 0], [8, 1], [11, 0], [10, 0], [9, 2], [11, 0], [10, 0], [8, 1], [9, 0], [10, 0], [12, 1]]
export const recentChanges = [
  { when: "2 min ago", module: "Deployments", logo: "argocd" as Logo, change: "order-service promoted v2.3.6", env: "prod" as Env, by: "daniel.w", status: "applying" as const },
  { when: "6 min ago", module: "Kafka", logo: "kafka" as Logo, change: "pos.transactions.v1 scale to 64 partitions", env: "prod" as Env, by: "kittipong.r", status: "failed" as const },
  { when: "24 min ago", module: "Secrets", logo: "vault" as Logo, change: "pricing-api/qa · STRIPE_KEY updated", env: "qa" as Env, by: "priya.s", status: "live" as const },
  { when: "1 h ago", module: "Infra", logo: "pulumi" as Logo, change: "IR-1042 add rds-postgres · price-api", env: "qa" as Env, by: "nattaya.k", status: "review" as const },
]
