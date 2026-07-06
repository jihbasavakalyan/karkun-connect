import type { PeopleFilters } from '@/types/people.types'
import {
  ASSIGNMENT_STATUS_FILTER_OPTIONS,
  GENDER_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/types/people.types'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type PeopleFiltersBarProps = {
  filters: PeopleFilters
  onFilterChange: (key: keyof PeopleFilters, value: string) => void
  onClear: () => void
  showAssignmentFilters?: boolean
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function PeopleFiltersBar({
  filters,
  onFilterChange,
  onClear,
  showAssignmentFilters = false,
}: PeopleFiltersBarProps) {
  return (
    <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-heading">Filters</h2>
        <SecondaryButton type="button" onClick={onClear} className="px-3 py-2 text-sm">
          Clear
        </SecondaryButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
          <label htmlFor="people-search" className="text-sm font-medium text-secondary">
            Quick Search
          </label>
          <input
            id="people-search"
            type="search"
            value={filters.search}
            placeholder="Search name, mobile, WhatsApp, notes..."
            onChange={(event) => onFilterChange('search', event.target.value)}
            className={selectClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="filter-gender" className="text-sm font-medium text-secondary">
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(event) => onFilterChange('gender', event.target.value)}
            className={selectClassName}
          >
            {GENDER_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="filter-status" className="text-sm font-medium text-secondary">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(event) => onFilterChange('status', event.target.value)}
            className={selectClassName}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showAssignmentFilters && (
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-assignment-status" className="text-sm font-medium text-secondary">
              Assignment
            </label>
            <select
              id="filter-assignment-status"
              value={filters.assignmentStatus}
              onChange={(event) => onFilterChange('assignmentStatus', event.target.value)}
              className={selectClassName}
            >
              {ASSIGNMENT_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
