"use client"

import * as React from "react"
import { accessLog } from "@/lib/data-ext/network-secrets"

/** Tiny client store so reveals in the editor show up on the access-log page. */
type Entry = (typeof accessLog)[number]
let entries: Entry[] = accessLog
const subs = new Set<() => void>()

export function logEntry(e: Omit<Entry, "id">) {
  entries = [{ ...e, id: `l${entries.length + 1}-${e.when}` }, ...entries]
  subs.forEach((s) => s())
}

export function useAccessLog() {
  return React.useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => entries,
    () => accessLog,
  )
}

export function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
