"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Check, MoreHorizontal, Network, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { accessGroups, directory, groupPeople } from "@/lib/data-ext/network-secrets"
import { StatusDot, ease } from "@/components/idp/kit"
import { Crumbs, Frame, Initials, MeAvatar, Segmented } from "./ui"

type Person = (typeof groupPeople)[number] & { added?: boolean }

/** 13c — Groups & members. */
export function GroupsScreen() {
  const wanted = useSearchParams().get("group")
  const [sel, setSel] = React.useState(accessGroups.some((g) => g.id === wanted) ? (wanted as string) : accessGroups[0].id)
  const [filter, setFilter] = React.useState("")
  const [q, setQ] = React.useState("jor")
  const [tab, setTab] = React.useState<"members" | "resources">("members")
  const [people, setPeople] = React.useState<Person[]>(groupPeople)
  const [extra, setExtra] = React.useState(9)
  const group = accessGroups.find((g) => g.id === sel)!
  const mismatches = people.filter((p) => p.mismatch).length
  const matches = q.trim() ? directory.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()) && !people.some((p) => p.id === d.id)) : []

  const add = (d: (typeof directory)[number]) => {
    setPeople((ps) => [{ id: d.id, initials: d.initials, name: d.name, online: "2 devices online", isOnline: true, added: true }, ...ps])
    setQ("")
    toast.success(`${d.name} added to ${group.name}`, {
      description: "Synced to NetBird policy " + group.policy,
      action: { label: "Undo", onClick: () => setPeople((ps) => ps.filter((p) => p.id !== d.id)) },
    })
  }
  const remove = (p: Person) => {
    setPeople((ps) => ps.filter((x) => x.id !== p.id))
    setExtra((n) => n)
    toast(`${p.name} removed from ${group.name}`, {
      description: "Devices lose access within a minute",
      action: { label: "Undo", onClick: () => setPeople((ps) => [...ps, p]) },
    })
  }

  return (
    <Frame bare crumbs={<Crumbs items={[{ label: "Network access", href: "/network", icon: <Network className="size-[15px]" /> }, { label: "Groups & members" }]} />}>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col gap-3 border-r border-line-2 p-5">
          <h2 className="text-[17px] font-semibold text-foreground">Access groups</h2>
          <div className="flex h-8 items-center gap-2 rounded-[8px] border border-line-3 px-2.5">
            <Search className="size-3.5 text-subtle" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter 14 groups" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle" />
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {accessGroups
              .filter((g) => g.name.includes(filter.toLowerCase()))
              .map((g) => (
                <button key={g.id} onClick={() => setSel(g.id)} className="relative flex items-center justify-between rounded-[10px] px-2.5 py-2 text-left">
                  {sel === g.id && <motion.span layoutId="grp-sel" transition={{ duration: 0.3, ease }} className="absolute inset-0 rounded-[10px] bg-surface-2" />}
                  <span className="relative">
                    <span className="block text-sm text-foreground">{g.name}</span>
                    <span className="block text-[11.5px] text-subtle">
                      {g.members} members · {g.resources} resources
                    </span>
                  </span>
                  {g.id === "commerce-order" && mismatches > 0 && <span className="relative text-[11.5px] text-warning">{mismatches} mismatch</span>}
                </button>
              ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                Synced with Okta group {group.okta} · NetBird policy {group.policy}
              </p>
            </div>
            <Segmented
              id="grp-tab"
              value={tab}
              onChange={setTab}
              options={[
                { value: "members", label: `Members · ${group.members}` },
                { value: "resources", label: `Resources · ${group.resources}` },
              ]}
            />
          </div>

          {tab === "members" ? (
            <>
              <div className="flex h-9 items-center gap-2 rounded-[9px] border border-foreground/80 px-3">
                <Search className="size-3.5 text-subtle" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add someone by name or email" className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle" />
              </div>
              <AnimatePresence>
                {q.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease }}
                    className="-mt-2 flex flex-col rounded-[10px] border border-line-2 bg-surface p-1.5"
                  >
                    {[...matches, ...directory.filter((d) => d.member && d.name.toLowerCase().includes(q.toLowerCase()))]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((d) => (
                        <div key={d.id} className="group flex items-center gap-3 rounded-[8px] px-2.5 py-1.5 hover:bg-surface-2">
                          <Initials>{d.initials}</Initials>
                          <div className="flex-1">
                            <div className="text-[13.5px] text-foreground">{d.name}</div>
                            <div className="text-[11.5px] text-subtle">{d.sub}</div>
                          </div>
                          {!d.member && (
                            <button onClick={() => add(d)} className="rounded-md px-2 py-1 text-[13px] text-foreground hover:bg-surface-3">
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    {matches.length === 0 && !directory.some((d) => d.member && d.name.toLowerCase().includes(q.toLowerCase())) && (
                      <div className="px-2.5 py-2 text-[13px] text-subtle">No one matches “{q}”.</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="overflow-hidden rounded-[12px] border border-line-2 bg-surface">
                <AnimatePresence initial={false}>
                  {people.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, backgroundColor: "rgba(232,80,2,0.12)" }}
                      animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.45, ease }}
                      className={cn("flex h-[47px] items-center gap-3 border-b border-line px-4", p.mismatch && "!bg-warning/5")}
                    >
                      {p.avatar ? <MeAvatar className="size-6" /> : <Initials>{p.initials}</Initials>}
                      <span className="flex-1 text-sm text-foreground">
                        {p.name}
                        {p.role && <span className="text-[12px] text-subtle"> · {p.role}</span>}
                        {p.note && <span className="text-[11.5px] text-warning"> · {p.note}</span>}
                        {p.added && <span className="text-[11.5px] text-success"> · just added</span>}
                      </span>
                      <span className={cn("flex w-40 items-center gap-1.5 text-[12.5px]", p.isOnline ? "text-success" : "text-subtle")}>
                        {p.isOnline ? <StatusDot health="ok" className="size-2" /> : <span className="size-2 rounded-full border border-subtle" />}
                        {p.online}
                      </span>
                      <span className="flex w-14 justify-end">
                        {p.mismatch ? (
                          <button onClick={() => remove(p)} className="text-[13px] text-destructive hover:underline">
                            Remove
                          </button>
                        ) : (
                          <button onClick={() => p.role !== "owner" && remove(p)} className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground" aria-label="More">
                            <MoreHorizontal className="size-4" />
                          </button>
                        )}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button onClick={() => setExtra(0)} className="w-full px-4 py-3 text-left text-[13px] text-muted-foreground hover:text-foreground">
                  {extra > 0 ? `+ ${extra} more members` : <span className="flex items-center gap-1.5"><Check className="size-3.5" /> All members shown</span>}
                </button>
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-line-2 bg-surface">
              {["warehouse-api · 10.30.8.40:443", "redis-cache-qa · 10.40.1.9:6379", "orders-api · 10.30.8.12:443", "pg-prod-orders · 10.30.2.11:5432"].map((r) => (
                <div key={r} className="flex h-11 items-center border-b border-line px-4 font-mono text-[12.5px] text-foreground last:border-0">
                  {r}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Frame>
  )
}
