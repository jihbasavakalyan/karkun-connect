import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const SEARCH_DEBOUNCE_MS = 250

type KarkunSearchFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  resultCount?: number
  sticky?: boolean
}

export function KarkunSearchField({
  id,
  value,
  onChange,
  placeholder = 'Search by name, father/husband, mobile, area, or ID…',
  resultCount,
  sticky = false,
}: KarkunSearchFieldProps) {
  const [searchDraft, setSearchDraft] = useState(value)
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    setSearchDraft(value)
  }, [value])

  useEffect(() => {
    if (debouncedSearch !== value) {
      onChange(debouncedSearch)
    }
  }, [debouncedSearch, value, onChange])

  return (
    <div className={sticky ? 'relationship-search-sticky' : undefined}>
      <label htmlFor={id} className="sr-only">
        Search Karkuns
      </label>
      <input
        id={id}
        type="search"
        value={searchDraft}
        onChange={(event) => {
          const next = event.target.value
          setSearchDraft(next)
          if (!next.trim()) {
            onChange('')
          }
        }}
        placeholder={placeholder}
        className="relationship-search-input"
        autoComplete="off"
      />
      {searchDraft.trim() && resultCount !== undefined && (
        <p className="mt-2 text-sm text-secondary">
          {resultCount} match{resultCount === 1 ? '' : 'es'}
        </p>
      )}
    </div>
  )
}
