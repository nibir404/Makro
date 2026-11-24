import type { Env } from "@/lib/data"

export type DeployRow = {
  version: string
  env: Env
  change: string
  by: string
  status: "live" | "failed" | "superseded"
  when: string
  sha: string
}

export const envVersions: { env: Env; version: string; meta: string; status: "live" | "behind"; behind?: number }[] = [
  { env: "dev", version: "v1.42.0", meta: "a3f9c21 · 12m ago · Alex", status: "live" },
  { env: "qa", version: "v1.42.0", meta: "a3f9c21 · 1h ago · CI", status: "live" },
  { env: "prod", version: "v1.40.3", meta: "7be10d4 · 3d ago · Priya", status: "behind", behind: 2 },
]

export const deployRows: DeployRow[] = [
  { version: "v1.42.0", env: "dev", change: "Retry idempotency keys on 409", by: "Alex", status: "live", when: "12m", sha: "a3f9c21" },
  { version: "v1.41.1", env: "dev", change: "Bump pg driver to 8.12", by: "CI", status: "failed", when: "2h", sha: "9b1e0f4" },
  { version: "v1.40.3", env: "prod", change: "Fix tax rounding for EU carts", by: "Priya", status: "live", when: "3d", sha: "7be10d4" },
  { version: "v1.39.0", env: "prod", change: "Stripe webhook v2", by: "Priya", status: "superseded", when: "9d", sha: "c01e9a2" },
  { version: "v1.38.2", env: "prod", change: "Cart session TTL 30m", by: "Sam", status: "superseded", when: "16d", sha: "5d2a7c0" },
]

/** 30 days of deploys: positive = succeeded count, -1 = failed day, 0 = none. */
export const deployHistory: { h: number; failed?: boolean }[] = [
  2, 4, 1.5, 6, -4, 0, 0, 5.5, 7.5, 5, 9, -3, 0, 0, 6, 4, 7, 10, 5, 0, 0, 4, -6, 8, 5, 7, 0, 0, -3, 6,
].map((v) => (v < 0 ? { h: -v, failed: true } : { h: v }))

export const deployStats = { succeeded: 46, failed: 4, success: 92, lead: "2h 10m", mttr: "14m", rollbacks: 1 }

export const metricSeries = {
  rps: [40, 42, 44, 47, 54, 59, 60, 60, 57, 65, 69, 70, 66, 63, 60, 57, 63, 67, 68, 71],
  p95: [30, 30, 31, 30, 31, 33, 36, 52, 40, 34, 34, 33, 35, 35, 34, 35, 35, 35, 35, 35],
  err: [10, 10, 12, 10, 10, 14, 48, 22, 12, 11, 11, 12, 10, 10, 10, 12, 10, 10, 10, 10],
  cpu: [30, 31, 33, 32, 36, 38, 41, 46, 39, 37, 36, 34, 33, 34, 35, 34, 33, 34, 35, 34],
  mem: [40, 41, 42, 43, 44, 44, 44, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45],
}

export const rollbackChanges = [
  { sign: "~", key: "image", from: "v1.40.3", to: "v1.39.0" },
  { sign: "-", key: "env", value: "TAX_ROUNDING=bankers" },
  { sign: "~", key: "commits", value: "7 reverted (7be10d4…c01e9a2)" },
]

export const promoteChecks = [
  { ok: true, text: "Healthy in qa for 1h · error rate 0.2%" },
  { ok: true, text: "Image scanned · 0 critical" },
  { ok: false, text: "Secret FEATURE_NEW_CHECKOUT missing in prod", fix: "Copy from qa" },
  { ok: true, text: "No open incidents · not in a freeze window" },
]

export const autoUpdates = [
  { env: "dev", ref: "a3f9c21", result: "deployed · 12m", ok: true },
  { env: "qa", ref: "v1.42.0", result: "deployed · 1h", ok: true },
  { env: "dev", ref: "9b1e0f4", result: "skipped · image scan failed", ok: false },
]

export const deleteImpact = {
  removed: ["3 environments", "Deploy history", "Vault path · 11 keys", "orders-sg, orders-bucket"],
  kept: ["pg-prod-orders (shared)", "orders.created.v1 (2 consumers)", "Activity history"],
}
