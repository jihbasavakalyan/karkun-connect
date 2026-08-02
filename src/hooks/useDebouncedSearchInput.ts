import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const DEFAULT_DEBOUNCE_MS = 250

/**
 * Local draft drives the input; debounced commits update the parent filter.
 * Skips syncing parent → draft when the parent change came from our own commit
 * so backspace/delete is not overwritten by a stale debounced value.
 */
export function useDebouncedSearchInput(
  committedValue: string,
  onCommit: (value: string) => void,
  delayMs = DEFAULT_DEBOUNCE_MS,
) {
  const [draft, setDraft] = useState(committedValue)
  const debouncedDraft = useDebouncedValue(draft, delayMs)
  const pendingCommitRef = useRef<string | null>(null)

  useEffect(() => {
    if (debouncedDraft === committedValue) {
      return
    }
    pendingCommitRef.current = debouncedDraft
    onCommit(debouncedDraft)
  }, [debouncedDraft, committedValue, onCommit])

  useEffect(() => {
    if (committedValue === pendingCommitRef.current) {
      pendingCommitRef.current = null
      return
    }
    setDraft(committedValue)
  }, [committedValue])

  const setDraftValue = (value: string) => {
    setDraft(value)
    if (!value.trim()) {
      pendingCommitRef.current = ''
      onCommit('')
    }
  }

  const clearDraft = () => {
    setDraft('')
    pendingCommitRef.current = ''
    onCommit('')
  }

  const commitNow = () => {
    pendingCommitRef.current = draft
    onCommit(draft)
  }

  return { draft, setDraftValue, clearDraft, commitNow }
}
