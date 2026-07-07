type KarkunanSearchBarProps = {
  value: string
  onChange: (value: string) => void
}

export function KarkunanSearchBar({ value, onChange }: KarkunanSearchBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="karkunan-search" className="text-sm font-medium text-text-heading">
        Search
      </label>
      <input
        id="karkunan-search"
        type="search"
        value={value}
        placeholder="Search by name, mobile, area, or connected Rukn..."
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading placeholder:text-secondary-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}
