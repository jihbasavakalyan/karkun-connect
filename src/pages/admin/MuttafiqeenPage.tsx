import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PersonGender } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { MobileLookupResult } from '@/lib/peopleStore'
import { useKarkunPeopleManagement } from '@/hooks/useKarkunPeopleManagement'
import {
  bulkSetKarkunStatus,
  createMuttafiq,
  getAllMuttafiqeen,
  persistKarkunDurable,
  updateKarkun,
} from '@/lib/peopleStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
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
import { PageHeader, PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'

type GenderTab = PersonGender

type MuttafiqSectionHandlers = {
  openAddForm: () => void
}

type MuttafiqGenderSectionProps = {
  gender: PersonGender
  shouldOpenAddForm: boolean
  onAddFormOpened: () => void
  onRegisterHandlers: (handlers: MuttafiqSectionHandlers | null) => void
}

function MuttafiqGenderSection({
  gender,
  shouldOpenAddForm,
  onAddFormOpened,
  onRegisterHandlers,
}: MuttafiqGenderSectionProps) {
  const management = useKarkunPeopleManagement(gender, 'Muttafiq')

  const [isFormOpen, setIsFormOpen] = useState(shouldOpenAddForm)
  const [editingPerson, setEditingPerson] = useState<KarkunRegistryRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileConflictContext, setMobileConflictContext] = useState<'add' | 'edit' | null>(null)
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false)

  const openAddForm = useCallback(() => {
    setEditingPerson(null)
    setFormError('')
    setMobileOwner(null)
    setPendingFormValues(null)
    setMobileConflictContext(null)
    setIsFormOpen(true)
  }, [])

  useEffect(() => {
    if (shouldOpenAddForm) {
      onAddFormOpened()
    }
  }, [shouldOpenAddForm, onAddFormOpened])

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
    const payload = { ...values, gender }

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
        {gender} Muttafiqeen registry — {management.totalCount} members
      </p>

      <PeopleFiltersBar
        filters={management.filters}
        onFilterChange={management.updateFilter}
        onClear={management.clearFilters}
        showAssignmentFilters={false}
        showRegistryLifecycleFilters={false}
        hideGenderFilter
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
        showAssignmentControls={false}
        emptyTitle="No Muttafiqeen found"
        emptyLabel="No Muttafiqeen match your search or filters."
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
                place: editingPerson.place,
                status: editingPerson.status,
                fatherHusbandName: editingPerson.fatherHusbandName,
              }
            : { gender }
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
    </div>
  )
}

function MuttafiqeenSummaryCards() {
  const peopleVersion = usePeopleStore()
  const stats = useMemo(() => {
    void peopleVersion
    const all = getAllMuttafiqeen()
    return {
      total: all.length,
      male: all.filter((p) => p.gender === 'Male').length,
      female: all.filter((p) => p.gender === 'Female').length,
    }
  }, [peopleVersion])

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { label: 'Total Muttafiqeen', value: stats.total },
        { label: 'Male', value: stats.male },
        { label: 'Female', value: stats.female },
      ].map((card) => (
        <article
          key={card.label}
          className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6"
        >
          <p className="text-sm font-medium text-secondary">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-text-heading sm:text-3xl">{card.value}</p>
        </article>
      ))}
    </div>
  )
}

export function MuttafiqeenPage() {
  const [activeGender, setActiveGender] = useState<GenderTab>('Male')
  const sectionHandlersRef = useRef<MuttafiqSectionHandlers | null>(null)
  const [openAddForGender, setOpenAddForGender] = useState<PersonGender | null>(null)

  const registerSectionHandlers = useCallback((handlers: MuttafiqSectionHandlers | null) => {
    sectionHandlersRef.current = handlers
  }, [])

  const handleAddFormOpened = useCallback(() => {
    setOpenAddForGender(null)
  }, [])

  const requestAdd = (gender: PersonGender) => {
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
        title="Muttafiqeen Registry"
        description="Manage Male and Female Muttafiq contacts separately. Classification can change over time."
        actions={
          <KarkunPeopleActionBar
            personLabel="Muttafiq"
            showAssign={false}
            showImportExport={false}
            onAddMale={() => requestAdd('Male')}
            onAddFemale={() => requestAdd('Female')}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-secondary">People</span>
        <span className="text-secondary">/</span>
        <span className="font-medium text-text-heading">Muttafiqeen</span>
        <span className="text-secondary">/</span>
        <Link to={ROUTES.ADMIN_KARKUN} className="text-primary hover:underline">
          Karkuns
        </Link>
      </div>

      <MuttafiqeenSummaryCards />

      <nav
        className="ds-tab-nav mt-6 border-b border-border pb-px"
        aria-label="Muttafiqeen gender"
      >
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
            {gender} Muttafiqeen
          </button>
        ))}
      </nav>

      <div className="mt-6">
        <MuttafiqGenderSection
          key={activeGender}
          gender={activeGender}
          shouldOpenAddForm={openAddForGender === activeGender}
          onAddFormOpened={handleAddFormOpened}
          onRegisterHandlers={registerSectionHandlers}
        />
      </div>
    </PageShell>
  )
}
