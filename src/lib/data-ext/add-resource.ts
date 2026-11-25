/** Extra data for the "Add resource" + "New service" flows (Canvas 04x / 07x, Classic C04x / C07x). */
import type { Logo } from "@/lib/data"

export type AddType = "kafka" | "postgres" | "database" | "secret" | "network" | "monitoring"
export const ADD_TYPES: AddType[] = ["kafka", "postgres", "database", "secret", "network", "monitoring"]

export const addTypes: {
  id: AddType
  group: "Data" | "Access & config"
  name: string
  desc: string
  logo: Logo | null
  title: string
}[] = [
  { id: "kafka", group: "Data", name: "Kafka topic", desc: "Produce or consume events", logo: "kafka", title: "New Kafka topic" },
  { id: "postgres", group: "Data", name: "Postgres user", desc: "Role + password stored in Vault", logo: "postgres", title: "New Postgres user" },
  { id: "database", group: "Data", name: "Database · cache · bucket", desc: "RDS, Redis, S3 via Pulumi", logo: "pulumi", title: "New database · cache · bucket" },
  { id: "secret", group: "Access & config", name: "Secret", desc: "Key/value, per environment", logo: "vault", title: "New secret" },
  { id: "network", group: "Access & config", name: "Network access", desc: "Reach a private host via NetBird", logo: "netbird", title: "New network access" },
  { id: "monitoring", group: "Access & config", name: "Monitoring", desc: "Datadog APM & logs", logo: "datadog", title: "Add monitoring" },
]

export const takenTopics = ["orders.created.v1", "orders.cancelled.v1", "loyalty.points.earned.v1"]
export const takenRoles = ["svc_order_service_rw"]
export const pgTargets = [
  { id: "pg-prod-orders", note: "shared · 3 services" },
  { id: "pg-prod-loyalty", note: "shared · 2 services" },
  { id: "pg-dev-orders", note: "dedicated" },
]
export const dbSizes = [
  { id: "small", name: "Small", spec: "2 vCPU · 4 GB", cost: 48 },
  { id: "medium", name: "Medium", spec: "4 vCPU · 16 GB", cost: 190 },
  { id: "large", name: "Large", spec: "8 vCPU · 32 GB", cost: 380 },
]
export const netHosts: Record<string, { group: string; owner: string }> = {
  "inventory-api.internal": { group: "inventory", owner: "team-warehouse" },
  "warehouse-api.internal": { group: "warehouse", owner: "team-warehouse" },
  "pricing-api.internal": { group: "pricing", owner: "team-pricing" },
  "loyalty-db.internal": { group: "loyalty", owner: "team-crm" },
}

/* ---------- staged change set (client-only, sessionStorage) ---------- */

export type StagedChange = {
  id: string
  type: AddType
  title: string
  label: string
  logo: Logo
  lines: string[]
}

const DEFAULT_STAGED: StagedChange[] = [
  {
    id: "kafka-loyalty",
    type: "kafka",
    title: "loyalty.points.redeemed.v1",
    label: "Kafka topic",
    logo: "kafka",
    lines: ["partitions: 6   replicationFactor: 3", "retention.ms: 604800000", "acl: svc-order-service WRITE"],
  },
  {
    id: "net-warehouse",
    type: "network",
    title: "Access to warehouse-api:443",
    label: "Network",
    logo: "netbird",
    lines: ["group: commerce-order-service", "expires: 30 days"],
  },
]

const KEY = "idp.staged.v1"
/** Raw sessionStorage value ("" when empty); a stable string snapshot for useSyncExternalStore. */
export function readStagedRaw(): string {
  try {
    return sessionStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}
export const noopSubscribe = () => () => {}

export function readStaged(): StagedChange[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StagedChange[]) : DEFAULT_STAGED
  } catch {
    return DEFAULT_STAGED
  }
}
export function writeStaged(list: StagedChange[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}
export function stageChange(c: StagedChange) {
  const list = readStaged().filter((x) => x.id !== c.id && x.title !== c.title)
  // the freshly staged change goes first, the pre-existing network draft stays
  writeStaged([c, ...list.filter((x) => x.id !== "kafka-loyalty" || c.type !== "kafka")])
}

/* ---------- New service ---------- */

export const templates: { id: string; name: string; desc: string; logo: Logo | "gitlab-repo" | "helm" | "go"; used?: number }[] = [
  { id: "repo", name: "Existing repository", desc: "Detects Dockerfile or Helm chart", logo: "gitlab" },
  { id: "go-api", name: "Go API · golden path", desc: "HTTP service, CI, dashboards, alerts", logo: "go", used: 38 },
  { id: "kafka-consumer", name: "Kafka consumer", desc: "Worker + topic + consumer group", logo: "kafka", used: 21 },
  { id: "api-postgres", name: "API + Postgres", desc: "Service, database, secrets wired", logo: "postgres", used: 17 },
  { id: "helm", name: "Helm chart", desc: "Bring your own chart", logo: "kubernetes" },
]

export const projectsList = ["commerce", "pricing", "inventory", "loyalty", "payments"]
export const teamsList = ["team-payments", "team-orders", "team-pricing", "team-warehouse", "team-crm"]

export const provisionSteps = [
  { id: "repo", label: "GitLab repo created", secs: 4 },
  { id: "ci", label: "CI pipeline configured", secs: 6 },
  { id: "vault", label: "Vault path + secrets", secs: 3 },
  { id: "build", label: "First build · dev", secs: 38 },
  { id: "argo", label: "Argo CD sync · dev, qa", secs: 12 },
  { id: "dash", label: "Dashboard + alerts", secs: 5 },
]

export const buildLog = [
  "#5 [build 1/5] FROM golang:1.23-alpine",
  "#6 [build 2/5] COPY go.mod go.sum ./",
  "#7 [build 3/5] go mod download",
  "#8 [build 4/5] go build ./cmd/api",
  "#8 0.92s compiled 41 packages",
  "#9 [build 5/5] docker push registry.makro/payment-gateway:0.1.0",
]
