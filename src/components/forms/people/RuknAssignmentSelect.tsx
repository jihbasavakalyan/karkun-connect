import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

type RuknAssignmentSelectProps = {
  karkunId: string
  value: string
  onChange: (ruknId: string) => void
  disabled?: boolean
  compact?: boolean
  error?: string
}

export function RuknAssignmentSelect({
  karkunId,
  value,
  onChange,
  disabled = false,
  compact = false,
  error,
}: RuknAssignmentSelectProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const options = useMemo(() => getCompatibleRuknsForKarkun(karkunId), [karkunId])

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return options
    }
    return options.filter((rukn) => rukn.name.toLowerCase().includes(normalized))
  }, [options, query])

  const selectedLabel = value
    ? formatPersonNameForDisplay(options.find((rukn) => rukn.id === value)?.name ?? '')
    : 'Unassigned'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const closeMenu = () => {
    setIsOpen(false)
    setQuery('')
  }

  const handleSelect = (ruknId: string) => {
    onChange(ruknId)
    closeMenu()
  }

  const triggerClassName = compact
    ? 'w-full min-w-[10rem] rounded-md border border-border bg-surface px-2 py-1.5 text-left text-sm text-text-heading hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
    : 'w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-base text-text-heading hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`${triggerClassName} flex min-w-0 items-center gap-1`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="shrink-0">▼</span>
        <span className="truncate">{selectedLabel}</span>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 w-full min-w-[12rem] rounded-lg border border-border bg-surface shadow-card"
        >
          <div className="border-b border-border p-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Rukn..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1 text-sm">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className={`w-full px-3 py-2 text-left hover:bg-surface-muted ${
                  !value ? 'bg-surface-muted font-medium text-primary' : 'text-text-heading'
                }`}
                onClick={() => handleSelect('')}
              >
                Unassigned
              </button>
            </li>
            {filteredOptions.map((rukn) => (
              <li key={rukn.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === rukn.id}
                  className={`w-full px-3 py-2 text-left hover:bg-surface-muted ${
                    value === rukn.id
                      ? 'bg-surface-muted font-medium text-primary'
                      : 'text-text-heading'
                  }`}
                  onClick={() => handleSelect(rukn.id)}
                >
                  {formatPersonNameForDisplay(rukn.name)}
                </button>
              </li>
            ))}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-secondary">No matching Rukns.</li>
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
