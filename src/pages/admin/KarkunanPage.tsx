import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { PersonGender } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { ImportSummary } from '@/types/people.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { useKarkunPeopleManagement } from '@/hooks/useKarkunPeopleManagement'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { adminUnassignKarkun, changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import { toOperatorAssignmentError } from '@/lib/assignment/operatorFacingError'
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
  type ExportFormat,
} from '@/lib/peopleImportExport'
import {
  bulkUpdateJihMonthlyReport,
  bulkUpdateJihRegistration,
} from '@/services/jihWebPortalService'
import {
  BulkActionsBar,
  ConfirmDialog,
  ImportSummaryModal,
  KarkunPeopleActionBar,
  KarkunPeopleTable,
  PeopleFiltersBar,
  PeoplePagination,
  PersonFormModal,
} from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { AssignKarkunModal } from '@/components/forms/assignment'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { useCommunication } from '@/hooks/useCommunication'
import { BaitulMaalBulkUpdateModal } from '@/components/forms/baitulMaal/BaitulMaalBulkUpdateModal'
import { IjtemaAttendanceBulkUpdateModal } from '@/components/forms/ijtema/IjtemaAttendanceBulkUpdateModal'
import type { BaitulMaalStatus } from '@/types/baitulMaal'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'
import { PageHeader, PageShell } from '@/components/ui'

type GenderTab = PersonGender

function applyBulkJihRegistration(
  karkunIds: string[],
  status: 'Registered' | 'Not Registered',
  onComplete: () => void,
) {
  const result = bulkUpdateJihRegistration({ karkunIds, status })
  if (result.success) {
    onComplete()
  }
}

function applyBulkJihMonthlyReport(
  karkunIds: string[],
  status: 'Submitted' | 'Pending',
  onComplete: () => void,
) {
  const result = bulkUpdateJihMonthlyReport({ karkunIds, status })
  if (result.success) {
    onComplete()
  }
}

type KarkunSectionHandlers = {
  openAddForm: () => void
  openAssign: () => void
  handleImport: (file: File) => void
  handleExport: (format: ExportFormat) => void
}

type KarkunGenderSectionProps = {
  gender: PersonGender
  shouldOpenAddForm: boolean
  initialSearch?: string
  onAddFormOpened: () => void
  onRegisterHandlers: (handlers: KarkunSectionHandlers | null) => void
}

function KarkunGenderSection({
  gender,
  shouldOpenAddForm,
  initialSearch = '',
  onAddFormOpened,
  onRegisterHandlers,
}: KarkunGenderSectionProps) {
  const management = useKarkunPeopleManagement(gender)
  useAssignmentEngine()

  const [isFormOpen, setIsFormOpen] = useState(shouldOpenAddForm)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editingKarkun, setEditingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [bulkBaitulMaalStatus, setBulkBaitulMaalStatus] = useState<BaitulMaalStatus | null>(null)
  const [bulkIjtemaStatus, setBulkIjtemaStatus] = useState<IjtemaAttendanceStatus | null>(null)
  const [assignmentErrors, setAssignmentErrors] = useState<Record<string, string>>({})
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false)
  const { sendBroadcastMessage } = useCommunication()

  const openAddForm = useCallback(() => {
    setEditingKarkun(null)
    setFormError('')
    setIsFormOpen(true)
  }, [])

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

    void (async () => {
      if (editingKarkun && assignedRuknId !== undefined) {
        const assignmentResult = await changeKarkunRuknAssignment(editingKarkun.id, assignedRuknId)
        if (!assignmentResult.success) {
          setFormError(assignmentResult.error ?? 'Unable to update connection.')
          return
        }
      }

      setIsFormOpen(false)
      setEditingKarkun(null)
      setFormError('')
      setPendingFormValues(null)
      setMobileOwner(null)
    })()
  }

  const confirmMobileOverwrite = () => {
    if (!pendingFormValues) {
      return
    }
    handleFormSubmit(pendingFormValues, { confirmMobileOverwrite: true })
  }

  const handleAssignmentChange = (karkun: KarkunRegistryRecord, ruknId: string): boolean => {
    void (async () => {
      try {
        const result = await changeKarkunRuknAssignment(karkun.id, ruknId)
        if (!result.success) {
          setAssignmentErrors((current) => ({
            ...current,
            [karkun.id]: toOperatorAssignmentError(result.error),
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
      } catch (error) {
        setAssignmentErrors((current) => ({
          ...current,
          [karkun.id]: toOperatorAssignmentError(
            error instanceof Error ? error.message : String(error),
          ),
        }))
      }
    })()
    return true
  }

  const handleImport = useCallback(async (file: File) => {
    const content = await readImportFile(file)
    const rows = parsePeopleImportFile(content, 'karkun').filter((row) => row.gender === gender)
    const summary = importKarkunsFromRows(rows)
    setImportSummary(summary)
  }, [gender])

  const filteredRecordsRef = useRef(management.allFilteredRecords)

  useEffect(() => {
    filteredRecordsRef.current = management.allFilteredRecords
  }, [management.allFilteredRecords])

  useEffect(() => {
    onRegisterHandlers({
      openAddForm,
      openAssign: () => setIsAssignModalOpen(true),
      handleImport: (file) => {
        void handleImport(file)
      },
      handleExport: (format) => exportKarkuns(filteredRecordsRef.current, format),
    })

    return () => onRegisterHandlers(null)
  }, [gender, onRegisterHandlers, handleImport, openAddForm])

  useEffect(() => {
    if (shouldOpenAddForm) {
      onAddFormOpened()
    }
  }, [shouldOpenAddForm, onAddFormOpened])

  useEffect(() => {
    if (!initialSearch.trim()) {
      return
    }
    management.updateFilter('search', initialSearch.trim())
    // Apply global search once when arriving from the command bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">
        {gender} Karkun registry — {management.totalCount} members
      </p>

      <PeopleFiltersBar
        filters={management.filters}
        onFilterChange={management.updateFilter}
        onClear={management.clearFilters}
        showAssignmentFilters
        showJihPortalFilters
        showBaitulMaalFilters
        showIjtemaFilters
        hideGenderFilter
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
          void (async () => {
            for (const id of management.selectedIds) {
              const result = await adminUnassignKarkun(id)
              if (!result.success) {
                setFormError(result.error ?? 'Unable to disconnect.')
                return
              }
            }
            management.clearSelection()
          })()
        }}
        onMarkBaitulMaalPaid={() => setBulkBaitulMaalStatus('Paid')}
        onMarkBaitulMaalPending={() => setBulkBaitulMaalStatus('Pending')}
        onMarkIjtemaPresent={() => setBulkIjtemaStatus('Present')}
        onMarkIjtemaAbsent={() => setBulkIjtemaStatus('Absent')}
        onMarkIjtemaInformed={() => setBulkIjtemaStatus('Excused')}
        onMarkJihRegistered={() =>
          applyBulkJihRegistration(management.selectedIds, 'Registered', () =>
            management.clearSelection(),
          )
        }
        onMarkJihNotRegistered={() =>
          applyBulkJihRegistration(management.selectedIds, 'Not Registered', () =>
            management.clearSelection(),
          )
        }
        onMarkJihReportSubmitted={() =>
          applyBulkJihMonthlyReport(management.selectedIds, 'Submitted', () =>
            management.clearSelection(),
          )
        }
        onMarkJihReportPending={() =>
          applyBulkJihMonthlyReport(management.selectedIds, 'Pending', () =>
            management.clearSelection(),
          )
        }
        onSendWhatsApp={() => setBulkWhatsAppOpen(true)}
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
                fatherHusbandName: editingKarkun.fatherHusbandName,
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

      <MessageComposerModal
        isOpen={bulkWhatsAppOpen}
        recipients={management.allFilteredRecords
          .filter((karkun) => management.selectedIds.includes(karkun.id) && karkun.mobile.trim())
          .map((karkun) => ({
            personId: karkun.id,
            personKind: 'karkun' as const,
            name: karkun.name,
            mobile: karkun.mobile,
            whatsapp: karkun.whatsapp,
          }))}
        onClose={() => setBulkWhatsAppOpen(false)}
        onSend={async (input) => {
          const recipients = management.allFilteredRecords
            .filter((karkun) => management.selectedIds.includes(karkun.id) && karkun.mobile.trim())
            .map((karkun) => ({
              personId: karkun.id,
              personKind: 'karkun' as const,
              name: karkun.name,
              mobile: karkun.mobile,
              whatsapp: karkun.whatsapp,
            }))
          const result = await sendBroadcastMessage({
            channel: 'whatsapp',
            recipients,
            templateId: input.templateId,
            message: input.message,
          })
          if (result.success > 0) {
            management.clearSelection()
            setBulkWhatsAppOpen(false)
            return { success: true }
          }
          return { success: false, error: result.failed[0]?.error ?? 'Broadcast failed.' }
        }}
        title={`Broadcast to ${management.selectedIds.length} Karkuns`}
      />
    </div>
  )
}

export function KarkunanPage() {
  const location = useLocation()
  const initialSearch =
    (location.state as { searchQuery?: string } | null)?.searchQuery?.trim() ?? ''
  const [activeGender, setActiveGender] = useState<GenderTab>('Male')
  const sectionHandlersRef = useRef<KarkunSectionHandlers | null>(null)
  const [openAddForGender, setOpenAddForGender] = useState<PersonGender | null>(null)

  const registerSectionHandlers = useCallback((handlers: KarkunSectionHandlers | null) => {
    sectionHandlersRef.current = handlers
  }, [])

  const handleAddFormOpened = useCallback(() => {
    setOpenAddForGender(null)
  }, [])

  const requestAddKarkun = (gender: PersonGender) => {
    if (gender === activeGender) {
      sectionHandlersRef.current?.openAddForm()
      return
    }

    setOpenAddForGender(gender)
    setActiveGender(gender)
  }

  return (
    <PageShell>
      <PageHeader
        title="Karkun Management"
        description="Manage Male and Female Karkun contacts, connections, and status separately."
        actions={
          <KarkunPeopleActionBar
            onAddMale={() => requestAddKarkun('Male')}
            onAddFemale={() => requestAddKarkun('Female')}
            onAssign={() => sectionHandlersRef.current?.openAssign()}
            onImport={(file) => sectionHandlersRef.current?.handleImport(file)}
            onExport={(format) => sectionHandlersRef.current?.handleExport(format)}
          />
        }
      />

      <nav className="ds-tab-nav border-b border-border pb-px" aria-label="Karkun gender">
        {(['Male', 'Female'] as const).map((gender) => (
          <button
            key={gender}
            type="button"
            className={`ds-tab border-b-2 rounded-none px-4 ${
              activeGender === gender
                ? 'border-primary text-primary ds-tab-active'
                : 'border-transparent'
            }`}
            onClick={() => setActiveGender(gender)}
          >
            {gender} Karkuns
          </button>
        ))}
      </nav>

      <KarkunGenderSection
        key={activeGender}
        gender={activeGender}
        initialSearch={initialSearch}
        shouldOpenAddForm={openAddForGender === activeGender}
        onAddFormOpened={handleAddFormOpened}
        onRegisterHandlers={registerSectionHandlers}
      />
    </PageShell>
  )
}
