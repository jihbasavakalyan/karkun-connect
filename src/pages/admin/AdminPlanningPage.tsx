/**
 * Admin planning — میقاتی منصوبہ → شعبہ → اہداف → سرگرمی.
 * Campaign is a focus overlay. Unit / Work / Occurrence are not user-facing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { Rukn } from '@/data/ruknMaster'
import { listMeqatiPlanYears } from '@/lib/dashboard/meqatiYear'
import {
  isActivityYearStatus,
  normalizeActivityYearStatuses,
  type ActivityYearStatus,
} from '@/lib/planning/activityYearStatus'
import {
  listProgrammeFrequencies,
  normalizeProgrammeSchedule,
} from '@/lib/planning/programmeSchedule'
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
  Shobah,
  ShobahStatus,
} from '@/types/planning.types'
import type { Work } from '@/types/work.types'
import { MansoobaActivityReportPanel } from '@/pages/admin/MansoobaActivityReportPanel'
import {
  buildShobahOverviewItems,
  CompactActivityList,
  isMappedActivity,
  ShobahTile,
} from '@/pages/admin/meqati/meqatiPlanningPresentation'
import {
  getAllWeeklyIjtemaEvents,
  getAllWeeklyIjtemaSubmissions,
  subscribeToWeeklyIjtemaStore,
} from '@/stores/weeklyIjtemaStore'
import {
  getAllMonthlyBaitulMaalCycles,
  getAllMonthlyBaitulMaalSubmissions,
  subscribeToMonthlyBaitulMaalStore,
} from '@/stores/monthlyBaitulMaalStore'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'mb-1 block text-sm font-medium text-text-heading'

const ACTIVITY_KIND_OPTIONS: { value: ProgrammeKind; label: string }[] = [
  { value: 'weekly_ijtema', label: 'Weekly Ijtema' },
  { value: 'monthly_baitul_maal', label: 'Monthly Bait-ul-Maal' },
  { value: 'campaign_execution', label: 'Campaign execution' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'other', label: 'Other' },
]

const ACTIVITY_YEAR_STATUS_OPTIONS: { value: '' | ActivityYearStatus; label: string }[] = [
  { value: '', label: 'غیر متعین' },
  { value: 'completed', label: 'مکمل' },
  { value: 'in_progress', label: 'جاری' },
  { value: 'remaining', label: 'باقی' },
]

const MEQATI_PLAN_YEARS = listMeqatiPlanYears()

function emptyYearStatusForm(): Record<string, '' | ActivityYearStatus> {
  return Object.fromEntries(MEQATI_PLAN_YEARS.map((year) => [year.key, ''] as const))
}

function yearStatusFormFromRow(
  row: LocalProgramme,
): Record<string, '' | ActivityYearStatus> {
  const next = emptyYearStatusForm()
  for (const year of MEQATI_PLAN_YEARS) {
    const value = row.yearStatuses?.[year.key]
    next[year.key] = isActivityYearStatus(value) ? value : ''
  }
  return next
}

function newPlanningId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function isSuccessMessage(message: string): boolean {
  return message.includes('محفوظ') || message.includes('بن گ')
}

function formatRepoError(error: { message?: string } | undefined): string {
  return error?.message?.trim() || 'Unable to save. Please try again.'
}

type MansoobaFormState = {
  name: string
  status: MeqatiMansoobaStatus
  startDate: string
  endDate: string
  summary: string
}

type ShobahFormState = {
  name: string
  status: ShobahStatus
  sortOrder: string
  summary: string
}

type ObjectiveFormState = {
  title: string
  description: string
  status: PlanningObjectiveStatus
  sortOrder: string
}

type ActivityFormState = {
  name: string
  kind: ProgrammeKind
  status: LocalProgrammeStatus
  responsibleRuknId: string
  startDate: string
  endDate: string
  frequencyCadence: '' | ProgrammeFrequency['cadence']
  /** Optional second pattern (KC-DEC-015 dual schedule, e.g. Monthly + Quarterly). */
  frequencyCadenceExtra: '' | ProgrammeFrequency['cadence']
  frequencyDayOfWeek: string
  frequencyDayOfMonth: string
  frequencyMonth: string
  frequencyNote: string
  summary: string
  yearStatuses: Record<string, '' | ActivityYearStatus>
}

const emptyMansoobaForm = (): MansoobaFormState => ({
  name: 'میقاتی منصوبہ',
  status: 'active',
  startDate: '',
  endDate: '',
  summary: '',
})

const emptyShobahForm = (): ShobahFormState => ({
  name: '',
  status: 'active',
  sortOrder: '',
  summary: '',
})

const emptyObjectiveForm = (): ObjectiveFormState => ({
  title: '',
  description: '',
  status: 'active',
  sortOrder: '',
})

const emptyActivityForm = (): ActivityFormState => ({
  name: '',
  kind: 'other',
  status: 'draft',
  responsibleRuknId: '',
  startDate: '',
  endDate: '',
  frequencyCadence: '',
  frequencyCadenceExtra: '',
  frequencyDayOfWeek: '',
  frequencyDayOfMonth: '',
  frequencyMonth: '',
  frequencyNote: '',
  summary: '',
  yearStatuses: emptyYearStatusForm(),
})

function activityFormFromRow(row: LocalProgramme): ActivityFormState {
  const patterns = listProgrammeFrequencies(row.frequency)
  const frequency = patterns[0]
  const extra = patterns[1]
  return {
    name: row.name,
    kind: row.kind,
    status: row.status,
    responsibleRuknId: row.responsibleRuknId ?? '',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    frequencyCadence: frequency?.cadence ?? '',
    frequencyCadenceExtra:
      extra && extra.cadence !== frequency?.cadence ? extra.cadence : '',
    frequencyDayOfWeek:
      frequency && frequency.cadence === 'weekly' && frequency.dayOfWeek != null
        ? String(frequency.dayOfWeek)
        : '',
    frequencyDayOfMonth:
      frequency &&
      (frequency.cadence === 'monthly' || frequency.cadence === 'yearly') &&
      frequency.dayOfMonth != null
        ? String(frequency.dayOfMonth)
        : '',
    frequencyMonth:
      frequency && frequency.cadence === 'yearly' && frequency.month != null
        ? String(frequency.month)
        : '',
    frequencyNote: frequency && frequency.cadence === 'custom' ? (frequency.note ?? '') : '',
    summary: row.summary ?? '',
    yearStatuses: yearStatusFormFromRow(row),
  }
}

function buildOneFrequency(
  cadence: ProgrammeFrequency['cadence'],
  form: ActivityFormState,
): ProgrammeFrequency {
  if (cadence === 'weekly') {
    const dayRaw = form.frequencyDayOfWeek.trim()
    const dayOfWeek = dayRaw === '' ? undefined : Number(dayRaw)
    return {
      cadence: 'weekly',
      dayOfWeek: dayOfWeek != null && Number.isFinite(dayOfWeek) ? dayOfWeek : undefined,
    }
  }
  if (cadence === 'monthly') {
    const dayRaw = form.frequencyDayOfMonth.trim()
    const dayOfMonth = dayRaw === '' ? undefined : Number(dayRaw)
    return {
      cadence: 'monthly',
      dayOfMonth: dayOfMonth != null && Number.isFinite(dayOfMonth) ? dayOfMonth : undefined,
    }
  }
  if (cadence === 'quarterly') {
    return { cadence: 'quarterly' }
  }
  if (cadence === 'yearly') {
    const monthRaw = form.frequencyMonth.trim()
    const dayRaw = form.frequencyDayOfMonth.trim()
    const month = monthRaw === '' ? undefined : Number(monthRaw)
    const dayOfMonth = dayRaw === '' ? undefined : Number(dayRaw)
    return {
      cadence: 'yearly',
      month: month != null && Number.isFinite(month) ? month : undefined,
      dayOfMonth: dayOfMonth != null && Number.isFinite(dayOfMonth) ? dayOfMonth : undefined,
    }
  }
  if (cadence === 'once') return { cadence: 'once' }
  return { cadence: 'custom', note: form.frequencyNote.trim() || undefined }
}

function buildActivityFrequency(
  form: ActivityFormState,
): LocalProgramme['frequency'] {
  if (!form.frequencyCadence) return undefined
  const patterns: ProgrammeFrequency[] = [buildOneFrequency(form.frequencyCadence, form)]
  if (
    form.frequencyCadenceExtra &&
    form.frequencyCadenceExtra !== form.frequencyCadence
  ) {
    patterns.push(buildOneFrequency(form.frequencyCadenceExtra, form))
  }
  return normalizeProgrammeSchedule(patterns)
}

export function AdminPlanningPage() {
  const { user } = useAuth()
  const { run, busy } = useBusyAction()
  const actor = user?.displayName?.trim() || user?.email?.trim() || 'Administrator'

  const [mansoobas, setMansoobas] = useState<MeqatiMansooba[]>([])
  const [shobahs, setShobahs] = useState<Shobah[]>([])
  const [objectives, setObjectives] = useState<PlanningObjective[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [programmes, setProgrammes] = useState<LocalProgramme[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [workItems, setWorkItems] = useState<Work[]>([])
  const [rukns, setRukns] = useState<Rukn[]>([])
  const [activityStoreVersion, setActivityStoreVersion] = useState(0)
  const [selectedMansoobaId, setSelectedMansoobaId] = useState<string | null>(null)
  const [selectedShobahId, setSelectedShobahId] = useState<string | null>(null)
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const [mansoobaModal, setMansoobaModal] = useState<'create' | 'edit' | null>(null)
  const [editingMansoobaId, setEditingMansoobaId] = useState<string | null>(null)
  const [mansoobaForm, setMansoobaForm] = useState<MansoobaFormState>(emptyMansoobaForm)

  const [shobahModal, setShobahModal] = useState<'create' | 'edit' | null>(null)
  const [editingShobahId, setEditingShobahId] = useState<string | null>(null)
  const [shobahMansoobaId, setShobahMansoobaId] = useState<string | null>(null)
  const [shobahForm, setShobahForm] = useState<ShobahFormState>(emptyShobahForm)

  const [objectiveModal, setObjectiveModal] = useState<'create' | 'edit' | null>(null)
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null)
  const [objectiveShobahId, setObjectiveShobahId] = useState<string | null>(null)
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormState>(emptyObjectiveForm)

  const [activityModal, setActivityModal] = useState<'create' | 'edit' | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [activityObjectiveId, setActivityObjectiveId] = useState<string | null>(null)
  const [activityForm, setActivityForm] = useState<ActivityFormState>(emptyActivityForm)
  const [expandedObjectiveId, setExpandedObjectiveId] = useState<string | null>(null)
  const [activityModalPane, setActivityModalPane] = useState<'primary' | 'more'>('primary')

  const refresh = useCallback(() => {
    const repos = getRepositories()
    const nextMansoobas = [...unwrapRepository(repos.meqatiMansooba.loadAll(), [])]
    const nextShobahs = [...unwrapRepository(repos.shobah.loadAll(), [])]
    const nextObjectives = [...unwrapRepository(repos.objective.loadAll(), [])]
    const nextCampaigns = [...unwrapRepository(repos.campaign.getAll(), [])]
    const nextProgrammes = [...unwrapRepository(repos.localProgramme.loadAll(), [])]
    const nextOccurrences = [...unwrapRepository(repos.occurrence.loadAll(), [])]
    const nextWork = [...unwrapRepository(repos.work.loadAll(), [])]
    const nextRukns = [...unwrapRepository(repos.rukn.loadAll(), [])]
    setMansoobas(nextMansoobas)
    setShobahs(nextShobahs)
    setObjectives(nextObjectives)
    setCampaigns(nextCampaigns)
    setProgrammes(nextProgrammes)
    setOccurrences(nextOccurrences)
    setWorkItems(nextWork)
    setRukns(nextRukns)

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

  useEffect(() => {
    const unsubWi = subscribeToWeeklyIjtemaStore(() =>
      setActivityStoreVersion((value) => value + 1),
    )
    const unsubBm = subscribeToMonthlyBaitulMaalStore(() =>
      setActivityStoreVersion((value) => value + 1),
    )
    return () => {
      unsubWi()
      unsubBm()
    }
  }, [])

  const selectedMansooba = useMemo(
    () => mansoobas.find((row) => row.id === selectedMansoobaId) ?? null,
    [mansoobas, selectedMansoobaId],
  )

  const selectedCampaign = useMemo(
    () => campaigns.find((row) => row.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  )

  const visibleShobahs = useMemo(() => {
    if (!selectedMansoobaId) return []
    return shobahs
      .filter((row) => row.mansoobaId === selectedMansoobaId)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
  }, [shobahs, selectedMansoobaId])

  const selectedShobahIdResolved =
    selectedShobahId && visibleShobahs.some((row) => row.id === selectedShobahId)
      ? selectedShobahId
      : null

  const selectedShobah = useMemo(
    () => visibleShobahs.find((row) => row.id === selectedShobahIdResolved) ?? null,
    [visibleShobahs, selectedShobahIdResolved],
  )

  const visibleObjectives = useMemo(() => {
    if (!selectedShobahIdResolved) return []
    return objectives
      .filter((row) => row.shobahId === selectedShobahIdResolved)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
  }, [objectives, selectedShobahIdResolved])

  const selectedObjectiveIdResolved =
    selectedObjectiveId && visibleObjectives.some((row) => row.id === selectedObjectiveId)
      ? selectedObjectiveId
      : null

  const unmappedActivities = useMemo(
    () =>
      programmes
        .filter((row) => {
          if (row.objectiveId?.trim()) return false
          if (selectedShobahIdResolved) {
            return row.shobahId === selectedShobahIdResolved
          }
          if (selectedMansoobaId) {
            return row.mansoobaId === selectedMansoobaId
          }
          return true
        })
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [programmes, selectedShobahIdResolved, selectedMansoobaId],
  )

  const mansoobaObjectiveIds = useMemo(() => {
    if (!selectedMansoobaId) return new Set<string>()
    return new Set(
      objectives.filter((row) => row.mansoobaId === selectedMansoobaId).map((row) => row.id),
    )
  }, [objectives, selectedMansoobaId])

  const mansoobaActivities = useMemo(
    () =>
      programmes.filter((row) => {
        if (selectedMansoobaId && row.mansoobaId === selectedMansoobaId) return true
        const objectiveId = row.objectiveId?.trim()
        return Boolean(objectiveId) && mansoobaObjectiveIds.has(objectiveId!)
      }),
    [programmes, mansoobaObjectiveIds, selectedMansoobaId],
  )

  const mansoobaActivityIds = useMemo(
    () => new Set(mansoobaActivities.map((row) => row.id)),
    [mansoobaActivities],
  )

  const programmeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of programmes) map.set(row.id, row.name)
    return map
  }, [programmes])

  const ruknNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rukns) map.set(row.id, row.name)
    return map
  }, [rukns])

  const calendarOccurrences = useMemo(
    () => occurrences.filter((row) => mansoobaActivityIds.has(row.programmeId)),
    [occurrences, mansoobaActivityIds],
  )

  const occurrenceCalendarEntries = useMemo(
    () => buildOccurrenceCalendar(calendarOccurrences, {}, programmeNameById),
    [calendarOccurrences, programmeNameById],
  )

  const occurrenceHistoryRows = useMemo(
    () => listOccurrenceHistory(calendarOccurrences),
    [calendarOccurrences],
  )

  const weeklyIjtemaEvents = useMemo(() => {
    void activityStoreVersion
    return getAllWeeklyIjtemaEvents()
  }, [activityStoreVersion])

  const weeklyIjtemaSubmissions = useMemo(() => {
    void activityStoreVersion
    return getAllWeeklyIjtemaSubmissions()
  }, [activityStoreVersion])

  const baitulMaalCycles = useMemo(() => {
    void activityStoreVersion
    return getAllMonthlyBaitulMaalCycles()
  }, [activityStoreVersion])

  const baitulMaalSubmissions = useMemo(() => {
    void activityStoreVersion
    return getAllMonthlyBaitulMaalSubmissions()
  }, [activityStoreVersion])

  const shobahOverviewItems = useMemo(
    () => buildShobahOverviewItems(visibleShobahs, objectives, programmes),
    [visibleShobahs, objectives, programmes],
  )

  const mansoobaTotals = useMemo(() => {
    const mansoobaProgrammes = programmes.filter((row) => row.mansoobaId === selectedMansoobaId)
    const mapped = mansoobaProgrammes.filter(isMappedActivity).length
    return {
      shobahs: visibleShobahs.length,
      objectives: objectives.filter((row) => row.mansoobaId === selectedMansoobaId).length,
      activities: mansoobaProgrammes.length,
      mapped,
      unmapped: mansoobaProgrammes.length - mapped,
    }
  }, [programmes, objectives, visibleShobahs, selectedMansoobaId])

  const shobahActivities = useMemo(() => {
    if (!selectedShobahIdResolved) return []
    return programmes
      .filter((row) => row.shobahId === selectedShobahIdResolved)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [programmes, selectedShobahIdResolved])

  const canCreateMansooba = mansoobas.filter((row) => row.status !== 'archived').length === 0
  const mansoobaObjectives = useMemo(
    () =>
      objectives
        .filter((row) => row.mansoobaId === selectedMansoobaId)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title)),
    [objectives, selectedMansoobaId],
  )

  const focusedObjectiveIds = useMemo(
    () => new Set(selectedCampaign?.objectiveIds ?? []),
    [selectedCampaign],
  )
  const focusedActivityIds = useMemo(
    () => new Set(selectedCampaign?.activityIds ?? []),
    [selectedCampaign],
  )

  const closeMansoobaModal = () => {
    setMansoobaModal(null)
    setFormError('')
  }

  const closeShobahModal = () => {
    setShobahModal(null)
    setEditingShobahId(null)
    setShobahMansoobaId(null)
    setShobahForm(emptyShobahForm())
    setFormError('')
  }

  const closeObjectiveModal = () => {
    setObjectiveModal(null)
    setEditingObjectiveId(null)
    setObjectiveShobahId(null)
    setObjectiveForm(emptyObjectiveForm())
    setFormError('')
  }

  const closeActivityModal = () => {
    setActivityModal(null)
    setEditingActivityId(null)
    setActivityObjectiveId(null)
    setActivityForm(emptyActivityForm())
    setActivityModalPane('primary')
    setFormError('')
  }

  const openCreateMansooba = () => {
    if (!canCreateMansooba) {
      setMessage('صرف ایک میقاتی منصوبہ ہو سکتا ہے۔')
      return
    }
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
          setFormError('میقاتی منصوبہ کا نام ضروری ہے۔')
          return
        }
        const now = new Date().toISOString()
        const existing = editingMansoobaId
          ? mansoobas.find((row) => row.id === editingMansoobaId)
          : undefined
        if (!existing && !canCreateMansooba) {
          setFormError('صرف ایک میقاتی منصوبہ ہو سکتا ہے۔')
          return
        }
        const record: MeqatiMansooba = {
          id: existing?.id ?? newPlanningId('mansooba'),
          name,
          status: mansoobaForm.status,
          startDate: mansoobaForm.startDate.trim() || undefined,
          endDate: mansoobaForm.endDate.trim() || undefined,
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
        setMessage(existing ? 'میقاتی منصوبہ محفوظ ہو گیا۔' : 'میقاتی منصوبہ بن گیا۔')
      },
      { key: 'planning.mansooba.save' },
    )
  }

  const openCreateShobah = () => {
    if (!selectedMansoobaId) {
      setMessage('پہلے میقاتی منصوبہ منتخب یا تخلیق کریں۔')
      return
    }
    setEditingShobahId(null)
    setShobahMansoobaId(selectedMansoobaId)
    setShobahForm(emptyShobahForm())
    setShobahModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditShobah = (row: Shobah) => {
    setEditingShobahId(row.id)
    setShobahMansoobaId(row.mansoobaId)
    setShobahForm({
      name: row.name,
      status: row.status,
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : '',
      summary: row.summary ?? '',
    })
    setShobahModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveShobah = () => {
    void run(
      async () => {
        const parentId = shobahMansoobaId
        if (!parentId) {
          setFormError('شعبہ میقاتی منصوبہ کے اندر ہونا چاہیے۔')
          return
        }
        const name = shobahForm.name.trim()
        if (!name) {
          setFormError('شعبہ کا نام ضروری ہے۔')
          return
        }
        const now = new Date().toISOString()
        const existing = editingShobahId
          ? shobahs.find((row) => row.id === editingShobahId)
          : undefined
        const sortRaw = shobahForm.sortOrder.trim()
        const sortOrder = sortRaw === '' ? undefined : Number(sortRaw)
        const record: Shobah = {
          id: existing?.id ?? newPlanningId('shobah'),
          mansoobaId: existing?.mansoobaId ?? parentId,
          name,
          status: shobahForm.status,
          sortOrder: sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
          summary: shobahForm.summary.trim() || undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().shobah.saveDurable(record)
        if (!result.ok) {
          setFormError(formatRepoError(result.error))
          return
        }
        closeShobahModal()
        setSelectedShobahId(record.id)
        refresh()
        setMessage(existing ? 'شعبہ محفوظ ہو گیا۔' : 'شعبہ بن گیا۔')
      },
      { key: 'planning.shobah.save' },
    )
  }

  const openCreateObjective = () => {
    if (!selectedShobahIdResolved) {
      setMessage('پہلے شعبہ منتخب کریں۔')
      return
    }
    setEditingObjectiveId(null)
    setObjectiveShobahId(selectedShobahIdResolved)
    setObjectiveForm(emptyObjectiveForm())
    setObjectiveModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditObjective = (row: PlanningObjective) => {
    setEditingObjectiveId(row.id)
    setObjectiveShobahId(row.shobahId)
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
        const parentShobahId = objectiveShobahId
        const parentShobah = shobahs.find((row) => row.id === parentShobahId)
        if (!parentShobahId || !parentShobah) {
          setFormError('اہداف شعبہ کے اندر ہونے چاہیے۔')
          return
        }
        const title = objectiveForm.title.trim()
        if (!title) {
          setFormError('اہداف کا عنوان ضروری ہے۔')
          return
        }
        const now = new Date().toISOString()
        const existing = editingObjectiveId
          ? objectives.find((row) => row.id === editingObjectiveId)
          : undefined
        const sortRaw = objectiveForm.sortOrder.trim()
        const sortOrder = sortRaw === '' ? undefined : Number(sortRaw)
        const record: PlanningObjective = {
          id: existing?.id ?? newPlanningId('objective'),
          mansoobaId: existing?.mansoobaId ?? parentShobah.mansoobaId,
          shobahId: existing?.shobahId ?? parentShobahId,
          title,
          description: objectiveForm.description.trim() || undefined,
          status: objectiveForm.status,
          sortOrder: sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
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
        setSelectedObjectiveId(record.id)
        refresh()
        setMessage(existing ? 'اہداف محفوظ ہو گئے۔' : 'اہداف بن گئے۔')
      },
      { key: 'planning.objective.save' },
    )
  }

  const openCreateActivity = () => {
    setEditingActivityId(null)
    setActivityObjectiveId(selectedObjectiveIdResolved)
    setActivityForm(emptyActivityForm())
    setActivityModalPane('primary')
    setActivityModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditActivity = (row: LocalProgramme) => {
    setEditingActivityId(row.id)
    setActivityObjectiveId(row.objectiveId?.trim() || null)
    setActivityForm(activityFormFromRow(row))
    setActivityModalPane('primary')
    setActivityModal('edit')
    setFormError('')
    setMessage('')
  }

  const saveActivity = () => {
    void run(
      async () => {
        const parentId = activityObjectiveId?.trim() || null
        const name = activityForm.name.trim()
        if (!name) {
          setFormError('سرگرمی کا نام ضروری ہے۔')
          return
        }
        let mansoobaId: string | undefined
        let shobahId: string | undefined
        if (parentId) {
          const parent = objectives.find((row) => row.id === parentId)
          if (!parent) {
            setFormError('منتخب اہداف دستیاب نہیں۔')
            return
          }
          mansoobaId = parent.mansoobaId
          shobahId = parent.shobahId
        } else {
          mansoobaId = selectedMansoobaId ?? undefined
          shobahId = selectedShobahIdResolved ?? undefined
        }
        if (!mansoobaId?.trim() || !shobahId?.trim()) {
          setFormError('شعبہ منتخب کریں تاکہ سرگرمی کا سیاق محفوظ رہے۔')
          return
        }
        const now = new Date().toISOString()
        const existing = editingActivityId
          ? programmes.find((row) => row.id === editingActivityId)
          : undefined
        const record: LocalProgramme = {
          id: existing?.id ?? newPlanningId('activity'),
          mansoobaId,
          shobahId,
          objectiveId: parentId,
          campaignId: existing?.campaignId,
          name,
          kind: activityForm.kind,
          status: activityForm.status,
          responsibleRuknId: activityForm.responsibleRuknId.trim() || undefined,
          startDate: activityForm.startDate.trim() || undefined,
          endDate: activityForm.endDate.trim() || undefined,
          frequency: buildActivityFrequency(activityForm),
          summary: activityForm.summary.trim() || undefined,
          yearStatuses: normalizeActivityYearStatuses(activityForm.yearStatuses),
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
        closeActivityModal()
        refresh()
        setMessage(existing ? 'سرگرمی محفوظ ہو گئی۔' : 'سرگرمی بن گئی۔')
      },
      { key: 'planning.activity.save' },
    )
  }

  const saveCampaignFocus = (next: {
    objectiveIds?: string[]
    activityIds?: string[]
  }) => {
    if (!selectedCampaignId || !selectedMansoobaId) return
    void run(
      async () => {
        const result = await getRepositories().campaign.savePlanningLinksDurable({
          id: selectedCampaignId,
          mansoobaId: selectedMansoobaId,
          objectiveIds: next.objectiveIds ?? selectedCampaign?.objectiveIds ?? [],
          activityIds: next.activityIds ?? selectedCampaign?.activityIds ?? [],
        })
        if (!result.ok) {
          setMessage(formatRepoError(result.error))
          return
        }
        refresh()
        setMessage('مہم کا فوکس محفوظ ہو گیا۔')
      },
      { key: 'planning.campaign.focus' },
    )
  }

  const toggleCampaignObjective = (objectiveId: string) => {
    const next = new Set(focusedObjectiveIds)
    if (next.has(objectiveId)) next.delete(objectiveId)
    else next.add(objectiveId)
    saveCampaignFocus({ objectiveIds: [...next] })
  }

  const toggleCampaignActivity = (activityId: string) => {
    const next = new Set(focusedActivityIds)
    if (next.has(activityId)) next.delete(activityId)
    else next.add(activityId)
    saveCampaignFocus({ activityIds: [...next] })
  }

  const objectiveParentShobah = shobahs.find((row) => row.id === objectiveShobahId) ?? null
  const editingActivity = programmes.find((row) => row.id === editingActivityId)
  const activityContextShobahName =
    shobahs.find((row) => row.id === editingActivity?.shobahId)?.name ??
    selectedShobah?.name ??
    '—'
  const activityContextObjectiveTitle =
    objectives.find((row) => row.id === (activityObjectiveId ?? ''))?.title ?? null

  return (
    <PageShell>
      <PageHeader
        title="میقاتی منصوبہ"
        description="شعبہ، اہداف، سرگرمی۔"
      />

      {message ? (
        <p
          className={`mb-4 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-6" dir="rtl" lang="ur">
        <section className="rounded-xl bg-surface px-5 py-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">
                {selectedMansooba?.name ?? 'میقاتی منصوبہ'}
              </h2>
              {selectedMansooba ? (
                <p className="mt-2 text-sm text-secondary">
                  {mansoobaTotals.shobahs} شعبہ | {mansoobaTotals.objectives} اہداف |{' '}
                  {mansoobaTotals.activities} سرگرمیاں
                </p>
              ) : null}
              {selectedMansooba ? (
                <p className="mt-1 text-xs text-secondary">
                  {mansoobaTotals.mapped} مربوط | {mansoobaTotals.unmapped} بغیر ہدف
                </p>
              ) : (
                <p className="mt-1 text-sm text-secondary">تنظیمی جڑ۔ صرف ایک منصوبہ۔</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreateMansooba ? (
                <PrimaryButton type="button" onClick={openCreateMansooba}>
                  نیا میقاتی منصوبہ
                </PrimaryButton>
              ) : null}
              {selectedMansooba ? (
                <SecondaryButton type="button" onClick={() => openEditMansooba(selectedMansooba)}>
                  ترمیم
                </SecondaryButton>
              ) : null}
            </div>
          </div>

          {mansoobas.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">ابھی میقاتی منصوبہ نہیں ہے۔ پہلا منصوبہ بنائیں۔</p>
          ) : mansoobas.length > 1 ? (
            <ul className="mt-4 space-y-2">
              {mansoobas.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`text-sm ${row.id === selectedMansoobaId ? 'font-semibold text-primary' : 'text-secondary'}`}
                    onClick={() => {
                      setSelectedMansoobaId(row.id)
                      setSelectedShobahId(null)
                    }}
                  >
                    {row.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>


        {!selectedShobahIdResolved ? (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text-heading">شعبہ</h2>
              <PrimaryButton type="button" onClick={openCreateShobah} disabled={!selectedMansoobaId}>
                نیا شعبہ
              </PrimaryButton>
            </div>
            {!selectedMansoobaId ? (
              <p className="mt-4 text-sm text-secondary">میقاتی منصوبہ منتخب نہیں۔</p>
            ) : visibleShobahs.length === 0 ? (
              <p className="mt-4 text-sm text-secondary">
                اس منصوبہ میں ابھی کوئی شعبہ نہیں۔ غیر تصدیق شدہ ماخذ مواد شامل نہیں کیا گیا۔
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shobahOverviewItems.map((item) => (
                  <li key={item.shobah.id}>
                    <ShobahTile item={item} onOpen={setSelectedShobahId} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={() => {
                    setSelectedShobahId(null)
                    setSelectedObjectiveId(null)
                    setExpandedObjectiveId(null)
                  }}
                >
                  تمام شعبہ
                </button>
                <h2 className="mt-2 text-lg font-semibold text-text-heading">{selectedShobah?.name}</h2>
                <p className="mt-1 text-sm text-secondary">
                  {visibleObjectives.length} اہداف · {shobahActivities.length} سرگرمیاں
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedShobah ? (
                  <SecondaryButton type="button" onClick={() => openEditShobah(selectedShobah)}>
                    ترمیم
                  </SecondaryButton>
                ) : null}
                <PrimaryButton type="button" onClick={openCreateObjective}>
                  نئے اہداف
                </PrimaryButton>
                <PrimaryButton type="button" onClick={openCreateActivity}>
                  نئی سرگرمی
                </PrimaryButton>
              </div>
            </div>

            {visibleObjectives.length === 0 ? (
              <p className="mt-4 text-sm text-secondary">اس شعبہ میں ابھی کوئی اہداف نہیں۔</p>
            ) : (
              <ul className="mt-5 space-y-1">
                {visibleObjectives.map((row) => {
                  const objectiveActivities = programmes
                    .filter((item) => item.objectiveId === row.id)
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                  const expanded = expandedObjectiveId === row.id
                  const mappedHere = objectiveActivities.length
                  return (
                    <li key={row.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-start"
                          onClick={() => {
                            setSelectedObjectiveId(row.id)
                            setExpandedObjectiveId(expanded ? null : row.id)
                          }}
                        >
                          <p className="font-medium text-text-heading whitespace-normal break-words">
                            {row.title}
                          </p>
                          <p className="mt-1 text-xs text-secondary">{mappedHere} سرگرمیاں</p>
                        </button>
                        <SecondaryButton type="button" onClick={() => openEditObjective(row)}>
                          ترمیم
                        </SecondaryButton>
                      </div>
                      {expanded ? (
                        <div className="mt-3">
                          {objectiveActivities.length === 0 ? (
                            <p className="text-sm text-secondary">ان اہداف کے تحت ابھی کوئی سرگرمی نہیں۔</p>
                          ) : (
                            <CompactActivityList
                              rows={objectiveActivities}
                              ruknNameById={ruknNameById}
                              onOpen={openEditActivity}
                            />
                          )}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}

            {shobahActivities.length === 0 ? (
              <p className="mt-6 text-sm text-secondary">اس شعبہ کے لیے ابھی کوئی سرگرمی درج نہیں</p>
            ) : unmappedActivities.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-text-heading">بغیر ہدف</h3>
                <p className="mt-1 text-xs text-secondary">بغیر اہداف — ہدف غیر متعین۔ مصنوعی ہدف نہیں بنایا گیا۔</p>
                <div className="mt-3">
                  <CompactActivityList
                    rows={unmappedActivities}
                    ruknNameById={ruknNameById}
                    onOpen={openEditActivity}
                    showUnmappedObjective
                  />
                </div>
              </div>
            ) : null}
          </section>
        )}

        <details className="rounded-xl bg-surface px-5 py-4 shadow-card">
          <summary className="cursor-pointer text-sm font-semibold text-text-heading">
            مہم، نظام الاوقات اور رپورٹ
          </summary>
          <div className="mt-4 space-y-8">
        <section>
          <div>
            <h2 className="text-base font-semibold text-text-heading">مہم — فوکس</h2>
            <p className="mt-1 text-sm text-secondary">
              مہم منتخب اہداف اور سرگرمیوں کا ٹریکنگ منظر ہے۔ سرگرمی میقاتی منصوبہ کی ملکیت میں رہتی
              ہے — نقل نہیں بنتی۔
            </p>
          </div>

          {campaigns.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">کوئی مہم دستیاب نہیں۔</p>
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
                      onClick={() => setSelectedCampaignId(row.id)}
                    >
                      <p className="font-semibold text-text-heading">{row.name}</p>
                      <p className="mt-1 text-xs text-secondary">
                        {row.status}
                        {` · ${row.startDate} → ${row.endDate}`}
                        {row.objectiveIds?.length
                          ? ` · ${row.objectiveIds.length} اہداف`
                          : ''}
                        {row.activityIds?.length
                          ? ` · ${row.activityIds.length} سرگرمیاں`
                          : ''}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {selectedCampaign && selectedMansooba ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-heading">منتخب اہداف</h3>
                {mansoobaObjectives.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">ابھی کوئی اہداف نہیں۔</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {mansoobaObjectives.map((row) => (
                      <li key={row.id}>
                        <label className="flex items-center gap-2 text-sm text-text-heading">
                          <input
                            type="checkbox"
                            checked={focusedObjectiveIds.has(row.id)}
                            onChange={() => toggleCampaignObjective(row.id)}
                            disabled={busy}
                          />
                          {row.title}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-heading">منتخب سرگرمیاں</h3>
                {mansoobaActivities.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">ابھی کوئی سرگرمی نہیں۔</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {mansoobaActivities.map((row) => (
                      <li key={row.id}>
                        <label className="flex items-center gap-2 text-sm text-text-heading">
                          <input
                            type="checkbox"
                            checked={focusedActivityIds.has(row.id)}
                            onChange={() => toggleCampaignActivity(row.id)}
                            disabled={busy}
                          />
                          {row.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div>
            <h2 className="text-base font-semibold text-text-heading">نظام الاوقات</h2>
            <p className="mt-1 text-sm text-secondary">
              منتخب میقاتی منصوبہ کی سرگرمیوں کا کیلنڈر۔ داخلی شیڈول ریکارڈ صارف کے سامنے نہیں آتے۔
            </p>
          </div>

          {calendarOccurrences.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">اس منصوبہ کی سرگرمیوں کے لیے ابھی کوئی شیڈول نہیں۔</p>
          ) : (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-heading">کیلنڈر</h3>
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
                        {(entry.programmeName ?? entry.programmeId) + ` · ${entry.status}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-heading">سابقہ</h3>
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
                          ` · ${row.status}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <MansoobaActivityReportPanel
          mansooba={selectedMansooba}
          objectives={objectives}
          campaigns={campaigns}
          programmes={programmes}
          occurrences={occurrences}
          work={workItems}
          weeklyIjtemaEvents={weeklyIjtemaEvents}
          weeklyIjtemaSubmissions={weeklyIjtemaSubmissions}
          baitulMaalCycles={baitulMaalCycles}
          baitulMaalSubmissions={baitulMaalSubmissions}
        />
          </div>
        </details>
      </div>

      <Modal
        isOpen={mansoobaModal != null}
        title={mansoobaModal === 'edit' ? 'ترمیم میقاتی منصوبہ' : 'نیا میقاتی منصوبہ'}
        onClose={closeMansoobaModal}
        footer={
          <ModalFormFooter
            onCancel={closeMansoobaModal}
            primaryLabel={mansoobaModal === 'edit' ? 'محفوظ کریں' : 'بنائیں'}
            onPrimaryClick={saveMansooba}
            loading={busy}
            primaryDisabled={busy || !mansoobaForm.name.trim()}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="تفصیل">
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="mansooba-name">
                نام
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
                حالت
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
                آغاز
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
                اختتام
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
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="mansooba-summary">
              خلاصہ
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
        isOpen={shobahModal != null}
        title={shobahModal === 'edit' ? 'ترمیم شعبہ' : 'نیا شعبہ'}
        onClose={closeShobahModal}
        footer={
          <ModalFormFooter
            onCancel={closeShobahModal}
            primaryLabel={shobahModal === 'edit' ? 'محفوظ کریں' : 'بنائیں'}
            onPrimaryClick={saveShobah}
            loading={busy}
            primaryDisabled={busy || !shobahForm.name.trim() || !shobahMansoobaId}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="تفصیل">
          <p className="mb-4 text-sm text-secondary">
            میقاتی منصوبہ:{' '}
            <span className="font-medium text-text-heading">
              {mansoobas.find((row) => row.id === shobahMansoobaId)?.name ?? '—'}
            </span>
          </p>
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="shobah-name">
                نام
              </label>
              <input
                id="shobah-name"
                className={inputClassName}
                value={shobahForm.name}
                onChange={(event) =>
                  setShobahForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="shobah-status">
                حالت
              </label>
              <select
                id="shobah-status"
                className={inputClassName}
                value={shobahForm.status}
                onChange={(event) =>
                  setShobahForm((prev) => ({
                    ...prev,
                    status: event.target.value as ShobahStatus,
                  }))
                }
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="shobah-order">
                ترتیب
              </label>
              <input
                id="shobah-order"
                type="number"
                className={inputClassName}
                value={shobahForm.sortOrder}
                onChange={(event) =>
                  setShobahForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              />
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="shobah-summary">
              خلاصہ
            </label>
            <textarea
              id="shobah-summary"
              className={inputClassName}
              rows={3}
              value={shobahForm.summary}
              onChange={(event) =>
                setShobahForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={objectiveModal != null}
        title={objectiveModal === 'edit' ? 'ترمیم اہداف' : 'نئے اہداف'}
        onClose={closeObjectiveModal}
        footer={
          <ModalFormFooter
            onCancel={closeObjectiveModal}
            primaryLabel={objectiveModal === 'edit' ? 'محفوظ کریں' : 'بنائیں'}
            onPrimaryClick={saveObjective}
            loading={busy}
            primaryDisabled={busy || !objectiveForm.title.trim() || !objectiveShobahId}
            error={formError || undefined}
          />
        }
      >
        <ModalFormSection title="تفصیل">
          <p className="mb-4 text-sm text-secondary">
            شعبہ:{' '}
            <span className="font-medium text-text-heading">
              {objectiveParentShobah?.name ?? '—'}
            </span>
          </p>
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="objective-title">
                عنوان
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
                حالت
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
                ترتیب
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
              تفصیل
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
        isOpen={activityModal != null}
        title={activityModal === 'edit' ? 'ترمیم سرگرمی' : 'نئی سرگرمی'}
        onClose={closeActivityModal}
        footer={
          <ModalFormFooter
            onCancel={closeActivityModal}
            primaryLabel={activityModal === 'edit' ? 'محفوظ کریں' : 'بنائیں'}
            onPrimaryClick={saveActivity}
            loading={busy}
            primaryDisabled={busy || !activityForm.name.trim()}
            error={formError || undefined}
          />
        }
      >
        <div className="mb-4 flex gap-4 text-sm">
          <button
            type="button"
            className={activityModalPane === 'primary' ? 'font-semibold text-primary' : 'text-secondary'}
            onClick={() => setActivityModalPane('primary')}
          >
            اصل
          </button>
          <button
            type="button"
            className={activityModalPane === 'more' ? 'font-semibold text-primary' : 'text-secondary'}
            onClick={() => setActivityModalPane('more')}
          >
            مزید
          </button>
        </div>

        {activityModalPane === 'primary' ? (
        <ModalFormSection title="تفصیل">
          <ModalFormGrid>
            <div className="sm:col-span-2">
              <p className="text-xs text-secondary">شعبہ</p>
              <p className="mt-1 text-sm text-text-heading">{activityContextShobahName}</p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-objective">
                ہدف
              </label>
              <select
                id="activity-objective"
                className={inputClassName}
                value={activityObjectiveId ?? ''}
                onChange={(event) =>
                  setActivityObjectiveId(event.target.value.trim() || null)
                }
              >
                <option value="">غیر متعین</option>
                {objectives
                  .filter((row) =>
                    selectedMansoobaId
                      ? row.mansoobaId === selectedMansoobaId
                      : true,
                  )
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
              </select>
              {!activityObjectiveId ? (
                <p className="mt-1 text-xs text-secondary">
                  {activityContextObjectiveTitle ?? 'ہدف غیر متعین'}
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-name">
                نام
              </label>
              <input
                id="activity-name"
                className={inputClassName}
                value={activityForm.name}
                onChange={(event) =>
                  setActivityForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-kind">
                عملی تعلق
              </label>
              <select
                id="activity-kind"
                className={inputClassName}
                value={activityForm.kind}
                onChange={(event) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    kind: event.target.value as ProgrammeKind,
                  }))
                }
              >
                {ACTIVITY_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-status">
                حالت
              </label>
              <select
                id="activity-status"
                className={inputClassName}
                value={activityForm.status}
                onChange={(event) =>
                  setActivityForm((prev) => ({
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
              <label className={labelClassName} htmlFor="activity-responsible">
                ذمہ دار
              </label>
              <select
                id="activity-responsible"
                className={inputClassName}
                value={activityForm.responsibleRuknId}
                onChange={(event) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    responsibleRuknId: event.target.value,
                  }))
                }
              >
                <option value="">—</option>
                {rukns.map((rukn) => (
                  <option key={rukn.id} value={rukn.id}>
                    {rukn.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-start">
                آغاز
              </label>
              <input
                id="activity-start"
                type="date"
                className={inputClassName}
                value={activityForm.startDate}
                onChange={(event) =>
                  setActivityForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-end">
                اختتام
              </label>
              <input
                id="activity-end"
                type="date"
                className={inputClassName}
                value={activityForm.endDate}
                onChange={(event) =>
                  setActivityForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="activity-frequency">
                نظام الاوقات
              </label>
              <select
                id="activity-frequency"
                className={inputClassName}
                value={activityForm.frequencyCadence}
                onChange={(event) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    frequencyCadence: event.target.value as ActivityFormState['frequencyCadence'],
                  }))
                }
              >
                <option value="">غیر متعین</option>
                <option value="once">یک بار</option>
                <option value="monthly">ماہانہ</option>
                <option value="quarterly">سہ ماہی</option>
                <option value="yearly">سالانہ</option>
                <option value="weekly">ہفتہ وار</option>
                <option value="custom">دیگر</option>
              </select>
            </div>
            {activityForm.frequencyCadence ? (
              <div>
                <label className={labelClassName} htmlFor="activity-frequency-extra">
                  دوسرا نظام الاوقات (اختیاری)
                </label>
                <select
                  id="activity-frequency-extra"
                  className={inputClassName}
                  value={activityForm.frequencyCadenceExtra}
                  onChange={(event) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      frequencyCadenceExtra: event.target
                        .value as ActivityFormState['frequencyCadenceExtra'],
                    }))
                  }
                >
                  <option value="">—</option>
                  <option value="once">یک بار</option>
                  <option value="monthly">ماہانہ</option>
                  <option value="quarterly">سہ ماہی</option>
                  <option value="yearly">سالانہ</option>
                  <option value="weekly">ہفتہ وار</option>
                  <option value="custom">دیگر</option>
                </select>
              </div>
            ) : null}
            {activityForm.frequencyCadence === 'weekly' ? (
              <div>
                <label className={labelClassName} htmlFor="activity-dow">
                  یوم ہفتہ (0–6)
                </label>
                <input
                  id="activity-dow"
                  className={inputClassName}
                  value={activityForm.frequencyDayOfWeek}
                  onChange={(event) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      frequencyDayOfWeek: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {activityForm.frequencyCadence === 'monthly' ||
            activityForm.frequencyCadence === 'yearly' ? (
              <div>
                <label className={labelClassName} htmlFor="activity-dom">
                  یوم ماہ
                </label>
                <input
                  id="activity-dom"
                  className={inputClassName}
                  value={activityForm.frequencyDayOfMonth}
                  onChange={(event) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      frequencyDayOfMonth: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {activityForm.frequencyCadence === 'yearly' ? (
              <div>
                <label className={labelClassName} htmlFor="activity-month">
                  مہینہ (1–12)
                </label>
                <input
                  id="activity-month"
                  className={inputClassName}
                  value={activityForm.frequencyMonth}
                  onChange={(event) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      frequencyMonth: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {activityForm.frequencyCadence === 'custom' ? (
              <div>
                <label className={labelClassName} htmlFor="activity-freq-note">
                  نوٹ
                </label>
                <input
                  id="activity-freq-note"
                  className={inputClassName}
                  value={activityForm.frequencyNote}
                  onChange={(event) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      frequencyNote: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </ModalFormGrid>
        </ModalFormSection>
        ) : (
        <>
          <ModalFormSection title="نوٹس">
          <div>
            <label className={labelClassName} htmlFor="activity-summary">
              خلاصہ
            </label>
            <textarea
              id="activity-summary"
              className={inputClassName}
              rows={3}
              value={activityForm.summary}
              onChange={(event) =>
                setActivityForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
        <ModalFormSection title="سال کے مطابق عمل درآمد">
          <p className="mb-3 text-sm text-secondary">
            یہ حالت اسی سرگرمی کی سالانہ عمل درآمد کی تصویر ہے۔ ہر سال الگ رہتی ہے — ایک سال کی
            تبدیلی دوسرے سال کو نہیں بدلتی۔
          </p>
          <ModalFormGrid>
            {MEQATI_PLAN_YEARS.map((year) => (
              <div key={year.key}>
                <label className={labelClassName} htmlFor={`activity-year-status-${year.key}`}>
                  {year.label}
                </label>
                <select
                  id={`activity-year-status-${year.key}`}
                  className={inputClassName}
                  value={activityForm.yearStatuses[year.key] ?? ''}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    const status: '' | ActivityYearStatus =
                      nextValue === '' || isActivityYearStatus(nextValue) ? nextValue : ''
                    setActivityForm((prev) => ({
                      ...prev,
                      yearStatuses: {
                        ...prev.yearStatuses,
                        [year.key]: status,
                      },
                    }))
                  }}
                >
                  {ACTIVITY_YEAR_STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'unset'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </ModalFormGrid>
        </ModalFormSection>
        </>
        )}
      </Modal>
    </PageShell>
  )
}
