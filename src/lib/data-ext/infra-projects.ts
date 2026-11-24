/** Extra dummy data for Projects + Infrastructure (Pulumi) screens. */
export type StackState = "sync" | "drift" | "error"

export const infraStacks = [
  { id: "ecommerce-checkout", name: "ecommerce/checkout", env: "prod", resources: 24, updated: "2d · Priya", cost: "$2,140", state: "sync" as StackState },
  { id: "commerce-order-service", name: "commerce/order-service", env: "prod", resources: 18, updated: "6d · Alex", cost: "$1,320", state: "drift" as StackState, drift: 2 },
  { id: "supply-chain-replenish", name: "supply-chain/replenish", env: "dev", resources: 9, updated: "3h · CI", cost: "$210", state: "error" as StackState },
  { id: "payments-ledger", name: "payments/ledger", env: "prod", resources: 31, updated: "12d · Sam", cost: "$3,060", state: "sync" as StackState },
]
export const getStack = (id: string) => infraStacks.find((s) => s.id === id) ?? infraStacks[1]

export const stackResources = [
  { name: "orders-db", type: "tencentcloud:postgres", state: "ok" },
  { name: "orders-sg", type: "aws:ec2/securityGroup", state: "drifted" },
  { name: "orders-bucket", type: "aws:s3/bucket", state: "drifted" },
  { name: "orders-redis", type: "aws:elasticache/cluster", state: "ok" },
  { name: "orders-queue-dlq", type: "aws:sqs/queue", state: "ok" },
]
export const stackOutputs = [
  { k: "db_host", v: "pg-…:5432" },
  { k: "bucket", v: "makro-orders-prod" },
  { k: "redis_url", v: "•••••• (secret)" },
]
export const stackCost = [38, 42, 40, 48, 56, 64]
export const stackUpdates = ["IR-1040 · +1 bucket · 6d · Alex", "IR-1031 · resize redis · 19d · Sam"]

export const resourceCatalog = [
  { id: "s3", tag: "S3", name: "S3 bucket", sub: "Object storage · AWS", cat: "Storage", cost: 4 },
  { id: "pg", tag: "PG", name: "Postgres", sub: "Managed DB · Tencent Cloud", cat: "Data", cost: 38 },
  { id: "redis", tag: "RED", name: "Redis", sub: "Cache · AWS ElastiCache", cat: "Data", cost: 22 },
  { id: "sqs", tag: "SQS", name: "SQS queue", sub: "Queue · AWS", cat: "Data", cost: 1 },
  { id: "cdn", tag: "CDN", name: "CloudFront", sub: "CDN · AWS", cat: "Network", cost: 12 },
  { id: "iam", tag: "IAM", name: "IAM role", sub: "Access · AWS", cat: "Compute", cost: 0 },
]

export const planDiff = [
  { op: "+", res: "aws:s3/bucket order-exports", note: "encrypted · private · 30d lifecycle" },
  { op: "+", res: "aws:sqs/queue order-exports-dlq", note: "retention 14d" },
  {
    op: "~",
    res: "aws:iam/role order-service-task",
    note: "",
    lines: ["- policy: s3:GetObject on orders-bucket", "+ policy: s3:GetObject, s3:PutObject on orders-bucket, order-exports"],
  },
]

export const reqRows = [
  { id: "IR-1042", title: "Add exports storage", stack: "commerce/order-service", env: "prod", by: "Alex", when: "20 min ago", status: "review" as const, delta: "+2 ~1", cost: "+$5/mo" },
  { id: "IR-1041", title: "Resize load balancer", stack: "payments/ledger", env: "prod", by: "Sam", when: "1h ago", status: "applying" as const, delta: "~1", cost: "+$0/mo" },
  { id: "IR-1040", title: "Add redis cache", stack: "commerce/order-service", env: "prod", by: "Alex", when: "6d ago", status: "live" as const, delta: "+1", cost: "+$22/mo" },
  { id: "IR-1039", title: "Replenish bucket", stack: "supply-chain/replenish", env: "dev", by: "CI", when: "3h ago", status: "failed" as const, delta: "+1", cost: "+$4/mo" },
  { id: "IR-1037", title: "Loyalty export bucket", stack: "loyalty/points", env: "dev", by: "Priya", when: "7d ago", status: "rejected" as const, delta: "+1", cost: "+$4/mo" },
]

export const projectCards = [
  { id: "commerce", letter: "C", name: "commerce", team: "team-orders", role: "you're owner", bar: [84, 7, 7], services: "14 services · 12 healthy", right: "2 pending", tone: "muted" },
  { id: "supply-chain", letter: "S", name: "supply-chain", team: "team-ops", role: "member", bar: [85, 0, 14], services: "7 services", right: "1 stack error", tone: "fail" },
  { id: "payments", letter: "P", name: "payments", team: "team-payments", role: "member", bar: [100, 0, 0], services: "6 services · all healthy", right: "", tone: "muted" },
  { id: "loyalty", letter: "L", name: "loyalty", team: "team-crm", role: "view only", bar: [100, 0, 0], services: "4 services", right: "Request access", tone: "dim" },
]
export const getProject = (id: string) => projectCards.find((p) => p.id === id) ?? projectCards[0]

export const projectServices = [
  { name: "order-service", owner: "team-orders", logos: ["postgres", "kafka", "vault"] as const, prod: "v1.40.3", status: "fail" as const, label: "Failing" },
  { name: "checkout-api", owner: "team-payments", logos: ["postgres", "vault"] as const, prod: "v3.2.0", status: "ok" as const, label: "Live" },
  { name: "fulfilment", owner: "team-ops", logos: ["kafka"] as const, prod: "v2.8.1", status: "warn" as const, label: "Degraded" },
]

export const switcherItems = [
  { id: "commerce", letter: "C", name: "commerce", meta: "14 services", fail: false },
  { id: "supply-chain", letter: "S", name: "supply-chain", meta: "1 failing", fail: true },
  { id: "payments", letter: "P", name: "payments", meta: "6 services", fail: false },
  { id: "loyalty", letter: "L", name: "loyalty", meta: "4 services", fail: false },
]

export const rollout = ["MR merged", "Argo synced", "Pulumi up", "Live"]
