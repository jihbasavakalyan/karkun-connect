import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { AvailableKarkunCard } from '@/components/forms/rukn/AvailableKarkunCard'

const searchInputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AvailableKarkunPage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAvailableKarkunan } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return availableKarkunan
    }
    return availableKarkunan.filter((karkun) => {
      const haystack = [
        karkun.name,
        karkun.mobile,
        karkun.whatsapp ?? '',
        karkun.fatherHusbandName ?? '',
        karkun.place,
        karkun.area,
        karkun.id,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [availableKarkunan, query])

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Connect Karkun</h1>
        <p className="mt-2 text-secondary">
          Choose a Karkun from the available pool to start a connection. {availableKarkunan.length}{' '}
          available.
        </p>
      </div>

      <div>
        <label htmlFor="available-search" className="sr-only">
          Search available Karkuns
        </label>
        <input
          id="available-search"
          type="search"
          className={searchInputClassName}
          placeholder="Search by name, mobile, father/husband, place, or ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() && (
          <p className="mt-2 text-sm text-secondary">
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </p>
        )}
      </div>

      {availableKarkunan.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">No Karkun available to connect right now.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">No Karkun matches “{query}”.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((karkun) => (
            <li key={karkun.id}>
              <AvailableKarkunCard karkun={karkun} ruknId={ruknId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
