import { useState } from 'react'
import { useKarkunRegistry } from '@/hooks/useKarkunRegistry'
import {
  AddKarkunModal,
  KarkunanFilters,
  KarkunanPagination,
  KarkunanSearchBar,
  KarkunanTable,
} from '@/components/forms/karkunan'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function KarkunanPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const registry = useKarkunRegistry()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Karkunan</h1>
          <p className="mt-2 text-secondary">
            Permanent master registry used across all campaigns.
          </p>
        </div>
        <PrimaryButton type="button" onClick={() => setIsAddModalOpen(true)}>
          Add Karkun
        </PrimaryButton>
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
    </div>
  )
}
