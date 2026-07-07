import { useMemo, useState } from 'react'
import { useRuknManagement } from '@/hooks/useRuknManagement'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getRuknAssignmentEngineStats } from '@/lib/assignmentEngine'
import {
  bulkSetRuknStatus,
  createRukn,
  importRuknsFromRows,
  updateRukn,
} from '@/lib/peopleStore'
import {
  exportRukns,
  parsePeopleImportFile,
  readImportFile,
} from '@/lib/peopleImportExport'
import type { Rukn } from '@/data/ruknMaster'
import type { ImportSummary } from '@/types/people.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { RuknAssignmentCard } from '@/components/forms/rukn'
import {
  BulkActionsBar,
  ConfirmDialog,
  ImportExportToolbar,
  ImportSummaryModal,
  PeopleFiltersBar,
  PeoplePagination,
  PersonFormModal,
  RuknPeopleTable,
} from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type ActiveTab = 'manage' | 'assignments'

export function RuknModulePage() {
  const management = useRuknManagement()
  useAssignmentEngine()

  const [activeTab, setActiveTab] = useState<ActiveTab>('manage')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRukn, setEditingRukn] = useState<Rukn | null>(null)
  const [formError, setFormError] = useState('')
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  const statsFor = useMemo(
    () => (ruknId: string) => getRuknAssignmentEngineStats(ruknId),
    [],
  )

  const openAddForm = () => {
    setEditingRukn(null)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (rukn: Rukn) => {
    setEditingRukn(rukn)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = (
    values: PersonFormValues,
    options?: { confirmMobileOverwrite?: boolean },
  ) => {
    const result = editingRukn
      ? updateRukn(editingRukn.id, values, 'Administrator', options)
      : createRukn(values)

    if (!result.success) {
      if (result.needsMobileConfirm && result.existingOwner) {
        setPendingFormValues(values)
        setMobileOwner(result.existingOwner)
        setFormError('')
        return
      }
      setFormError(result.error ?? 'Unable to save Rukn.')
      return
    }

    setIsFormOpen(false)
    setEditingRukn(null)
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

  const handleImport = async (file: File) => {
    const content = await readImportFile(file)
    const rows = parsePeopleImportFile(content, 'rukn')
    const summary = importRuknsFromRows(rows)
    setImportSummary(summary)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Rukn Management</h1>
          <p className="mt-2 text-secondary">
            Manage Rukn contacts, status, and assignments — {management.totalCount} members
          </p>
        </div>
        {activeTab === 'manage' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ImportExportToolbar
              kind="rukn"
              onExport={(format) => exportRukns(management.allFilteredRecords, format)}
              onImport={handleImport}
            />
            <PrimaryButton type="button" onClick={openAddForm}>
              Add Rukn
            </PrimaryButton>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['manage', 'assignments'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-heading'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'manage' ? (
        <>
          <PeopleFiltersBar
            filters={management.filters}
            onFilterChange={management.updateFilter}
            onClear={management.clearFilters}
          />

          <BulkActionsBar
            selectedCount={management.selectedIds.length}
            onActivate={() => {
              bulkSetRuknStatus(management.selectedIds, 'active')
              management.clearSelection()
            }}
            onDeactivate={() => {
              bulkSetRuknStatus(management.selectedIds, 'inactive')
              management.clearSelection()
            }}
            onClearSelection={management.clearSelection}
          />

          <p className="text-sm text-secondary">
            Showing {management.records.length} of {management.totalRecords} filtered (
            {management.totalCount} total)
          </p>

          <RuknPeopleTable
            records={management.records}
            selectedIds={management.selectedIds}
            sortField={management.sortField}
            sortDirection={management.sortDirection}
            onToggleSort={management.toggleSort}
            onToggleSelection={management.toggleSelection}
            onToggleSelectAll={management.toggleSelectAll}
            onEdit={openEditForm}
          />

          <PeoplePagination
            currentPage={management.currentPage}
            totalPages={management.totalPages}
            totalRecords={management.totalRecords}
            pageSize={management.pageSize}
            onPageChange={management.goToPage}
          />
        </>
      ) : (
        <>
          <p className="text-sm text-secondary">
            Assignment overview for {management.totalCount} Rukn
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {management.allFilteredRecords.map((rukn) => (
              <li key={rukn.id}>
                <RuknAssignmentCard rukn={rukn} stats={statsFor(rukn.id)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <PersonFormModal
        isOpen={isFormOpen}
        kind="rukn"
        mode={editingRukn ? 'edit' : 'add'}
        initialValues={
          editingRukn
            ? {
                name: editingRukn.name,
                gender: editingRukn.gender,
                mobile: editingRukn.mobile,
                whatsapp: editingRukn.whatsapp,
                status: editingRukn.status,
              }
            : undefined
        }
        error={formError}
        onClose={() => {
          setIsFormOpen(false)
          setEditingRukn(null)
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
            <strong>{mobileOwner?.name}</strong> ({mobileOwner?.kind}). Overwriting may affect
            contact uniqueness. Continue?
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
        kind="rukn"
        onClose={() => setImportSummary(null)}
      />
    </div>
  )
}
