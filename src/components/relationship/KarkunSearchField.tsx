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
  return (
    <div className={sticky ? 'relationship-search-sticky' : undefined}>
      <label htmlFor={id} className="sr-only">
        Search Karkuns
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="relationship-search-input"
        autoComplete="off"
      />
      {value.trim() && resultCount !== undefined && (
        <p className="mt-2 text-sm text-secondary">
          {resultCount} match{resultCount === 1 ? '' : 'es'}
        </p>
      )}
    </div>
  )
}
