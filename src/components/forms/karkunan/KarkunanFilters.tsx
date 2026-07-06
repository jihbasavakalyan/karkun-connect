import { getRegistryFilterOptions } from '@/constants/mockKarkunRegistry'
import type { KarkunRegistryFilters } from '@/types/karkun-registry.types'
import { CAMPAIGN_STATUS_FILTER_OPTIONS } from '@/types/karkun-registry.types'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type KarkunanFiltersProps = {
  filters: KarkunRegistryFilters
  onFilterChange: (key: keyof KarkunRegistryFilters, value: string) => void
  onClear: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function KarkunanFilters({ filters, onFilterChange, onClear }: KarkunanFiltersProps) {
  const { areas, rukns } = getRegistryFilterOptions()

  return (
    <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-heading">Filters</h2>
        <SecondaryButton type="button" onClick={onClear} className="px-3 py-2 text-sm">
          Clear
        </SecondaryButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-status" className="text-sm font-medium text-secondary">
            Campaign Status
          </label>
          <select
            id="filter-status"
            value={filters.campaignStatus}
            onChange={(event) => onFilterChange('campaignStatus', event.target.value)}
            className={selectClassName}
          >
            {CAMPAIGN_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="filter-rukn" className="text-sm font-medium text-secondary">
            Assigned Rukn
          </label>
          <select
            id="filter-rukn"
            value={filters.assignedRukn}
            onChange={(event) => onFilterChange('assignedRukn', event.target.value)}
            className={selectClassName}
          >
            <option value="">All Rukn</option>
            {rukns.map((rukn) => (
              <option key={rukn} value={rukn}>
                {rukn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="filter-area" className="text-sm font-medium text-secondary">
            Area
          </label>
          <select
            id="filter-area"
            value={filters.area}
            onChange={(event) => onFilterChange('area', event.target.value)}
            className={selectClassName}
          >
            <option value="">All Areas</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
