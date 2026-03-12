import { useSyncExternalStore } from 'react'

let reviewingPRs = new Set<string>()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

export function markReviewing(key: string) {
  reviewingPRs = new Set(reviewingPRs)
  reviewingPRs.add(key)
  emit()
}

export function unmarkReviewing(key: string) {
  reviewingPRs = new Set(reviewingPRs)
  reviewingPRs.delete(key)
  emit()
}

export function useReviewingPRs(): Set<string> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => reviewingPRs,
  )
}

/** Helper to build key: "owner/repo#123" */
export function prKey(repoFullName: string, prNumber: number) {
  return `${repoFullName}#${prNumber}`
}
