import { useMemo, useState } from 'react'
import { getAllKarkuns } from '@/lib/peopleStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'
import type { PeopleFilters, PeopleSortDirection, PeopleSortField } from '@/types/people.types'
import { PEOPLE_PAGE_SIZE } from '@/types/people.types'

const initialFilters: PeopleFilters = {
  search: '',
  gender: '',
  status: '',
  assignmentStatus: '',
}

function matchesKarkunFilters(karkun: KarkunRegistryRecord, filters: PeopleFilters): boolean {
  if (filters.gender && karkun.gender !== filters.gender) {
    return false
  }

  if (filters.status && karkun.status !== filters.status) {
    return false
  }

  if (filters.assignmentStatus === 'Assigned' && karkun.assignmentStatus !== 'Assigned') {
    return false
  }

  if (filters.assignmentStatus === 'Unassigned' && karkun.assignmentStatus !== 'Available') {
    return false
  }

  if (filters.search.trim()) {
    const normalized = filters.search.trim().toLowerCase()
    const haystack = [
      karkun.name,
      karkun.mobile,
      karkun.whatsapp ?? '',
      karkun.notes,
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(normalized)) {
      return false
    }
  }

  return true
}

function sortKarkuns(
  records: KarkunRegistryRecord[],
  field: PeopleSortField,
  direction: PeopleSortDirection,
): KarkunRegistryRecord[] {
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

export function useKarkunPeopleManagement(sectionGender: PersonGender) {
  usePeopleStore()

  const [filters, setFilters] = useState<PeopleFilters>(initialFilters)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<PeopleSortField>('name')
  const [sortDirection, setSortDirection] = useState<PeopleSortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const allKarkuns = getAllKarkuns().filter((k) => k.gender === sectionGender)

  const filteredRecords = useMemo(() => {
    const filtered = allKarkuns.filter((karkun) => matchesKarkunFilters(karkun, filters))
    return sortKarkuns(filtered, sortField, sortDirection)
  }, [allKarkuns, filters, sortField, sortDirection])

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
    sectionGender,
    filters,
    updateFilter,
    clearFilters,
    records: paginatedRecords,
    allFilteredRecords: filteredRecords,
    totalRecords: filteredRecords.length,
    totalCount: allKarkuns.length,
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
