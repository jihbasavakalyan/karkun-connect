import { useMemo, useState } from 'react'
import type { Rukn } from '@/data/ruknMaster'
import { getAllRukns } from '@/lib/peopleStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import type { PeopleFilters, PeopleSortDirection, PeopleSortField } from '@/types/people.types'
import { PEOPLE_PAGE_SIZE } from '@/types/people.types'

const initialFilters: PeopleFilters = {
  search: '',
  gender: '',
  status: '',
  assignmentStatus: '',
  registryLifecycle: '',
  jihPortalRegistration: '',
  jihPortalReporting: '',
  baitulMaalStatus: '',
  baitulMaalMonth: '',
  baitulMaalYear: '',
  ijtemaAttendanceStatus: '',
  ijtemaWeek: '',
}

function matchesRuknFilters(rukn: Rukn, filters: PeopleFilters): boolean {
  if (filters.gender && rukn.gender !== filters.gender) {
    return false
  }

  if (filters.status && rukn.status !== filters.status) {
    return false
  }

  if (filters.search.trim()) {
    const normalized = filters.search.trim().toLowerCase()
    const haystack = [
      rukn.name,
      rukn.mobile,
      rukn.whatsapp ?? '',
      rukn.notes ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(normalized)) {
      return false
    }
  }

  return true
}

function sortRukns(
  records: Rukn[],
  field: PeopleSortField,
  direction: PeopleSortDirection,
): Rukn[] {
  const sorted = [...records].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'mobile':
        comparison = a.mobile.localeCompare(b.mobile)
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'createdAt':
        comparison = a.createdAt.localeCompare(b.createdAt)
        break
      case 'updatedAt':
        comparison = a.updatedAt.localeCompare(b.updatedAt)
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

export function useRuknManagement() {
  const peopleVersion = usePeopleStore()

  const [filters, setFilters] = useState<PeopleFilters>(initialFilters)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<PeopleSortField>('name')
  const [sortDirection, setSortDirection] = useState<PeopleSortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const allRukns = useMemo(
    () => getAllRukns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [peopleVersion],
  )

  const filteredRecords = useMemo(() => {
    const filtered = allRukns.filter((rukn) => matchesRuknFilters(rukn, filters))
    return sortRukns(filtered, sortField, sortDirection)
  }, [allRukns, filters, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PEOPLE_PAGE_SIZE))

  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * PEOPLE_PAGE_SIZE
    return filteredRecords.slice(start, start + PEOPLE_PAGE_SIZE)
  }, [filteredRecords, currentPage, totalPages])

  const updateFilter = (key: keyof PeopleFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setCurrentPage(1)
  }

  const toggleSort = (field: PeopleSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const toggleSelectAll = () => {
    const pageIds = paginatedRecords.map((r) => r.id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((current) => [...new Set([...current, ...pageIds])])
    }
  }

  const clearSelection = () => setSelectedIds([])

  return {
    filters,
    updateFilter,
    clearFilters,
    records: paginatedRecords,
    allFilteredRecords: filteredRecords,
    totalRecords: filteredRecords.length,
    totalCount: allRukns.length,
    currentPage: Math.min(currentPage, totalPages),
    totalPages,
    pageSize: PEOPLE_PAGE_SIZE,
    goToPage: (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages)),
    sortField,
    sortDirection,
    toggleSort,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
  }
}
