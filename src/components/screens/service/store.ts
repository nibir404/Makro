"use client"

import { useSyncExternalStore } from "react"

/** Tiny client store for staged changes on a service (shared by canvas, list, inspector). */
type Change = { id: string; label: string }
let staged: Change[] = [{ id: "na-warehouse", label: "network access to warehouse-api" }]
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export const stagedStore = {
  add(c: Change) {
    staged = [...staged.filter((x) => x.id !== c.id), c]
    emit()
  },
  remove(id: string) {
    staged = staged.filter((x) => x.id !== id)
    emit()
  },
  set(next: Change[]) {
    staged = next
    emit()
  },
  clear() {
    staged = []
    emit()
  },
  get: () => staged,
}

export function useStaged() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => staged,
    () => staged,
  )
}
