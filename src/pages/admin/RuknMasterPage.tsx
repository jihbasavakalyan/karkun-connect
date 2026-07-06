import { useRuknMaster } from '@/hooks/useRuknMaster'
import { RuknMasterCard } from '@/components/forms/rukn-master'

export function RuknMasterPage() {
  const { query, setQuery, ruknList, totalCount } = useRuknMaster()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Rukn Master</h1>
        <p className="mt-2 text-secondary">
          Basavakalyan Rukn registry — {totalCount} members
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rukn-master-search" className="text-sm font-medium text-text-heading">
          Search by name
        </label>
        <input
          id="rukn-master-search"
          type="search"
          value={query}
          placeholder="Search Rukn by name..."
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading placeholder:text-secondary-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <p className="text-sm text-secondary">
        Showing {ruknList.length} of {totalCount} Rukn
      </p>

      {ruknList.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">No Rukn match your search.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ruknList.map((rukn) => (
            <li key={rukn.id}>
              <RuknMasterCard rukn={rukn} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
