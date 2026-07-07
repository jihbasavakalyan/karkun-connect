import { useState } from 'react'
import type { PersonGender } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { ImportSummary } from '@/types/people.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { useKarkunPeopleManagement } from '@/hooks/useKarkunPeopleManagement'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { adminUnassignKarkun, changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import {
  bulkSetKarkunStatus,
  createKarkun,
  importKarkunsFromRows,
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
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [bulkBaitulMaalStatus, setBulkBaitulMaalStatus] = useState<BaitulMaalStatus | null>(null)
  const [bulkIjtemaStatus, setBulkIjtemaStatus] = useState<IjtemaAttendanceStatus | null>(null)
  const [assignmentErrors, setAssignmentErrors] = useState<Record<string, string>>({})

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

  const handleFormSubmit = (
    values: PersonFormValues,
    options?: { confirmMobileOverwrite?: boolean },
  ) => {
    const payload = { ...values, gender }
    const { assignedRuknId, ...karkunPayload } = payload

    const result = editingKarkun
      ? updateKarkun(editingKarkun.id, karkunPayload, 'Administrator', options)
      : createKarkun(karkunPayload)

    if (!result.success) {
      if (result.needsMobileConfirm && result.existingOwner) {
        setPendingFormValues(values)
        setMobileOwner(result.existingOwner)
        setFormError('')
        return
      }
      setFormError(result.error ?? 'Unable to save Karkun.')
      return
    }

    if (editingKarkun && assignedRuknId !== undefined) {
      const assignmentResult = changeKarkunRuknAssignment(editingKarkun.id, assignedRuknId)
      if (!assignmentResult.success) {
        setFormError(assignmentResult.error ?? 'Unable to update assignment.')
        return
      }
    }

    setIsFormOpen(false)
    setEditingKarkun(null)
    setFormError('')
    setPendingFormValues(null)
    setMobileOwner(null)
  }

  const confirmMobileOverwrite = () => {
    if (!pendingFormValues) {
      return
    }
    handleFormSubmit(pendingFormValues, { confirmMobileOverwrite: true })
  }

  const handleAssignmentChange = (karkun: KarkunRegistryRecord, ruknId: string) => {
    const result = changeKarkunRuknAssignment(karkun.id, ruknId)
    if (!result.success) {
      setAssignmentErrors((current) => ({
        ...current,
        [karkun.id]: result.error ?? 'Assignment failed.',
      }))
      return
    }

    setAssignmentErrors((current) => {
      if (!current[karkun.id]) {
        return current
      }
      const next = { ...current }
      delete next[karkun.id]
      return next
    })
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
        onAssignmentChange={handleAssignmentChange}
        assignmentErrors={assignmentErrors}
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
                status: editingKarkun.status,
                assignedRuknId: editingKarkun.assignedRuknId,
              }
            : { gender }
        }
        karkunId={editingKarkun?.id}
        error={formError}
        onClose={() => {
          setIsFormOpen(false)
          setEditingKarkun(null)
          setFormError('')
        }}
        onSubmit={(values) => handleFormSubmit(values)}
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
          setPendingFormValues(null)
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
