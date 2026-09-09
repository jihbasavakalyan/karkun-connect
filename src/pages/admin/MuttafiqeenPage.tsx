import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PersonGender } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { useKarkunPeopleManagement } from '@/hooks/useKarkunPeopleManagement'
import {
  bulkSetKarkunStatus,
  createMuttafiq,
  persistKarkunDurable,
  updateKarkun,
} from '@/lib/peopleStore'
import {
  BulkActionsBar,
  ConfirmDialog,
  KarkunPeopleActionBar,
  KarkunPeopleTable,
  PeopleFiltersBar,
  PeoplePagination,
  PersonFormModal,
} from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { ConnectRuknForMuttafiqModal } from '@/components/relationship'
import { RufaqaDirectoryShell } from '@/components/admin/RufaqaDirectoryShell'
import { useRufaqaDirectoryQuery } from '@/hooks/useRufaqaDirectoryQuery'
import { UI_LABELS } from '@/lib/uiTerminology'

type MuttafiqSectionHandlers = {
  openAddForm: () => void
}

type MuttafiqGenderSectionProps = {
  gender: PersonGender | null
  addGender: PersonGender
  shouldOpenAddForm: boolean
  initialSearch?: string
  onAddFormOpened: () => void
  onRegisterHandlers: (handlers: MuttafiqSectionHandlers | null) => void
  onClearDirectorySearch?: () => void
}

function MuttafiqGenderSection({
  gender,
  addGender,
  shouldOpenAddForm,
  initialSearch = '',
  onAddFormOpened,
  onRegisterHandlers,
  onClearDirectorySearch,
}: MuttafiqGenderSectionProps) {
  const management = useKarkunPeopleManagement(gender, 'Muttafiq', {
    initialFilters: initialSearch ? { search: initialSearch } : undefined,
  })

  const [isFormOpen, setIsFormOpen] = useState(shouldOpenAddForm)
  const [editingPerson, setEditingPerson] = useState<KarkunRegistryRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileConflictContext, setMobileConflictContext] = useState<'add' | 'edit' | null>(null)
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false)
  const [connectPerson, setConnectPerson] = useState<KarkunRegistryRecord | null>(null)
  const [connectNotice, setConnectNotice] = useState('')

  const openAddForm = useCallback(() => {
    setEditingPerson(null)
    setFormError('')
    setMobileOwner(null)
    setPendingFormValues(null)
    setMobileConflictContext(null)
    setIsFormOpen(true)
  }, [])

  useEffect(() => {
    management.updateFilter('search', initialSearch)
  }, [initialSearch, management.updateFilter])

  useEffect(() => {
    if (shouldOpenAddForm) {
      openAddForm()
      onAddFormOpened()
    }
  }, [shouldOpenAddForm, onAddFormOpened, openAddForm])

  useEffect(() => {
    onRegisterHandlers({ openAddForm })
    return () => onRegisterHandlers(null)
  }, [onRegisterHandlers, openAddForm])

  const clearMobileConflictDialog = () => {
    setMobileOwner(null)
    setPendingFormValues(null)
    setMobileConflictContext(null)
  }

  const handleFormSubmit = (
    values: PersonFormValues,
    options?: { confirmMobileOverwrite?: boolean },
  ) => {
    setFormError('')
    const payload = {
      ...values,
      gender: editingPerson ? values.gender : (gender ?? addGender),
    }

    if (editingPerson) {
      const result = updateKarkun(editingPerson.id, payload, 'Administrator', options)
      if (!result.success) {
        if (result.needsMobileConfirm && result.existingOwner) {
          setMobileOwner(result.existingOwner)
          setPendingFormValues(values)
          setMobileConflictContext('edit')
          return
        }
        setFormError(result.error ?? 'Unable to update Muttafiq.')
        return
      }
      void (async () => {
        const durable = await persistKarkunDurable(editingPerson.id)
        if (!durable.success) {
          setFormError(durable.error ?? 'Changes could not be saved.')
          return
        }
        setIsFormOpen(false)
        setEditingPerson(null)
      })()
      return
    }

    const result = createMuttafiq(payload, 'Administrator')
    if (!result.success) {
      if (result.needsMobileConfirm && result.existingOwner) {
        setMobileOwner(result.existingOwner)
        setPendingFormValues(null)
        setMobileConflictContext('add')
        return
      }
      setFormError(result.error ?? 'Unable to add Muttafiq.')
      return
    }
    void (async () => {
      if (result.karkunId) {
        const durable = await persistKarkunDurable(result.karkunId)
        if (!durable.success) {
          setFormError(durable.error ?? 'Muttafiq created locally but could not be saved.')
          return
        }
      }
      setIsFormOpen(false)
    })()
  }

  const confirmMobileOverwrite = () => {
    if (!pendingFormValues || mobileConflictContext !== 'edit') return
    handleFormSubmit(pendingFormValues, { confirmMobileOverwrite: true })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">
        {management.filters.search.trim()
          ? `Search results — ${management.totalRecords} match${management.totalRecords === 1 ? '' : 'es'}`
          : `Muttafiqeen — ${management.totalCount} in this view`}
      </p>

      <PeopleFiltersBar
        filters={management.filters}
        onFilterChange={management.updateFilter}
        onClear={() => {
          management.clearFilters()
          onClearDirectorySearch?.()
        }}
        showAssignmentFilters={false}
        showRegistryLifecycleFilters={false}
        hideGenderFilter
        hideSearch
      />

      <BulkActionsBar
        compact
        selectedCount={management.selectedIds.length}
        onActivate={() => {
          bulkSetKarkunStatus(management.selectedIds, 'active')
          management.clearSelection()
        }}
        onDeactivate={() => {
          bulkSetKarkunStatus(management.selectedIds, 'inactive')
          management.clearSelection()
        }}
        onSendWhatsApp={() => setBulkWhatsAppOpen(true)}
        onClearSelection={management.clearSelection}
      />

      <p className="text-sm text-secondary">
        Showing {management.records.length} of {management.totalRecords} filtered
      </p>

      {connectNotice ? (
        <div className="ds-banner-success" role="status">
          {connectNotice}
        </div>
      ) : null}

      <KarkunPeopleTable
        records={management.records}
        selectedIds={management.selectedIds}
        onToggleSelection={management.toggleSelection}
        onToggleSelectAll={management.toggleSelectAll}
        sortField={management.sortField}
        sortDirection={management.sortDirection}
        onToggleSort={management.toggleSort}
        onEdit={(person) => {
          setEditingPerson(person)
          setFormError('')
          setIsFormOpen(true)
        }}
        onConnectRukn={(person) => {
          setConnectNotice('')
          setConnectPerson(person)
        }}
        showAssignmentControls={false}
        showMuttafiqRelationshipColumns
        emptyTitle={
          management.filters.search.trim() ? UI_LABELS.noSearchResults : 'No Muttafiqeen yet'
        }
        emptyLabel={
          management.filters.search.trim()
            ? UI_LABELS.noSearchResultsHint
            : 'No Muttafiqeen match this view. Add a Muttafiq or change filters.'
        }
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
        mode={editingPerson ? 'edit' : 'add'}
        personLabel="Muttafiq"
        karkunId={editingPerson?.id}
        initialValues={
          editingPerson
            ? {
                name: editingPerson.name,
                gender: editingPerson.gender,
                mobile: editingPerson.mobile,
                whatsapp: editingPerson.whatsapp,
                status: editingPerson.status,
                fatherHusbandName: editingPerson.fatherHusbandName,
                address: editingPerson.address,
                area: editingPerson.area,
                place: editingPerson.place,
                education: editingPerson.education,
                profession: editingPerson.profession,
              }
            : { gender: gender ?? addGender }
        }
        error={formError}
        onClose={() => {
          setIsFormOpen(false)
          setEditingPerson(null)
          setFormError('')
          clearMobileConflictDialog()
        }}
        onSubmit={(values) => handleFormSubmit(values)}
      />

      <ConfirmDialog
        isOpen={Boolean(mobileOwner)}
        title={
          mobileConflictContext === 'add' ? 'Person Already Exists' : 'Overwrite Mobile Number?'
        }
        message={
          <>
            This mobile number is already used by <strong>{mobileOwner?.name}</strong>
            {mobileOwner?.kind === 'rukn' ? ' (Rukn)' : ' in the People registry'}.
          </>
        }
        confirmLabel={mobileConflictContext === 'edit' ? 'Overwrite' : 'OK'}
        onConfirm={
          mobileConflictContext === 'edit' ? confirmMobileOverwrite : clearMobileConflictDialog
        }
        onClose={clearMobileConflictDialog}
      />

      <MessageComposerModal
        isOpen={bulkWhatsAppOpen}
        recipients={management.allFilteredRecords
          .filter((person) => management.selectedIds.includes(person.id) && person.mobile.trim())
          .map((person) => ({
            personId: person.id,
            personKind: 'karkun' as const,
            name: person.name,
            mobile: person.mobile,
            whatsapp: person.whatsapp,
          }))}
        onClose={() => setBulkWhatsAppOpen(false)}
        onSend={async () => ({ success: true })}
        onBulkComplete={(report) => {
          if (report.successfullySent > 0) {
            management.clearSelection()
          }
          setBulkWhatsAppOpen(false)
        }}
        title={`Personalized Send All · ${management.selectedIds.length} Muttafiqeen`}
      />

      <ConnectRuknForMuttafiqModal
        isOpen={connectPerson !== null}
        person={connectPerson}
        onClose={() => setConnectPerson(null)}
        onAssigned={() =>
          setConnectNotice('Muttafiq connected to Rukn. Relationship is Active.')
        }
      />
    </div>
  )
}

export function MuttafiqeenPage() {
  const [searchParams] = useSearchParams()
  const rufaqa = useRufaqaDirectoryQuery()
  const sectionGender = rufaqa.storedGender || null
  const [addGender, setAddGender] = useState<PersonGender>('Male')
  const sectionHandlersRef = useRef<MuttafiqSectionHandlers | null>(null)
  const [shouldOpenAdd, setShouldOpenAdd] = useState(false)
  const addRequestedRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('action') !== 'add' || addRequestedRef.current) return
    addRequestedRef.current = true
    setShouldOpenAdd(true)
  }, [searchParams])

  const registerSectionHandlers = useCallback((handlers: MuttafiqSectionHandlers | null) => {
    sectionHandlersRef.current = handlers
  }, [])

  const requestAdd = (gender: PersonGender) => {
    setAddGender(gender)
    if (sectionGender && gender !== sectionGender) {
      rufaqa.setGenderView(gender === 'Male' ? 'men' : 'women')
      setShouldOpenAdd(true)
      return
    }
    setShouldOpenAdd(true)
    sectionHandlersRef.current?.openAddForm()
  }

  return (
    <RufaqaDirectoryShell
      category="muttafiqeen"
      actions={
        <KarkunPeopleActionBar
          personLabel="Muttafiq"
          showAssign={false}
          showImportExport={false}
          onAddMale={() => requestAdd('Male')}
          onAddFemale={() => requestAdd('Female')}
        />
      }
    >
      <MuttafiqGenderSection
        gender={sectionGender}
        addGender={addGender}
        initialSearch={rufaqa.search}
        shouldOpenAddForm={shouldOpenAdd}
        onAddFormOpened={() => setShouldOpenAdd(false)}
        onRegisterHandlers={registerSectionHandlers}
        onClearDirectorySearch={() => rufaqa.setSearch('')}
      />
    </RufaqaDirectoryShell>
  )
}
