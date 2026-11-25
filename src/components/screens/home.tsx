"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { toast } from "sonner"
import {
  Plus,
  Inbox,
  Clock,
  TriangleAlert,
  ArrowRight,
  Rocket,
  Radio,
  KeyRound,
  Database,
  ShieldCheck,
  CloudCog,
  Loader,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { inbox, me, myRequests, needsYou, overview, services } from "@/lib/data"
import {
  Btn,
  EnvChip,
  Eyebrow,
  GlossCard,
  IntegrationLogo,
  LogoTile,
  SectionLabel,
  Stagger,
  StaggerItem,
  StatusDot,
  StatusPill,
  useHotkey,
  ease,
} from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

/* Dithered horizon hero — shared by both modes */
export function HomeHero({ approvals }: { approvals: number }) {
  const href = useHref()
  const router = useRouter()
  // Static copy from the design; refreshed on the client after mount.
  const [day, date, greet] = React.useSyncExternalStore(noopSubscribe, clientNow, () => SERVER_NOW).split("|")
  useHotkey("n", () => router.push(href("/services/order-service/add")))

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="relative flex h-42 shrink-0 items-end justify-between overflow-hidden rounded-[18px] border border-[var(--card-edge)] bg-[var(--hero-bg)] p-7 shadow-[inset_0_1px_0_#ffffff0f]"
    >
      {/* dither texture drifts slowly */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center light:opacity-25"
        style={{ backgroundImage: "url(/textures/horizon.png)" }}
        initial={{ scale: 1.08, x: 20 }}
        animate={{ scale: 1.08, x: [20, -10, 20] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "var(--hero-fade)" }} />
      <div className="relative flex flex-col gap-2">
        <Eyebrow>
          {day} · {date}
        </Eyebrow>
        <h1 className="text-[32px] leading-9.5 font-semibold tracking-[-0.02em] text-foreground">
          {greet}, {me.first}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{approvals} approvals</span> waiting on you ·{" "}
          <span className="font-medium text-foreground">3 requests</span> in flight ·{" "}
          <span className="font-medium text-destructive">2 failures</span> in your namespaces
        </p>
      </div>
      <div className="relative flex gap-2.5">
        <Btn variant="secondary" size="lg" kbd="N" href={href("/services/order-service/add")}>
          <Plus /> New request
        </Btn>
        <Btn variant="primary" size="lg" href={href("/inbox")} className="px-4.5">
          <Inbox /> Review {approvals} approvals
        </Btn>
      </div>
    </motion.section>
  )
}

/* ================================================================== */
/* Canvas · 01a Home                                                   */
/* ================================================================== */

const noopSubscribe = () => () => {}
const SERVER_NOW = "Monday|24 Nov|Good morning"
function clientNow() {
  const t = new Date()
  const h = t.getHours()
  return [
    t.toLocaleDateString("en-GB", { weekday: "long" }),
    t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
  ].join("|")
}

export function CanvasHome() {
  const href = useHref()
  const commerce = services.filter((s) => s.namespace === "commerce")
  return (
    <div className="flex w-full max-w-[1040px] flex-col gap-10 self-center px-0 pt-8 pb-16">
      <HomeHero approvals={7} />

      <section className="flex flex-col gap-0.5">
        <SectionLabel className="pb-2.5">Needs you</SectionLabel>
        <Stagger>
          {needsYou.map((n) => (
            <StaggerItem key={n.id}>
              <Link
                href={href(`/${n.href}`)}
                className="group flex h-11 shrink-0 items-center gap-3 border-b border-line px-1 transition-colors hover:bg-surface/60"
              >
                {n.tone === "fail" ? (
                  <TriangleAlert className="size-3.5 text-destructive" />
                ) : (
                  <Clock className="size-3.5 text-warning" />
                )}
                <span className="flex-1 text-sm text-foreground">
                  {n.text[0]}
                  {n.text[1] && <span className="font-mono text-[13px]">{n.text[1]}</span>}
                  {n.text[2] && <span className="text-subtle">{n.text[2]}</span>}
                </span>
                <span className="flex items-center gap-1 text-[13px] font-medium text-primary">
                  {n.action}
                  <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel
          right={
            <Btn size="sm" href={href("/services/new")} className="bg-surface-2 font-semibold">
              <Plus /> New
            </Btn>
          }
        >
          Services · {commerce.length + 7}
        </SectionLabel>
        <Stagger className="flex flex-wrap gap-4">
          {commerce.map((s) => (
            <StaggerItem key={s.id}>
              <Link
                href={href(`/services/${s.id}`)}
                className="group flex h-37 w-84 shrink-0 flex-col justify-between rounded-[12px] border border-line bg-surface p-4.5 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-3 hover:shadow-[0_12px_32px_-16px_#000]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] leading-4.5 font-medium text-foreground">{s.name}</span>
                    <span
                      className={cn(
                        "text-xs",
                        s.note?.tone === "fail" ? "text-destructive" : s.note?.tone === "busy" ? "text-info" : "text-subtle",
                      )}
                    >
                      {s.note?.text ?? s.deployed}
                    </span>
                  </div>
                  <div className="flex gap-1.25 pt-1" title="dev · qa · prod">
                    {s.envHealth.map((h, i) => (
                      <StatusDot key={i} health={h} pulse={h === "busy"} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {s.logos.map((l) => (
                    <IntegrationLogo key={l} name={l} mono className="transition-colors group-hover:text-foreground" />
                  ))}
                  <span className="text-xs text-subtle">{s.logos.length} resources</span>
                </div>
              </Link>
            </StaggerItem>
          ))}
          <StaggerItem>
            <Link
              href={href("/services/new")}
              className="group flex h-37 w-84 shrink-0 flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-surface-3 text-subtle transition-colors hover:border-primary/60 hover:text-foreground"
            >
              <Plus className="size-4.5 transition-transform group-hover:rotate-90" />
              <span className="text-[13px]">New service</span>
            </Link>
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  )
}

/* ================================================================== */
/* Classic · R1a Home                                                  */
/* ================================================================== */

const OV_ICON = { rocket: Rocket, radio: Radio, key: KeyRound, database: Database, shield: ShieldCheck, cloud: CloudCog }
const LEGEND: Record<string, string> = { success: "text-success", warning: "text-warning", destructive: "text-destructive", info: "text-info" }
const BAR_COLORS =["bg-success", "bg-warning", "bg-info", "bg-destructive"]
const OV_PATH: Record<string, string> = {
  deployments: "/services",
  kafka: "/kafka",
  secrets: "/secrets",
  postgres: "/postgres",
  network: "/network",
  infra: "/infra",
}

function ApprovalRow({ item, focused }: { item: (typeof inbox)[number]; focused: boolean }) {
  const href = useHref()
  const [state, setState] = React.useState<"idle" | "approving" | "done">("idle")
  const approve = () => {
    setState("approving")
    setTimeout(() => {
      setState("done")
      toast.success(`Approved ${item.ref}`, {
        description: `${item.title} ${item.target} · opens MR ${item.mr}`,
        action: { label: "Undo", onClick: () => setState("idle") },
      })
    }, 700)
  }
  return (
    <motion.div
      layout
      animate={{ opacity: state === "done" ? 0.45 : 1 }}
      className={cn(
        "relative flex items-center gap-3.5 border-t border-white/6 px-5 py-3.5 transition-colors light:border-black/6",
        focused && "bg-white/[0.025] light:bg-black/[0.02]",
      )}
    >
      {focused && <motion.span layoutId="approval-focus" className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary" />}
      <LogoTile name={item.logo} />
      <div className="flex flex-1 flex-col gap-0.75">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {item.kind === "kafka"
              ? `Create topic ${item.target}`
              : item.kind === "infra"
                ? `Add rds-postgres to ${item.target}`
                : `Network access to warehouse-api:443`}
          </span>
          {item.env === "prod" && <EnvChip env="prod" />}
        </div>
        <span className="text-xs text-muted-foreground">
          {item.kind === "kafka"
            ? `${item.ref} · ${item.by} · 12 partitions · RF 3 · ${item.age} ago`
            : item.kind === "infra"
              ? `${item.ref} · ${item.by} · qa · +2 resources · ${item.age} ago`
              : `${item.ref} · ${item.by} · inventory · 30 days · yesterday`}
        </span>
      </div>
      <div className="flex gap-2">
        <Btn size="sm" href={href(`/inbox?item=${item.id}`)}>
          Review
        </Btn>
        <Btn
          size="sm"
          variant="outline"
          className="bg-surface-2 font-semibold"
          disabled={state !== "idle"}
          onClick={() => (item.env === "prod" ? window.location.assign(href(`/inbox?item=${item.id}&confirm=1`)) : approve())}
        >
          {state === "approving" ? <Loader className="animate-spin" /> : state === "done" ? "Approved" : "Approve"}
        </Btn>
      </div>
    </motion.div>
  )
}

export function ClassicHome() {
  const href = useHref()
  const [focus, setFocus] = React.useState(0)
  useHotkey("j", () => setFocus((f) => Math.min(inbox.length - 1, f + 1)))
  useHotkey("k", () => setFocus((f) => Math.max(0, f - 1)))
  useHotkey("r", () => (window.location.href = href(`/inbox?item=${inbox[focus].id}`)))

  const segColor = (s: string, i: number, step: number) => {
    if (i < step - 1) return "bg-[#D4D4D4] light:bg-zinc-400"
    if (i === step - 1)
      return s === "applying"
        ? "bg-[linear-gradient(90deg,var(--info)_50%,var(--surface-3)_50%)]"
        : s === "review"
          ? "bg-warning"
          : s === "failed"
            ? "bg-destructive"
            : "bg-success"
    return "bg-surface-3"
  }

  return (
    <ClassicPage className="gap-5 pt-6 pb-7">
      <HomeHero approvals={inbox.length} />

      <div className="flex items-start gap-5">
        <GlossCard className="flex flex-[1.5] flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4.5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-foreground">Needs your approval</span>
              <span className="font-mono text-xs text-muted-foreground">{inbox.length}</span>
            </div>
            <Link href={href("/inbox")} className="group flex items-center gap-1 text-[13px] font-medium text-primary">
              Open inbox <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {inbox.map((it, i) => (
            <div key={it.id} onMouseEnter={() => setFocus(i)}>
              <ApprovalRow item={it} focused={focus === i} />
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/6 px-5 py-3 light:border-black/6">
            <span className="text-xs text-muted-foreground">+4 more · 2 secret rotations, 1 Postgres user, 1 service</span>
            <span className="font-mono text-[11px] text-muted-foreground">J/K to move · A approve · R review</span>
          </div>
        </GlossCard>

        <GlossCard className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4.5 pb-3">
            <span className="text-base font-semibold text-foreground">Your requests in flight</span>
            <span className="font-mono text-xs text-muted-foreground">{myRequests.length}</span>
          </div>
          {myRequests.map((r, ri) => (
            <div key={r.id} className="flex flex-col gap-2.5 border-t border-white/6 px-5 py-3.5 light:border-black/6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{r.title}</span>
                <StatusPill status={r.status} className="border-0 h-6 px-2" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2 + ri * 0.1 + i * 0.05, duration: 0.4, ease }}
                    style={{ transformOrigin: "left" }}
                    className={cn("h-1 flex-1 rounded-[2px]", segColor(r.status, i, r.step))}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.note}</span>
                {"action" in r && r.action && (
                  <button
                    onClick={() => toast("Retrying apply…", { description: "pos.transactions.v1 · attempt 2" })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {r.action}
                  </button>
                )}
              </div>
            </div>
          ))}
        </GlossCard>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-foreground">Platform overview</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              your 5 namespaces · <StatusDot health="ok" pulse className="size-1.5" /> live
            </span>
          </div>
          <Link href={href("/overview")} className="group flex items-center gap-1 text-[13px] font-medium text-primary">
            Full dashboard <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <Stagger className="grid grid-cols-6 gap-3">
          {overview.map((o) => {
            const Icon = OV_ICON[o.icon]
            const total = (o.bar as readonly number[]).reduce((a, b) => a + b, 0)
            return (
              <StaggerItem key={o.id}>
                <Link
                  href={href(OV_PATH[o.id])}
                  className="card-gloss group flex h-full flex-col gap-3 rounded-[16px] p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    <span className="text-[13px] font-medium">{o.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[28px] leading-8.5 font-semibold tracking-[-0.02em] text-foreground tabular-nums">{o.value}</span>
                    <span className="text-xs text-muted-foreground">{o.unit}</span>
                  </div>
                  <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-[3px]">
                    {o.bar.map((v, i) =>
                      v ? (
                        <motion.div
                          key={i}
                          initial={{ flexGrow: 0 }}
                          animate={{ flexGrow: v / total }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease }}
                          className={cn("basis-0", BAR_COLORS[i])}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="flex gap-2.5">
                    {o.legend.map(([c, l]) => (
                      <span key={l} className="text-[11px] text-muted-foreground">
                        <span className={LEGEND[c]}>●</span> {l}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 border-t border-white/6 pt-2.5 light:border-black/6">
                    {o.tone === "fail" ? (
                      <TriangleAlert className="size-[13px] shrink-0 text-destructive" />
                    ) : (
                      <Clock className="size-[13px] shrink-0 text-warning" />
                    )}
                    <span className="text-xs text-foreground">{o.alert}</span>
                  </div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>
    </ClassicPage>
  )
}
