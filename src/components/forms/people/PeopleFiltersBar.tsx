import { useMemo, useState, type FormEvent } from 'react'
import type { PeopleFilters } from '@/types/people.types'
import {
  ASSIGNMENT_STATUS_FILTER_OPTIONS,
  GENDER_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  formatPersonStatus,
} from '@/types/people.types'
import {
  JIH_PORTAL_REGISTRATION_FILTER_OPTIONS,
  JIH_PORTAL_REPORTING_FILTER_OPTIONS,
} from '@/types/jihWebPortal'
import {
  BAITUL_MAAL_MONTH_FILTER_OPTIONS,
  BAITUL_MAAL_STATUS_FILTER_OPTIONS,
  getBaitulMaalYearFilterOptions,
} from '@/types/baitulMaal'
import {
  IJTEMA_ATTENDANCE_STATUS_FILTER_OPTIONS,
  getIjtemaWeekFilterOptions,
} from '@/types/ijtemaAttendance'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type PeopleFiltersBarProps = {
  filters: PeopleFilters
  onFilterChange: (key: keyof PeopleFilters, value: string) => void
  onClear: () => void
  showAssignmentFilters?: boolean
  showJihPortalFilters?: boolean
  showBaitulMaalFilters?: boolean
  showIjtemaFilters?: boolean
  hideGenderFilter?: boolean
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const QUICK_SEARCH_PLACEHOLDER = 'Search by Name or Mobile...'

function labelForOption(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function buildActiveFilterSummary(
  filters: PeopleFilters,
  config: {
    showAssignmentFilters: boolean
    showJihPortalFilters: boolean
    showBaitulMaalFilters: boolean
    showIjtemaFilters: boolean
    hideGenderFilter: boolean
    yearFilterOptions: { value: string; label: string }[]
    weekFilterOptions: { value: string; label: string }[]
  },
): { label: string; value: string }[] {
  const entries: { label: string; value: string }[] = []

  if (!config.hideGenderFilter && filters.gender) {
    entries.push({
      label: 'Gender',
      value: labelForOption(GENDER_FILTER_OPTIONS, filters.gender),
    })
  }

  if (filters.status) {
    entries.push({
      label: 'Status',
      value: formatPersonStatus(filters.status),
    })
  }

  if (config.showAssignmentFilters && filters.assignmentStatus) {
    entries.push({
      label: 'Connection',
      value: labelForOption(ASSIGNMENT_STATUS_FILTER_OPTIONS, filters.assignmentStatus),
    })
  }

  if (config.showJihPortalFilters && filters.jihPortalRegistration) {
    entries.push({
      label: 'Portal Registration',
      value: labelForOption(JIH_PORTAL_REGISTRATION_FILTER_OPTIONS, filters.jihPortalRegistration),
    })
  }

  if (config.showJihPortalFilters && filters.jihPortalReporting) {
    entries.push({
      label: 'Reporting Status',
      value: labelForOption(JIH_PORTAL_REPORTING_FILTER_OPTIONS, filters.jihPortalReporting),
    })
  }

  if (config.showBaitulMaalFilters && filters.baitulMaalStatus) {
    entries.push({
      label: 'Payment Status',
      value: labelForOption(BAITUL_MAAL_STATUS_FILTER_OPTIONS, filters.baitulMaalStatus),
    })
  }

  if (config.showBaitulMaalFilters && filters.baitulMaalMonth) {
    entries.push({
      label: 'Month',
      value: labelForOption(BAITUL_MAAL_MONTH_FILTER_OPTIONS, filters.baitulMaalMonth),
    })
  }

  if (config.showBaitulMaalFilters && filters.baitulMaalYear) {
    entries.push({
      label: 'Year',
      value: labelForOption(config.yearFilterOptions, filters.baitulMaalYear),
    })
  }

  if (config.showIjtemaFilters && filters.ijtemaAttendanceStatus) {
    entries.push({
      label: 'Ijtema',
      value: labelForOption(IJTEMA_ATTENDANCE_STATUS_FILTER_OPTIONS, filters.ijtemaAttendanceStatus),
    })
  }

  if (config.showIjtemaFilters && filters.ijtemaWeek) {
    entries.push({
      label: 'Week',
      value: labelForOption(config.weekFilterOptions, filters.ijtemaWeek),
    })
  }

  return entries
}

export function PeopleFiltersBar({
  filters,
  onFilterChange,
  onClear,
  showAssignmentFilters = false,
  showJihPortalFilters = false,
  showBaitulMaalFilters = false,
  showIjtemaFilters = false,
  hideGenderFilter = false,
}: PeopleFiltersBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const activeFilters = useMemo(() => {
    const yearFilterOptions = getBaitulMaalYearFilterOptions()
    const weekFilterOptions = getIjtemaWeekFilterOptions()

    return buildActiveFilterSummary(filters, {
      showAssignmentFilters,
      showJihPortalFilters,
      showBaitulMaalFilters,
      showIjtemaFilters,
      hideGenderFilter,
      yearFilterOptions,
      weekFilterOptions,
    })
  }, [
    filters,
    showAssignmentFilters,
    showJihPortalFilters,
    showBaitulMaalFilters,
    showIjtemaFilters,
    hideGenderFilter,
  ])

  const yearFilterOptions = getBaitulMaalYearFilterOptions()
  const weekFilterOptions = getIjtemaWeekFilterOptions()

  const applySearch = (value: string) => {
    onFilterChange('search', value)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applySearch(filters.search)
  }

  const handleClear = () => {
    onClear()
  }

  return (
    <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <form className="flex flex-col gap-3 lg:flex-row lg:items-end" onSubmit={handleSearchSubmit}>
        <div className="min-w-0 flex-1">
          <label htmlFor="people-search" className="text-sm font-medium text-text-heading">
            Quick Search
          </label>
          <input
            id="people-search"
            type="search"
            value={filters.search}
            placeholder={QUICK_SEARCH_PLACEHOLDER}
            onChange={(event) => applySearch(event.target.value)}
            className={`${selectClassName} mt-2`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit" className="px-4 py-2 text-sm">
            🔍 Search
          </PrimaryButton>
          <SecondaryButton
            type="button"
            className="px-4 py-2 text-sm"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            Advanced Filters {advancedOpen ? '▲' : '▼'}
          </SecondaryButton>
          <SecondaryButton type="button" className="px-4 py-2 text-sm" onClick={handleClear}>
            Clear
          </SecondaryButton>
        </div>
      </form>

      {advancedOpen && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {!hideGenderFilter && (
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
          )}

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
                Connection
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

          {showJihPortalFilters && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="filter-jih-registration" className="text-sm font-medium text-secondary">
                  Portal Registration
                </label>
                <select
                  id="filter-jih-registration"
                  value={filters.jihPortalRegistration}
                  onChange={(event) => onFilterChange('jihPortalRegistration', event.target.value)}
                  className={selectClassName}
                >
                  {JIH_PORTAL_REGISTRATION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="filter-jih-reporting" className="text-sm font-medium text-secondary">
                  Reporting Status
                </label>
                <select
                  id="filter-jih-reporting"
                  value={filters.jihPortalReporting}
                  onChange={(event) => onFilterChange('jihPortalReporting', event.target.value)}
                  className={selectClassName}
                >
                  {JIH_PORTAL_REPORTING_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {showBaitulMaalFilters && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="filter-baitul-maal-status" className="text-sm font-medium text-secondary">
                  Payment Status
                </label>
                <select
                  id="filter-baitul-maal-status"
                  value={filters.baitulMaalStatus}
                  onChange={(event) => onFilterChange('baitulMaalStatus', event.target.value)}
                  className={selectClassName}
                >
                  {BAITUL_MAAL_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="filter-baitul-maal-month" className="text-sm font-medium text-secondary">
                  Month
                </label>
                <select
                  id="filter-baitul-maal-month"
                  value={filters.baitulMaalMonth}
                  onChange={(event) => onFilterChange('baitulMaalMonth', event.target.value)}
                  className={selectClassName}
                >
                  {BAITUL_MAAL_MONTH_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="filter-baitul-maal-year" className="text-sm font-medium text-secondary">
                  Year
                </label>
                <select
                  id="filter-baitul-maal-year"
                  value={filters.baitulMaalYear}
                  onChange={(event) => onFilterChange('baitulMaalYear', event.target.value)}
                  className={selectClassName}
                >
                  {yearFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {showIjtemaFilters && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="filter-ijtema-status" className="text-sm font-medium text-secondary">
                  Attendance
                </label>
                <select
                  id="filter-ijtema-status"
                  value={filters.ijtemaAttendanceStatus}
                  onChange={(event) => onFilterChange('ijtemaAttendanceStatus', event.target.value)}
                  className={selectClassName}
                >
                  {IJTEMA_ATTENDANCE_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="filter-ijtema-week" className="text-sm font-medium text-secondary">
                  Week
                </label>
                <select
                  id="filter-ijtema-week"
                  value={filters.ijtemaWeek}
                  onChange={(event) => onFilterChange('ijtemaWeek', event.target.value)}
                  className={selectClassName}
                >
                  {weekFilterOptions.map((option) => (
                    <option key={option.value || 'current'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-heading">Active Filters</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary">
                {activeFilters.map((entry) => (
                  <li key={`${entry.label}-${entry.value}`}>
                    <span className="font-medium text-text-heading">{entry.label}:</span> {entry.value}
                  </li>
                ))}
              </ul>
            </div>
            <SecondaryButton type="button" className="shrink-0 px-3 py-2 text-sm" onClick={handleClear}>
              Clear All
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
