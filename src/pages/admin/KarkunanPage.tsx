import { useState } from 'react'
import type { PersonGender } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { ImportSummary } from '@/types/people.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { useKarkunPeopleManagement } from '@/hooks/useKarkunPeopleManagement'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { adminUnassignKarkun } from '@/lib/assignmentEngine'
import {
  bulkSetKarkunStatus,
  createKarkun,
  importKarkunsFromRows,
  setKarkunStatus,
  updateKarkun,
} from '@/lib/peopleStore'
import {
  exportKarkuns,
  parsePeopleImportFile,
  readImportFile,
} from '@/lib/peopleImportExport'
import {
  BulkActionsBar,
  ConfirmDialog,
  ImportExportToolbar,
  ImportSummaryModal,
  KarkunPeopleTable,
  MobileUpdateModal,
  PeopleFiltersBar,
  PeoplePagination,
  PersonFormModal,
} from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { AssignKarkunModal } from '@/components/forms/assignment'
import { BaitulMaalBulkUpdateModal } from '@/components/forms/baitulMaal/BaitulMaalBulkUpdateModal'
import { IjtemaAttendanceBulkUpdateModal } from '@/components/forms/ijtema/IjtemaAttendanceBulkUpdateModal'
import type { BaitulMaalStatus } from '@/types/baitulMaal'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type GenderTab = PersonGender

function KarkunGenderSection({ gender }: { gender: PersonGender }) {
  const management = useKarkunPeopleManagement(gender)
  useAssignmentEngine()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editingKarkun, setEditingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [mobileTarget, setMobileTarget] = useState<KarkunRegistryRecord | null>(null)
  const [mobileError, setMobileError] = useState('')
  const [pendingMobile, setPendingMobile] = useState('')
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [bulkBaitulMaalStatus, setBulkBaitulMaalStatus] = useState<BaitulMaalStatus | null>(null)
  const [bulkIjtemaStatus, setBulkIjtemaStatus] = useState<IjtemaAttendanceStatus | null>(null)

  const openAddForm = () => {
    setEditingKarkun(null)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (karkun: KarkunRegistryRecord) => {
    setEditingKarkun(karkun)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = (values: PersonFormValues) => {
    const payload = { ...values, gender }

    const result = editingKarkun
      ? updateKarkun(editingKarkun.id, payload)
      : createKarkun(payload)

    if (!result.success) {
      setFormError(result.error ?? 'Unable to save Karkun.')
      return
    }

    setIsFormOpen(false)
    setEditingKarkun(null)
    setFormError('')
  }

  const handleMobileSubmit = (mobile: string) => {
    if (!mobileTarget) return

    const result = updateKarkun(mobileTarget.id, { mobile })
    if (!result.success && result.needsMobileConfirm && result.existingOwner) {
      setPendingMobile(mobile)
      setMobileOwner(result.existingOwner)
      setMobileError('')
      return
    }

    if (!result.success) {
      setMobileError(result.error ?? 'Unable to update mobile.')
      return
    }

    setMobileTarget(null)
    setMobileError('')
  }

  const confirmMobileOverwrite = () => {
    if (!mobileTarget || !pendingMobile) return
    const result = updateKarkun(
      mobileTarget.id,
      { mobile: pendingMobile },
      'Administrator',
      { confirmMobileOverwrite: true },
    )
    if (!result.success) {
      setMobileError(result.error ?? 'Unable to update mobile.')
      return
    }
    setMobileOwner(null)
    setPendingMobile('')
    setMobileTarget(null)
    setMobileError('')
  }

  const handleImport = async (file: File) => {
    const content = await readImportFile(file)
    const rows = parsePeopleImportFile(content, 'karkun').filter((row) => row.gender === gender)
    const summary = importKarkunsFromRows(rows)
    setImportSummary(summary)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-secondary">
          {gender} Karkun registry — {management.totalCount} members
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ImportExportToolbar
            kind="karkun"
            onExport={(format) => exportKarkuns(management.allFilteredRecords, format)}
            onImport={handleImport}
          />
          <SecondaryButton type="button" onClick={() => setIsAssignModalOpen(true)}>
            Assign Karkun
          </SecondaryButton>
          <PrimaryButton type="button" onClick={openAddForm}>
            Add {gender} Karkun
          </PrimaryButton>
        </div>
      </div>

      <PeopleFiltersBar
        filters={management.filters}
        onFilterChange={management.updateFilter}
        onClear={management.clearFilters}
        showAssignmentFilters
        showJihPortalFilters
        showBaitulMaalFilters
        showIjtemaFilters
      />

      <BulkActionsBar
        selectedCount={management.selectedIds.length}
        onActivate={() => {
          bulkSetKarkunStatus(management.selectedIds, 'active')
          management.clearSelection()
        }}
        onDeactivate={() => {
          bulkSetKarkunStatus(management.selectedIds, 'inactive')
          management.clearSelection()
        }}
        onUnassign={() => {
          for (const id of management.selectedIds) {
            adminUnassignKarkun(id)
          }
          management.clearSelection()
        }}
        onMarkBaitulMaalPaid={() => setBulkBaitulMaalStatus('Paid')}
        onMarkBaitulMaalPending={() => setBulkBaitulMaalStatus('Pending')}
        onMarkIjtemaPresent={() => setBulkIjtemaStatus('Present')}
        onMarkIjtemaAbsent={() => setBulkIjtemaStatus('Absent')}
        onMarkIjtemaInformed={() => setBulkIjtemaStatus('Informed')}
        onClearSelection={management.clearSelection}
      />

      <p className="text-sm text-secondary">
        Showing {management.records.length} of {management.totalRecords} filtered
      </p>

      <KarkunPeopleTable
        records={management.records}
        selectedIds={management.selectedIds}
        sortField={management.sortField}
        sortDirection={management.sortDirection}
        onToggleSort={management.toggleSort}
        onToggleSelection={management.toggleSelection}
        onToggleSelectAll={management.toggleSelectAll}
        onEdit={openEditForm}
        onToggleStatus={(karkun) =>
          setKarkunStatus(karkun.id, karkun.status === 'active' ? 'inactive' : 'active')
        }
        onUpdateMobile={(karkun) => {
          setMobileTarget(karkun)
          setMobileError('')
        }}
        onUnassign={(karkun) => adminUnassignKarkun(karkun.id)}
      />

      <PeoplePagination
        currentPage={management.currentPage}
        totalPages={management.totalPages}
        totalRecords={management.totalRecords}
        pageSize={management.pageSize}
        onPageChange={management.goToPage}
      />

      <PersonFormModal
        isOpen={isFormOpen}
        kind="karkun"
        mode={editingKarkun ? 'edit' : 'add'}
        initialValues={
          editingKarkun
            ? {
                name: editingKarkun.name,
                gender: editingKarkun.gender,
                mobile: editingKarkun.mobile,
                whatsapp: editingKarkun.whatsapp,
                place: editingKarkun.place,
                status: editingKarkun.status,
                notes: editingKarkun.notes,
                area: editingKarkun.area,
                address: editingKarkun.address,
              }
            : { gender }
        }
        error={formError}
        onClose={() => {
          setIsFormOpen(false)
          setEditingKarkun(null)
          setFormError('')
        }}
        onSubmit={handleFormSubmit}
      />

      <MobileUpdateModal
        isOpen={Boolean(mobileTarget)}
        personName={mobileTarget?.name ?? ''}
        currentMobile={mobileTarget?.mobile ?? ''}
        error={mobileError}
        onClose={() => {
          setMobileTarget(null)
          setMobileError('')
        }}
        onSubmit={handleMobileSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(mobileOwner)}
        title="Overwrite Mobile Number?"
        message={
          <>
            This mobile number is already used by{' '}
            <strong>{mobileOwner?.name}</strong> ({mobileOwner?.kind}). Continue?
          </>
        }
        confirmLabel="Overwrite"
        onConfirm={confirmMobileOverwrite}
        onClose={() => {
          setMobileOwner(null)
          setPendingMobile('')
        }}
      />

      <ImportSummaryModal
        isOpen={Boolean(importSummary)}
        summary={importSummary}
        kind="karkun"
        onClose={() => setImportSummary(null)}
      />

      <AssignKarkunModal
        isOpen={isAssignModalOpen}
        genderFilter={gender}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <BaitulMaalBulkUpdateModal
        isOpen={bulkBaitulMaalStatus !== null}
        selectedCount={management.selectedIds.length}
        status={bulkBaitulMaalStatus ?? 'Pending'}
        karkunIds={management.selectedIds}
        onClose={() => setBulkBaitulMaalStatus(null)}
        onComplete={() => management.clearSelection()}
      />

      <IjtemaAttendanceBulkUpdateModal
        isOpen={bulkIjtemaStatus !== null}
        selectedCount={management.selectedIds.length}
        status={bulkIjtemaStatus ?? 'Present'}
        karkunIds={management.selectedIds}
        onClose={() => setBulkIjtemaStatus(null)}
        onComplete={() => management.clearSelection()}
      />
    </div>
  )
}

export function KarkunanPage() {
  const [activeGender, setActiveGender] = useState<GenderTab>('Male')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Karkun Management</h1>
        <p className="mt-2 text-secondary">
          Manage Male and Female Karkun contacts, assignments, and status separately.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['Male', 'Female'] as const).map((gender) => (
          <button
            key={gender}
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeGender === gender
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-heading'
            }`}
            onClick={() => setActiveGender(gender)}
          >
            {gender} Karkuns
          </button>
        ))}
      </div>

      <KarkunGenderSection key={activeGender} gender={activeGender} />
    </div>
  )
}
