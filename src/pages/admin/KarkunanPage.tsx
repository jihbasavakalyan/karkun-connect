import { useState } from 'react'
import { useKarkunRegistry } from '@/hooks/useKarkunRegistry'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { AssignKarkunModal } from '@/components/forms/assignment'
import {
  AddKarkunModal,
  KarkunanFilters,
  KarkunanPagination,
  KarkunanSearchBar,
  KarkunanTable,
} from '@/components/forms/karkunan'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function KarkunanPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const registry = useKarkunRegistry()
  useAssignmentEngine()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Karkun</h1>
          <p className="mt-2 text-secondary">
            Master registry of Karkun assigned to Rukn for campaign engagement.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SecondaryButton type="button" onClick={() => setIsAssignModalOpen(true)}>
            Assign Karkun
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => setIsAddModalOpen(true)}>
            Add Karkun
          </PrimaryButton>
        </div>
      </div>

      <KarkunanSearchBar value={registry.searchQuery} onChange={registry.updateSearch} />
      <KarkunanFilters
        filters={registry.filters}
        onFilterChange={registry.updateFilter}
        onClear={registry.clearFilters}
      />
      <KarkunanTable records={registry.records} />
      <KarkunanPagination
        currentPage={registry.currentPage}
        totalPages={registry.totalPages}
        totalRecords={registry.totalRecords}
        pageSize={registry.pageSize}
        onPageChange={registry.goToPage}
      />

      <AddKarkunModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <AssignKarkunModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
    </div>
  )
}
