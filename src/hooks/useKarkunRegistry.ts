import { useMemo, useState } from 'react'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { KARKUN_REGISTRY_PAGE_SIZE } from '@/types/karkun-registry.types'
import type { KarkunRegistryFilters, KarkunRegistryRecord } from '@/types/karkun-registry.types'

const initialFilters: KarkunRegistryFilters = {
  campaignStatus: '',
  assignedRukn: '',
  area: '',
  gender: '',
  status: '',
  assignmentStatus: '',
}

function matchesSearch(karkun: KarkunRegistryRecord, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  return [karkun.name, karkun.mobile, karkun.area, karkun.assignedRukn].some((field) =>
    field.toLowerCase().includes(normalized),
  )
}

function matchesFilters(karkun: KarkunRegistryRecord, filters: KarkunRegistryFilters): boolean {
  if (filters.campaignStatus && karkun.campaignStatus !== filters.campaignStatus) {
    return false
  }

  if (filters.assignedRukn && karkun.assignedRukn !== filters.assignedRukn) {
    return false
  }

  if (filters.area && karkun.area !== filters.area) {
    return false
  }

  return true
}

export function useKarkunRegistry() {
  usePeopleStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<KarkunRegistryFilters>(initialFilters)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredRecords = useMemo(() => {
    return MOCK_KARKUN_REGISTRY.filter(
      (karkun) => !karkun.isArchived && matchesSearch(karkun, searchQuery) && matchesFilters(karkun, filters),
    )
  }, [searchQuery, filters])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / KARKUN_REGISTRY_PAGE_SIZE))

  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * KARKUN_REGISTRY_PAGE_SIZE
    return filteredRecords.slice(start, start + KARKUN_REGISTRY_PAGE_SIZE)
  }, [filteredRecords, currentPage, totalPages])

  const updateSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const updateFilter = (key: keyof KarkunRegistryFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  return {
    searchQuery,
    filters,
    records: paginatedRecords,
    totalRecords: filteredRecords.length,
    currentPage: Math.min(currentPage, totalPages),
    totalPages,
    pageSize: KARKUN_REGISTRY_PAGE_SIZE,
    updateSearch,
    updateFilter,
    clearFilters,
    goToPage,
  }
}
