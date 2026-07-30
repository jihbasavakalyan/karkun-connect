/**
 * KC-0112.4
 * People reads Monthly Baitul Maal through the canonical adapter.
 * Legacy write path retained until write migration.
 *
 * KC-BUG-0125 — Registry Quick Search uses canonical digit-aware matcher and
 * searches across genders while a query is active (gender tabs only silo browse).
 */
import { useMemo, useState, useEffect, useRef } from 'react'
import { getAllKarkuns, getAllMuttafiqeen } from '@/lib/peopleStore'
import { subscribeToAssignments } from '@/lib/assignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { matchesJihPortalFilters } from '@/services/jihWebPortalService'
import { matchesMonthlyBaitulMaalFiltersView } from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import { matchesWeeklyIjtemaAttendanceFiltersView } from '@/lib/operations/weeklyIjtemaReadAdapter'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { getPeopleSearchPool, personMatchesSearchQuery } from '@/lib/personResolution'
import { resolveSearchGenderHint } from '@/lib/peopleSearch'
import type {
  KarkunRegistryRecord,
  PersonCategory,
  PersonGender,
} from '@/types/karkun-registry.types'
import type { PeopleFilters, PeopleSortDirection, PeopleSortField } from '@/types/people.types'
import { PEOPLE_PAGE_SIZE } from '@/types/people.types'

const initialFilters: PeopleFilters = {
  search: '',
  gender: '',
  status: '',
  assignmentStatus: '',
  registryLifecycle: 'active',
  jihPortalRegistration: '',
  jihPortalReporting: '',
  baitulMaalStatus: '',
  baitulMaalMonth: '',
  baitulMaalYear: '',
  ijtemaAttendanceStatus: '',
  ijtemaWeek: '',
}

function matchesKarkunFilters(karkun: KarkunRegistryRecord, filters: PeopleFilters): boolean {
  const lifecycle = filters.registryLifecycle || 'active'
  if (lifecycle === 'active' && karkun.isArchived) {
    return false
  }
  if (lifecycle === 'needs_review') {
    if (!karkun.needsReview || karkun.isArchived) {
      return false
    }
  }

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

  if (filters.search.trim() && !personMatchesSearchQuery(karkun, filters.search)) {
    return false
  }

  if (
    !matchesJihPortalFilters(
      karkun.id,
      filters.jihPortalRegistration,
      filters.jihPortalReporting,
    )
  ) {
    return false
  }

  if (
    // KC-0112.4
    // People reads Monthly Baitul Maal through the canonical adapter.
    // Legacy write path retained until write migration.
    !matchesMonthlyBaitulMaalFiltersView(
      karkun.id,
      filters.baitulMaalStatus,
      filters.baitulMaalMonth,
      filters.baitulMaalYear,
    )
  ) {
    return false
  }

  if (
    // KC-0110.4
    // People reads Weekly Ijtema through the canonical adapter.
    // Legacy write path retained until write migration.
    !matchesWeeklyIjtemaAttendanceFiltersView(
      karkun.id,
      filters.ijtemaAttendanceStatus,
      filters.ijtemaWeek,
    )
  ) {
    return false
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

export function useKarkunPeopleManagement(
  sectionGender: PersonGender,
  registryCategory: PersonCategory = 'Karkun',
  options?: {
    onSearchGenderHint?: (gender: PersonGender) => void
    /** KC-0127 — hydrate filters from registry deep links (values unchanged). */
    initialFilters?: Partial<PeopleFilters>
  },
) {
  const peopleVersion = usePeopleStore()
  const [assignmentVersion, setAssignmentVersion] = useState(0)
  const [jihVersion, setJihVersion] = useState(0)
  const [baitulMaalVersion, setBaitulMaalVersion] = useState(0)
  const [ijtemaVersion, setIjtemaVersion] = useState(0)

  useEffect(() => {
    const unsubAssignments = subscribeToAssignments(() =>
      setAssignmentVersion((value) => value + 1),
    )
    const unsubJih = subscribeToJihWebPortalStore(() => setJihVersion((value) => value + 1))
    const unsubBaitulMaal = subscribeToBaitulMaalStore(() =>
      setBaitulMaalVersion((value) => value + 1),
    )
    // KC-0112.4: People BM filters refresh when canonical cycle submissions change.
    const unsubMonthlyBaitulMaal = subscribeToMonthlyBaitulMaalStore(() =>
      setBaitulMaalVersion((value) => value + 1),
    )
    const unsubIjtema = subscribeToIjtemaAttendanceStore(() =>
      setIjtemaVersion((value) => value + 1),
    )
    const unsubWeeklyIjtema = subscribeToWeeklyIjtemaStore(() =>
      setIjtemaVersion((value) => value + 1),
    )
    return () => {
      unsubAssignments()
      unsubJih()
      unsubBaitulMaal()
      unsubMonthlyBaitulMaal()
      unsubIjtema()
      unsubWeeklyIjtema()
    }
  }, [])

  const [filters, setFilters] = useState<PeopleFilters>(() => ({
    ...initialFilters,
    ...options?.initialFilters,
  }))
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<PeopleSortField>('name')
  const [sortDirection, setSortDirection] = useState<PeopleSortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const genderHintRef = useRef(options?.onSearchGenderHint)
  useEffect(() => {
    genderHintRef.current = options?.onSearchGenderHint
  }, [options?.onSearchGenderHint])

  const registryPool = useMemo(
    () => {
      // Browse: category-exclusive. Search: full people pool via Person Resolution
      // so duplicate-detection hits are always discoverable on either registry page.
      if (filters.search.trim()) {
        return getPeopleSearchPool(registryCategory)
      }
      return registryCategory === 'Muttafiq' ? getAllMuttafiqeen() : getAllKarkuns(false)
    },
    // peopleVersion invalidates after mutable MOCK_KARKUN_REGISTRY hydrate
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [peopleVersion, registryCategory, filters.search],
  )

  const searching = filters.search.trim().length > 0

  const allKarkuns = useMemo(() => {
    // Browse mode: gender tab silos the list.
    // Search mode: every active person is discoverable (KC-BUG-0125 + KC-0128).
    if (searching) {
      return registryPool
    }
    return registryPool.filter((k) => k.gender === sectionGender)
  }, [registryPool, sectionGender, searching])

  useEffect(() => {
    if (!searching || !genderHintRef.current) {
      return
    }
    const hint = resolveSearchGenderHint(registryPool, filters.search)
    if (hint && hint !== sectionGender) {
      genderHintRef.current(hint)
    }
  }, [searching, filters.search, registryPool, sectionGender])

  const filteredRecords = useMemo(() => {
    void assignmentVersion
    void jihVersion
    void baitulMaalVersion
    void ijtemaVersion
    const filtered = allKarkuns.filter((karkun) => matchesKarkunFilters(karkun, filters))
    return sortKarkuns(filtered, sortField, sortDirection)
  }, [
    allKarkuns,
    filters,
    sortField,
    sortDirection,
    assignmentVersion,
    jihVersion,
    baitulMaalVersion,
    ijtemaVersion,
  ])

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
    registryPoolCount: registryPool.length,
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
