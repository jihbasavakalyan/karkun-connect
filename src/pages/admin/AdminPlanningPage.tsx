/**
 * Phase 1–2 — Admin planning experience.
 * Meqati Mansooba → Objectives + Unit / Scope + Campaign → Local Programme.
 * Calls getRepositories() directly (no service layer).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import type { CampaignListItem } from '@/constants/mockMissions'
import { buildOccurrenceCalendar } from '@/lib/occurrence/calendar'
import { listOccurrenceHistory } from '@/lib/occurrence/history'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type {
  LocalProgramme,
  LocalProgrammeStatus,
  ProgrammeFrequency,
  ProgrammeKind,
} from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type {
  MeqatiMansooba,
  MeqatiMansoobaStatus,
  PlanningObjective,
  PlanningObjectiveStatus,
  Unit,
  UnitStatus,
} from '@/types/planning.types'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'mb-1 block text-sm font-medium text-text-heading'

const PROGRAMME_KIND_OPTIONS: { value: ProgrammeKind; label: string }[] = [
  { value: 'weekly_ijtema', label: 'Weekly Ijtema' },
  { value: 'monthly_baitul_maal', label: 'Monthly Bait-ul-Maal' },
  { value: 'campaign_execution', label: 'Campaign Execution' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'other', label: 'Other' },
]

const PROGRAMME_KIND_LABELS = Object.fromEntries(
  PROGRAMME_KIND_OPTIONS.map((row) => [row.value, row.label]),
) as Record<ProgrammeKind, string>

function newPlanningId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function isSuccessMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('saved') || lower.includes('created') || lower.includes('updated')
}

function formatRepoError(error: { message?: string } | undefined): string {
  return error?.message?.trim() || 'Unable to save. Please try again.'
}

type MansoobaFormState = {
  name: string
  status: MeqatiMansoobaStatus
  startDate: string
  endDate: string
  primaryUnitId: string
  summary: string
}

type ObjectiveFormState = {
  title: string
  description: string
  status: PlanningObjectiveStatus
  sortOrder: string
}

type UnitFormState = {
  name: string
  status: UnitStatus
  placeAliases: string
}

type ProgrammeFormState = {
  name: string
  kind: ProgrammeKind
  status: LocalProgrammeStatus
  unitId: string
  startDate: string
  endDate: string
  frequencyCadence: '' | ProgrammeFrequency['cadence']
  frequencyDayOfWeek: string
  frequencyDayOfMonth: string
  frequencyNote: string
  summary: string
}

const emptyMansoobaForm = (): MansoobaFormState => ({
  name: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  primaryUnitId: '',
  summary: '',
})

const emptyObjectiveForm = (): ObjectiveFormState => ({
  title: '',
  description: '',
  status: 'active',
  sortOrder: '',
})

const emptyUnitForm = (): UnitFormState => ({
  name: '',
  status: 'active',
  placeAliases: '',
})

const emptyProgrammeForm = (): ProgrammeFormState => ({
  name: '',
  kind: 'weekly_ijtema',
  status: 'draft',
  unitId: '',
  startDate: '',
  endDate: '',
  frequencyCadence: '',
  frequencyDayOfWeek: '',
  frequencyDayOfMonth: '',
  frequencyNote: '',
  summary: '',
})

function programmeFormFromRow(row: LocalProgramme): ProgrammeFormState {
  const frequency = row.frequency
  return {
    name: row.name,
    kind: row.kind,
    status: row.status,
    unitId: row.unitId ?? '',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    frequencyCadence: frequency?.cadence ?? '',
    frequencyDayOfWeek:
      frequency && frequency.cadence === 'weekly' && frequency.dayOfWeek != null
        ? String(frequency.dayOfWeek)
        : '',
    frequencyDayOfMonth:
      frequency && frequency.cadence === 'monthly' && frequency.dayOfMonth != null
        ? String(frequency.dayOfMonth)
        : '',
    frequencyNote:
      frequency && frequency.cadence === 'custom' ? (frequency.note ?? '') : '',
    summary: row.summary ?? '',
  }
}

function buildProgrammeFrequency(
  form: ProgrammeFormState,
): ProgrammeFrequency | undefined {
  if (!form.frequencyCadence) return undefined
  if (form.frequencyCadence === 'weekly') {
    const dayRaw = form.frequencyDayOfWeek.trim()
    const dayOfWeek = dayRaw === '' ? undefined : Number(dayRaw)
    return {
      cadence: 'weekly',
      dayOfWeek:
        dayOfWeek != null && Number.isFinite(dayOfWeek) ? dayOfWeek : undefined,
    }
  }
  if (form.frequencyCadence === 'monthly') {
    const dayRaw = form.frequencyDayOfMonth.trim()
    const dayOfMonth = dayRaw === '' ? undefined : Number(dayRaw)
    return {
      cadence: 'monthly',
      dayOfMonth:
        dayOfMonth != null && Number.isFinite(dayOfMonth) ? dayOfMonth : undefined,
    }
  }
  if (form.frequencyCadence === 'once') {
    return { cadence: 'once' }
  }
  return {
    cadence: 'custom',
    note: form.frequencyNote.trim() || undefined,
  }
}

export function AdminPlanningPage() {
  const { user } = useAuth()
  const { run, busy } = useBusyAction()
  const actor = user?.displayName?.trim() || user?.email?.trim() || 'Administrator'

  const [mansoobas, setMansoobas] = useState<MeqatiMansooba[]>([])
  const [objectives, setObjectives] = useState<PlanningObjective[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [programmes, setProgrammes] = useState<LocalProgramme[]>([])
  /** Phase 3 — canonical Occurrence rows (history / calendar consume these; no second SoT). */
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [selectedMansoobaId, setSelectedMansoobaId] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const [mansoobaModal, setMansoobaModal] = useState<'create' | 'edit' | null>(null)
  const [editingMansoobaId, setEditingMansoobaId] = useState<string | null>(null)
  const [mansoobaForm, setMansoobaForm] = useState<MansoobaFormState>(emptyMansoobaForm)

  const [objectiveModal, setObjectiveModal] = useState<'create' | 'edit' | null>(null)
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null)
  /** Locked when the Objective modal opens — prevents reassignment if Mansooba selection changes. */
  const [objectiveMansoobaId, setObjectiveMansoobaId] = useState<string | null>(null)
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormState>(emptyObjectiveForm)
  const [formError, setFormError] = useState('')

  const [unitModal, setUnitModal] = useState<'create' | 'edit' | null>(null)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm)

  const [programmeModal, setProgrammeModal] = useState<'create' | 'edit' | null>(null)
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(null)
  /** Locked when the Local Programme modal opens — prevents silent Campaign reassignment. */
  const [programmeCampaignId, setProgrammeCampaignId] = useState<string | null>(null)
  const [programmeForm, setProgrammeForm] = useState<ProgrammeFormState>(emptyProgrammeForm)

  const refresh = useCallback(() => {
    const repos = getRepositories()
    const nextMansoobas = [
      ...unwrapRepository(repos.meqatiMansooba.loadAll(), []),
    ]
    const nextObjectives = [
      ...unwrapRepository(repos.objective.loadAll(), []),
    ]
    const nextUnits = [...unwrapRepository(repos.unit.loadAll(), [])]
    const nextCampaigns = [...unwrapRepository(repos.campaign.getAll(), [])]
    const nextProgrammes = [...unwrapRepository(repos.localProgramme.loadAll(), [])]
    const nextOccurrences = [...unwrapRepository(repos.occurrence.loadAll(), [])]
    setMansoobas(nextMansoobas)
    setObjectives(nextObjectives)
    setUnits(nextUnits)
    setCampaigns(nextCampaigns)
    setProgrammes(nextProgrammes)
    setOccurrences(nextOccurrences)

    setSelectedMansoobaId((current) => {
      if (current && nextMansoobas.some((row) => row.id === current)) return current
      const active = unwrapRepository(repos.meqatiMansooba.getActive(), undefined)
      if (active) return active.id
      return nextMansoobas[0]?.id ?? null
    })

    setSelectedCampaignId((current) => {
      if (current && nextCampaigns.some((row) => row.id === current)) return current
      const active = unwrapRepository(repos.campaign.getActive(), undefined)
      if (active) return active.id
      const preferred = nextCampaigns.find((row) => row.id === ACTIVE_CAMPAIGN_ID)
      return preferred?.id ?? nextCampaigns[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectedMansooba = useMemo(
    () => mansoobas.find((row) => row.id === selectedMansoobaId) ?? null,
    [mansoobas, selectedMansoobaId],
  )

  const selectedCampaign = useMemo(
    () => campaigns.find((row) => row.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  )

  const selectedObjectives = useMemo(() => {
    if (!selectedMansoobaId) return []
    return objectives
      .filter((row) => row.mansoobaId === selectedMansoobaId)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
  }, [objectives, selectedMansoobaId])

  const selectedProgrammes = useMemo(() => {
    if (!selectedCampaignId) return []
    return programmes
      .filter((row) => row.campaignId === selectedCampaignId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [programmes, selectedCampaignId])

  const selectedProgrammeIds = useMemo(
    () => new Set(selectedProgrammes.map((row) => row.id)),
    [selectedProgrammes],
  )

  const programmeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of programmes) map.set(row.id, row.name)
    return map
  }, [programmes])

  const campaignOccurrences = useMemo(
    () => occurrences.filter((row) => selectedProgrammeIds.has(row.programmeId)),
    [occurrences, selectedProgrammeIds],
  )

  const occurrenceCalendarEntries = useMemo(
    () =>
      buildOccurrenceCalendar(campaignOccurrences, {}, programmeNameById),
    [campaignOccurrences, programmeNameById],
  )

  const occurrenceHistoryRows = useMemo(
    () => listOccurrenceHistory(campaignOccurrences),
    [campaignOccurrences],
  )

  const unitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const unit of units) map.set(unit.id, unit.name)
    return map
  }, [units])

  const objectiveMansooba = useMemo(
    () => mansoobas.find((row) => row.id === objectiveMansoobaId) ?? null,
    [mansoobas, objectiveMansoobaId],
  )

  const programmeCampaign = useMemo(
    () => campaigns.find((row) => row.id === programmeCampaignId) ?? null,
    [campaigns, programmeCampaignId],
  )

  const closeMansoobaModal = () => {
    setMansoobaModal(null)
    setFormError('')
  }

  const closeObjectiveModal = () => {
    setObjectiveModal(null)
    setEditingObjectiveId(null)
    setObjectiveMansoobaId(null)
    setObjectiveForm(emptyObjectiveForm())
    setFormError('')
  }

  const closeUnitModal = () => {
    setUnitModal(null)
    setFormError('')
  }

  const closeProgrammeModal = () => {
    setProgrammeModal(null)
    setEditingProgrammeId(null)
    setProgrammeCampaignId(null)
    setProgrammeForm(emptyProgrammeForm())
    setFormError('')
  }

  const selectMansooba = (id: string) => {
    setSelectedMansoobaId(id)
    setMessage('')
    // Avoid stale create/edit Objective context after switching Mansooba.
    if (objectiveModal != null) {
      closeObjectiveModal()
    }
  }

  const selectCampaign = (id: string) => {
    setSelectedCampaignId(id)
    setMessage('')
    // Avoid stale create/edit Local Programme context after switching Campaign.
    if (programmeModal != null) {
      closeProgrammeModal()
    }
  }

  const openCreateMansooba = () => {
    setEditingMansoobaId(null)
    setMansoobaForm(emptyMansoobaForm())
    setMansoobaModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditMansooba = (row: MeqatiMansooba) => {
    setEditingMansoobaId(row.id)
    setMansoobaForm({
      name: row.name,
      status: row.status,
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
      primaryUnitId: row.primaryUnitId ?? '',
      summary: row.summary ?? '',
    })
    setMansoobaModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveMansooba = () => {
    void run(
      async () => {
        const name = mansoobaForm.name.trim()
        if (!name) {
          setFormError('Mansooba name is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingMansoobaId
          ? mansoobas.find((row) => row.id === editingMansoobaId)
          : undefined
        const record: MeqatiMansooba = {
          id: existing?.id ?? newPlanningId('mansooba'),
          name,
          status: mansoobaForm.status,
          startDate: mansoobaForm.startDate.trim() || undefined,
          endDate: mansoobaForm.endDate.trim() || undefined,
          primaryUnitId: mansoobaForm.primaryUnitId.trim() || undefined,
          summary: mansoobaForm.summary.trim() || undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().meqatiMansooba.saveDurable(record)
        if (!result.ok) {
          setFormError(formatRepoError(result.error))
          return
        }
        closeMansoobaModal()
        setSelectedMansoobaId(record.id)
        refresh()
        setMessage(existing ? 'Mansooba updated.' : 'Mansooba created.')
      },
      { key: 'planning.mansooba.save' },
    )
  }

  const openCreateObjective = () => {
    if (!selectedMansoobaId) {
      setMessage('Select or create a Mansooba first.')
      return
    }
    setEditingObjectiveId(null)
    setObjectiveMansoobaId(selectedMansoobaId)
    setObjectiveForm(emptyObjectiveForm())
    setObjectiveModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditObjective = (row: PlanningObjective) => {
    setEditingObjectiveId(row.id)
    setObjectiveMansoobaId(row.mansoobaId)
    setObjectiveForm({
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : '',
    })
    setObjectiveModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveObjective = () => {
    void run(
      async () => {
        const parentId = objectiveMansoobaId
        if (!parentId) {
          setFormError('Objective must belong to a Mansooba.')
          return
        }
        const title = objectiveForm.title.trim()
        if (!title) {
          setFormError('Objective title is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingObjectiveId
          ? objectives.find((row) => row.id === editingObjectiveId)
          : undefined
        // Edit preserves the original Mansooba; create uses the locked modal parent.
        const mansoobaId = existing?.mansoobaId ?? parentId
        if (!mansoobaId) {
          setFormError('Objective must belong to a Mansooba.')
          return
        }
        const sortRaw = objectiveForm.sortOrder.trim()
        const sortOrder = sortRaw === '' ? undefined : Number(sortRaw)
        const record: PlanningObjective = {
          id: existing?.id ?? newPlanningId('objective'),
          mansoobaId,
          title,
          description: objectiveForm.description.trim() || undefined,
          status: objectiveForm.status,
          sortOrder:
            sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
          legacyKey: existing?.legacyKey,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().objective.saveDurable(record)
        if (!result.ok) {
          setFormError(formatRepoError(result.error))
          return
        }
        closeObjectiveModal()
        refresh()
        setMessage(existing ? 'Objective updated.' : 'Objective created.')
      },
      { key: 'planning.objective.save' },
    )
  }

  const openCreateUnit = () => {
    setEditingUnitId(null)
    setUnitForm(emptyUnitForm())
    setUnitModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditUnit = (row: Unit) => {
    setEditingUnitId(row.id)
    setUnitForm({
      name: row.name,
      status: row.status,
      placeAliases: (row.placeAliases ?? []).join(', '),
    })
    setUnitModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveUnit = () => {
    void run(
      async () => {
        const name = unitForm.name.trim()
        if (!name) {
          setFormError('Unit name is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingUnitId
          ? units.find((row) => row.id === editingUnitId)
          : undefined
        const aliases = unitForm.placeAliases
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
        const record: Unit = {
          id: existing?.id ?? newPlanningId('unit'),
          name,
          status: unitForm.status,
          placeAliases: aliases.length > 0 ? aliases : undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().unit.saveDurable(record)
        if (!result.ok) {
          setFormError(formatRepoError(result.error))
          return
        }
        closeUnitModal()
        refresh()
        setMessage(existing ? 'Unit updated.' : 'Unit created.')
      },
      { key: 'planning.unit.save' },
    )
  }

  const openCreateProgramme = () => {
    if (!selectedCampaignId) {
      setMessage('Select a Campaign first.')
      return
    }
    setEditingProgrammeId(null)
    setProgrammeCampaignId(selectedCampaignId)
    setProgrammeForm(emptyProgrammeForm())
    setProgrammeModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditProgramme = (row: LocalProgramme) => {
    setEditingProgrammeId(row.id)
    setProgrammeCampaignId(row.campaignId)
    setProgrammeForm(programmeFormFromRow(row))
    setProgrammeModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveProgramme = () => {
    void run(
      async () => {
        const parentId = programmeCampaignId
        if (!parentId) {
          setFormError('Local Programme must belong to a Campaign.')
          return
        }
        const name = programmeForm.name.trim()
        if (!name) {
          setFormError('Programme name is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingProgrammeId
          ? programmes.find((row) => row.id === editingProgrammeId)
          : undefined
        // Edit preserves the original Campaign; create uses the locked modal parent.
        const campaignId = existing?.campaignId ?? parentId
        if (!campaignId) {
          setFormError('Local Programme must belong to a Campaign.')
          return
        }
        const record: LocalProgramme = {
          id: existing?.id ?? newPlanningId('programme'),
          campaignId,
          name,
          kind: programmeForm.kind,
          status: programmeForm.status,
          unitId: programmeForm.unitId.trim() || undefined,
          startDate: programmeForm.startDate.trim() || undefined,
          endDate: programmeForm.endDate.trim() || undefined,
          frequency: buildProgrammeFrequency(programmeForm),
          summary: programmeForm.summary.trim() || undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().localProgramme.saveDurable(record)
        if (!result.ok) {
          setFormError(formatRepoError(result.error))
          return
        }
        closeProgrammeModal()
        refresh()
        setMessage(existing ? 'Local Programme updated.' : 'Local Programme created.')
      },
      { key: 'planning.programme.save' },
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Planning"
        description="Configure Meqati Mansooba, Objectives, Unit scope, and Local Programmes under Campaigns. Admin configures — Rukn acts later."
      />

      {message ? (
        <p
          className={`mb-4 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-8">
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Meqati Mansooba</h2>
              <p className="mt-1 text-sm text-secondary">
                Planning root. Objectives belong to the selected Mansooba.
              </p>
            </div>
            <PrimaryButton type="button" onClick={openCreateMansooba}>
              New Mansooba
            </PrimaryButton>
          </div>

          {mansoobas.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">No Mansooba yet. Create the first plan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {mansoobas.map((row) => {
                const selected = row.id === selectedMansoobaId
                return (
                  <li
                    key={row.id}
                    className={`rounded-lg border p-4 ${
                      selected
                        ? 'border-primary bg-primary-muted/40'
                        : 'border-border bg-surface-muted'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectMansooba(row.id)}
                      >
                        <p className="font-semibold text-text-heading">{row.name}</p>
                        <p className="mt-1 text-xs text-secondary">
                          {row.status}
                          {row.startDate || row.endDate
                            ? ` · ${row.startDate || '—'} → ${row.endDate || '—'}`
                            : ''}
                          {row.primaryUnitId
                            ? ` · Unit: ${unitNameById.get(row.primaryUnitId) ?? row.primaryUnitId}`
                            : ''}
                        </p>
                        {row.summary ? (
                          <p className="mt-2 text-sm text-secondary">{row.summary}</p>
                        ) : null}
                      </button>
                      <SecondaryButton type="button" onClick={() => openEditMansooba(row)}>
                        Edit
                      </SecondaryButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Objectives</h2>
              <p className="mt-1 text-sm text-secondary">
                {selectedMansooba
                  ? `Under Mansooba: ${selectedMansooba.name}`
                  : 'Select a Mansooba to manage its Objectives.'}
              </p>
            </div>
            <PrimaryButton
              type="button"
              onClick={openCreateObjective}
              disabled={!selectedMansoobaId}
            >
              New Objective
            </PrimaryButton>
          </div>

          {!selectedMansoobaId ? (
            <p className="mt-4 text-sm text-secondary">No Mansooba selected.</p>
          ) : selectedObjectives.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">
              No Objectives for this Mansooba yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedObjectives.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div>
                    <p className="font-semibold text-text-heading">{row.title}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {row.status}
                      {row.sortOrder != null ? ` · order ${row.sortOrder}` : ''}
                    </p>
                    {row.description ? (
                      <p className="mt-2 text-sm text-secondary">{row.description}</p>
                    ) : null}
                  </div>
                  <SecondaryButton type="button" onClick={() => openEditObjective(row)}>
                    Edit
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Campaign</h2>
              <p className="mt-1 text-sm text-secondary">
                Select a Campaign to manage its Local Programmes. Planning links
                (Mansooba / Objectives) are optional.
              </p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">No Campaigns available.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {campaigns.map((row) => {
                const selected = row.id === selectedCampaignId
                return (
                  <li
                    key={row.id}
                    className={`rounded-lg border p-4 ${
                      selected
                        ? 'border-primary bg-primary-muted/40'
                        : 'border-border bg-surface-muted'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => selectCampaign(row.id)}
                    >
                      <p className="font-semibold text-text-heading">{row.name}</p>
                      <p className="mt-1 text-xs text-secondary">
                        {row.status}
                        {` · ${row.startDate} → ${row.endDate}`}
                        {row.mansoobaId ? ` · Mansooba: ${row.mansoobaId}` : ''}
                        {row.objectiveIds?.length
                          ? ` · ${row.objectiveIds.length} objective link(s)`
                          : ''}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Local Programmes</h2>
              <p className="mt-1 text-sm text-secondary">
                {selectedCampaign
                  ? `Under Campaign: ${selectedCampaign.name}`
                  : 'Select a Campaign to manage its Local Programmes.'}
              </p>
            </div>
            <PrimaryButton
              type="button"
              onClick={openCreateProgramme}
              disabled={!selectedCampaignId}
            >
              New Local Programme
            </PrimaryButton>
          </div>

          {!selectedCampaignId ? (
            <p className="mt-4 text-sm text-secondary">No Campaign selected.</p>
          ) : selectedProgrammes.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">
              No Local Programmes for this Campaign yet. Empty is valid.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedProgrammes.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div>
                    <p className="font-semibold text-text-heading">{row.name}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {PROGRAMME_KIND_LABELS[row.kind]} · {row.status}
                      {row.unitId
                        ? ` · Unit: ${unitNameById.get(row.unitId) ?? row.unitId}`
                        : ''}
                      {row.frequency ? ` · ${row.frequency.cadence}` : ''}
                      {row.startDate || row.endDate
                        ? ` · ${row.startDate || '—'} → ${row.endDate || '—'}`
                        : ''}
                    </p>
                    {row.summary ? (
                      <p className="mt-2 text-sm text-secondary">{row.summary}</p>
                    ) : null}
                  </div>
                  <SecondaryButton type="button" onClick={() => openEditProgramme(row)}>
                    Edit
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">
              Occurrence calendar &amp; history
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Derived from durable Occurrence records under this Campaign&apos;s Local
              Programmes. Calendar and history share one source of truth — no duplicate
              event store.
            </p>
          </div>

          {!selectedCampaignId ? (
            <p className="mt-4 text-sm text-secondary">No Campaign selected.</p>
          ) : campaignOccurrences.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">
              No Occurrences for these Local Programmes yet. Generate or create
              Occurrences to populate calendar and history.
            </p>
          ) : (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-heading">Calendar</h3>
                <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {occurrenceCalendarEntries.map((entry) => (
                    <li
                      key={entry.occurrenceId}
                      className="rounded-lg border border-border bg-surface-muted px-3 py-2"
                    >
                      <p className="text-sm font-medium text-text-heading">
                        {entry.occurrenceDate}
                        {entry.title ? ` · ${entry.title}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-secondary">
                        {(entry.programmeName ?? entry.programmeId) +
                          ` · ${entry.status}` +
                          (entry.openTime && entry.closeTime
                            ? ` · ${entry.openTime}–${entry.closeTime}`
                            : '') +
                          (entry.audienceGender ? ` · ${entry.audienceGender}` : '')}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-heading">History</h3>
                <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {occurrenceHistoryRows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-border bg-surface-muted px-3 py-2"
                    >
                      <p className="text-sm font-medium text-text-heading">
                        {row.occurrenceDate}
                        {row.title ? ` · ${row.title}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-secondary">
                        {(programmeNameById.get(row.programmeId) ?? row.programmeId) +
                          ` · ${row.status}` +
                          ` · ${row.generationKey}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Unit / Scope</h2>
              <p className="mt-1 text-sm text-secondary">
                Flat scope only (e.g. Basavakalyan). No hierarchy.
              </p>
            </div>
            <PrimaryButton type="button" onClick={openCreateUnit}>
              New Unit
            </PrimaryButton>
          </div>

          {units.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">No Units yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {units.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div>
                    <p className="font-semibold text-text-heading">{row.name}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {row.status}
                      {row.placeAliases?.length
                        ? ` · aliases: ${row.placeAliases.join(', ')}`
                        : ''}
                    </p>
                  </div>
                  <SecondaryButton type="button" onClick={() => openEditUnit(row)}>
                    Edit
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        isOpen={mansoobaModal != null}
        title={mansoobaModal === 'edit' ? 'Edit Mansooba' : 'New Mansooba'}
        onClose={closeMansoobaModal}
        footer={
          <ModalFormFooter
            onCancel={closeMansoobaModal}
            primaryLabel={mansoobaModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveMansooba}
            loading={busy}
            primaryDisabled={busy || !mansoobaForm.name.trim()}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="Details">
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="mansooba-name">
                Name
              </label>
              <input
                id="mansooba-name"
                className={inputClassName}
                value={mansoobaForm.name}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-status">
                Status
              </label>
              <select
                id="mansooba-status"
                className={inputClassName}
                value={mansoobaForm.status}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({
                    ...prev,
                    status: event.target.value as MeqatiMansoobaStatus,
                  }))
                }
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-start">
                Start date
              </label>
              <input
                id="mansooba-start"
                type="date"
                className={inputClassName}
                value={mansoobaForm.startDate}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-end">
                End date
              </label>
              <input
                id="mansooba-end"
                type="date"
                className={inputClassName}
                value={mansoobaForm.endDate}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-unit">
                Primary Unit (optional)
              </label>
              <select
                id="mansooba-unit"
                className={inputClassName}
                value={mansoobaForm.primaryUnitId}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({
                    ...prev,
                    primaryUnitId: event.target.value,
                  }))
                }
              >
                <option value="">—</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="mansooba-summary">
              Summary
            </label>
            <textarea
              id="mansooba-summary"
              className={inputClassName}
              rows={3}
              value={mansoobaForm.summary}
              onChange={(event) =>
                setMansoobaForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={objectiveModal != null}
        title={objectiveModal === 'edit' ? 'Edit Objective' : 'New Objective'}
        onClose={closeObjectiveModal}
        footer={
          <ModalFormFooter
            onCancel={closeObjectiveModal}
            primaryLabel={objectiveModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveObjective}
            loading={busy}
            primaryDisabled={
              busy || !objectiveForm.title.trim() || !objectiveMansoobaId
            }
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="Details">
          <p className="mb-4 text-sm text-secondary">
            Mansooba:{' '}
            <span className="font-medium text-text-heading">
              {objectiveMansooba?.name ?? '—'}
            </span>
          </p>
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="objective-title">
                Title
              </label>
              <input
                id="objective-title"
                className={inputClassName}
                value={objectiveForm.title}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="objective-status">
                Status
              </label>
              <select
                id="objective-status"
                className={inputClassName}
                value={objectiveForm.status}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({
                    ...prev,
                    status: event.target.value as PlanningObjectiveStatus,
                  }))
                }
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="objective-order">
                Sort order
              </label>
              <input
                id="objective-order"
                type="number"
                className={inputClassName}
                value={objectiveForm.sortOrder}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              />
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="objective-description">
              Description
            </label>
            <textarea
              id="objective-description"
              className={inputClassName}
              rows={3}
              value={objectiveForm.description}
              onChange={(event) =>
                setObjectiveForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={unitModal != null}
        title={unitModal === 'edit' ? 'Edit Unit' : 'New Unit'}
        onClose={closeUnitModal}
        footer={
          <ModalFormFooter
            onCancel={closeUnitModal}
            primaryLabel={unitModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveUnit}
            loading={busy}
            primaryDisabled={busy || !unitForm.name.trim()}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="Details">
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="unit-name">
                Name
              </label>
              <input
                id="unit-name"
                className={inputClassName}
                value={unitForm.name}
                onChange={(event) =>
                  setUnitForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="unit-status">
                Status
              </label>
              <select
                id="unit-status"
                className={inputClassName}
                value={unitForm.status}
                onChange={(event) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    status: event.target.value as UnitStatus,
                  }))
                }
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="unit-aliases">
              Place aliases (comma-separated)
            </label>
            <input
              id="unit-aliases"
              className={inputClassName}
              placeholder="Basavakalyan"
              value={unitForm.placeAliases}
              onChange={(event) =>
                setUnitForm((prev) => ({ ...prev, placeAliases: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={programmeModal != null}
        title={programmeModal === 'edit' ? 'Edit Local Programme' : 'New Local Programme'}
        onClose={closeProgrammeModal}
        footer={
          <ModalFormFooter
            onCancel={closeProgrammeModal}
            primaryLabel={programmeModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveProgramme}
            loading={busy}
            primaryDisabled={busy || !programmeForm.name.trim() || !programmeCampaignId}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="Details">
          <p className="mb-3 text-sm text-secondary">
            Campaign (locked): {programmeCampaign?.name ?? programmeCampaignId ?? '—'}
          </p>
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="programme-name">
                Name
              </label>
              <input
                id="programme-name"
                className={inputClassName}
                value={programmeForm.name}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-kind">
                Kind
              </label>
              <select
                id="programme-kind"
                className={inputClassName}
                value={programmeForm.kind}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({
                    ...prev,
                    kind: event.target.value as ProgrammeKind,
                  }))
                }
              >
                {PROGRAMME_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-status">
                Status
              </label>
              <select
                id="programme-status"
                className={inputClassName}
                value={programmeForm.status}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({
                    ...prev,
                    status: event.target.value as LocalProgrammeStatus,
                  }))
                }
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-unit">
                Unit / Scope (optional)
              </label>
              <select
                id="programme-unit"
                className={inputClassName}
                value={programmeForm.unitId}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({ ...prev, unitId: event.target.value }))
                }
              >
                <option value="">None</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-start">
                Start date (optional)
              </label>
              <input
                id="programme-start"
                type="date"
                className={inputClassName}
                value={programmeForm.startDate}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-end">
                End date (optional)
              </label>
              <input
                id="programme-end"
                type="date"
                className={inputClassName}
                value={programmeForm.endDate}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="programme-frequency">
                Frequency hint (optional)
              </label>
              <select
                id="programme-frequency"
                className={inputClassName}
                value={programmeForm.frequencyCadence}
                onChange={(event) =>
                  setProgrammeForm((prev) => ({
                    ...prev,
                    frequencyCadence: event.target.value as ProgrammeFormState['frequencyCadence'],
                  }))
                }
              >
                <option value="">None</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="once">once</option>
                <option value="custom">custom</option>
              </select>
            </div>
            {programmeForm.frequencyCadence === 'weekly' ? (
              <div>
                <label className={labelClassName} htmlFor="programme-dow">
                  Day of week (0–6, optional)
                </label>
                <input
                  id="programme-dow"
                  className={inputClassName}
                  value={programmeForm.frequencyDayOfWeek}
                  onChange={(event) =>
                    setProgrammeForm((prev) => ({
                      ...prev,
                      frequencyDayOfWeek: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {programmeForm.frequencyCadence === 'monthly' ? (
              <div>
                <label className={labelClassName} htmlFor="programme-dom">
                  Day of month (optional)
                </label>
                <input
                  id="programme-dom"
                  className={inputClassName}
                  value={programmeForm.frequencyDayOfMonth}
                  onChange={(event) =>
                    setProgrammeForm((prev) => ({
                      ...prev,
                      frequencyDayOfMonth: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {programmeForm.frequencyCadence === 'custom' ? (
              <div>
                <label className={labelClassName} htmlFor="programme-freq-note">
                  Custom note (optional)
                </label>
                <input
                  id="programme-freq-note"
                  className={inputClassName}
                  value={programmeForm.frequencyNote}
                  onChange={(event) =>
                    setProgrammeForm((prev) => ({
                      ...prev,
                      frequencyNote: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="programme-summary">
              Summary (optional)
            </label>
            <textarea
              id="programme-summary"
              className={inputClassName}
              rows={3}
              value={programmeForm.summary}
              onChange={(event) =>
                setProgrammeForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>
    </PageShell>
  )
}
