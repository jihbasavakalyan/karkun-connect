/**
 * Admin planning — میقاتی منصوبہ → شعبہ → اہداف → سرگرمی.
 * Campaign is a focus overlay. Unit / Work / Occurrence are not user-facing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { CardSkeleton, PageHeader, PageShell } from '@/components/ui'
import '@/pages/admin/meqati/meqatiPlanningCanvas.css'
import { useAuth } from '@/hooks/useAuth'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useBusyAction } from '@/hooks/useBusyAction'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { Rukn } from '@/data/ruknMaster'
import { listMeqatiPlanYears, resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import {
  isActivityYearStatus,
  normalizeActivityYearStatuses,
  type ActivityYearStatus,
} from '@/lib/planning/activityYearStatus'
import { computeActivityProgress } from '@/lib/planning/activityProgress'
import { selectCanonicalMeqatiMansooba } from '@/lib/planning/canonicalMeqatiMansooba'
import {
  formatProgrammeScheduleLabel,
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
import { MeqatiPlanningWorkspace, type MeqatiNavView } from '@/pages/admin/meqati/MeqatiPlanningWorkspace'
import {
  buildShobahOverviewItems,
  isMappedActivity,
  shobahHeadCode,
  shobahVisual,
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

function formatAuditTimestamp(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ur-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 16)
  }
}

export function AdminPlanningPage() {
  const { user } = useAuth()
  const { run, busy } = useBusyAction()
  const backgroundReady = useBackgroundHydration()
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
  const [navView, setNavView] = useState<MeqatiNavView>({ level: 'overview' })
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
      return selectCanonicalMeqatiMansooba(nextMansoobas)?.id ?? null
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
    if (!backgroundReady) return
    refresh()
  }, [refresh, backgroundReady])

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
    navView.level === 'overview'
      ? null
      : visibleShobahs.some((row) => row.id === navView.shobahId)
        ? navView.shobahId
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
    navView.level === 'objective' &&
    visibleObjectives.some((row) => row.id === navView.objectiveId)
      ? navView.objectiveId
      : selectedObjectiveId && visibleObjectives.some((row) => row.id === selectedObjectiveId)
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
        setNavView({ level: 'shobah', shobahId: record.id })
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
    setActivityModal('create')
    setFormError('')
    setMessage('')
  }

  const openEditActivity = (row: LocalProgramme) => {
    setEditingActivityId(row.id)
    setActivityObjectiveId(row.objectiveId?.trim() || null)
    setActivityForm(activityFormFromRow(row))
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
        const existing = editingActivityId
          ? programmes.find((row) => row.id === editingActivityId)
          : undefined
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
        } else if (existing) {
          mansoobaId = existing.mansoobaId
          shobahId = existing.shobahId
        } else {
          mansoobaId = selectedMansoobaId ?? undefined
          shobahId = selectedShobahIdResolved ?? undefined
        }
        if (!mansoobaId?.trim() || !shobahId?.trim()) {
          setFormError('شعبہ منتخب کریں تاکہ سرگرمی کا سیاق محفوظ رہے۔')
          return
        }
        const now = new Date().toISOString()
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

  const editingActivityShobah =
    shobahs.find((row) => row.id === editingActivity?.shobahId) ??
    selectedShobah ??
    null
  const editingActivityVisual = editingActivityShobah ? shobahVisual(editingActivityShobah) : null
  const editingActivityHeadCode = editingActivityShobah ? shobahHeadCode(editingActivityShobah) : null

  const activityTargetShobahId =
    editingActivity?.shobahId ??
    (activityObjectiveId
      ? objectives.find((row) => row.id === activityObjectiveId)?.shobahId
      : null) ??
    selectedShobahIdResolved

  const shobahObjectives = useMemo(() => {
    return objectives.filter((row) => {
      if (row.status === 'archived') return false
      if (selectedMansoobaId && row.mansoobaId !== selectedMansoobaId) return false
      return activityTargetShobahId ? row.shobahId === activityTargetShobahId : true
    })
  }, [objectives, selectedMansoobaId, activityTargetShobahId])

  const currentMeqatiYear = useMemo(() => resolveMeqatiYear(), [])
  const currentYearKey = currentMeqatiYear.key
  const currentYearStatus = activityForm.yearStatuses[currentYearKey] ?? ''

  const activityRequiresAttention =
    !activityObjectiveId?.trim() ||
    !activityForm.responsibleRuknId.trim() ||
    !activityForm.frequencyCadence

  const calculatedProgress = useMemo(() => {
    return computeActivityProgress({
      activity: {
        id: editingActivityId ?? 'new',
        name: activityForm.name,
        summary: activityForm.summary,
        yearStatuses: normalizeActivityYearStatuses(activityForm.yearStatuses),
        objectiveId: activityObjectiveId,
        responsibleRuknId: activityForm.responsibleRuknId,
        frequency: buildActivityFrequency(activityForm),
      },
      yearKey: currentYearKey,
      occurrences,
    })
  }, [
    editingActivityId,
    activityForm.name,
    activityForm.summary,
    activityForm.yearStatuses,
    activityForm.responsibleRuknId,
    activityForm.frequencyCadence,
    activityForm.frequencyCadenceExtra,
    activityForm.frequencyDayOfWeek,
    activityForm.frequencyDayOfMonth,
    activityForm.frequencyMonth,
    activityForm.frequencyNote,
    activityObjectiveId,
    currentYearKey,
    occurrences,
  ])

  return (
    <PageShell>
      <div className="meqati-planning-canvas space-y-6">
      <PageHeader title="میقاتی منصوبہ" />

      {message ? (
        <p
          className={`mb-4 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-8" dir="rtl" lang="ur">
        {!backgroundReady ? (
          <div aria-busy="true">
            <p className="mb-3 text-sm text-secondary">لوڈ ہو رہا ہے…</p>
            <CardSkeleton count={3} />
          </div>
        ) : (
        <MeqatiPlanningWorkspace
          mansooba={selectedMansooba}
          totals={mansoobaTotals}
          shobahItems={shobahOverviewItems}
          visibleObjectives={visibleObjectives}
          shobahActivities={shobahActivities}
          unmappedActivities={unmappedActivities}
          programmes={programmes}
          ruknNameById={ruknNameById}
          view={navView}
          onViewChange={(next) => {
            setNavView(next)
            if (next.level === 'objective') {
              setSelectedObjectiveId(next.objectiveId)
            } else if (next.level === 'overview') {
              setSelectedObjectiveId(null)
            }
          }}
          canCreateMansooba={canCreateMansooba}
          onCreateMansooba={openCreateMansooba}
          onEditMansooba={() => {
            if (selectedMansooba) openEditMansooba(selectedMansooba)
          }}
          onCreateShobah={openCreateShobah}
          onEditShobah={openEditShobah}
          onCreateObjective={openCreateObjective}
          onEditObjective={openEditObjective}
          onCreateActivity={openCreateActivity}
          onOpenActivity={openEditActivity}
        />
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
        title={activityModal === 'edit' ? 'سرگرمی اپ ڈیٹ سینٹر' : 'نئی سرگرمی'}
        onClose={closeActivityModal}
        size="form"
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
        <div className="space-y-5" dir="rtl" lang="ur">
          {/* Header context card */}
          <div
            className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3"
            style={
              editingActivityVisual
                ? {
                    backgroundColor: editingActivityVisual.wash,
                    borderColor: `color-mix(in srgb, ${editingActivityVisual.accent} 25%, #e2e5ea)`,
                  }
                : {
                    backgroundColor: '#f8fafc',
                    borderColor: 'var(--color-border)',
                  }
            }
          >
            <div>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 text-text-heading border border-border/40">
                {editingActivityHeadCode ? `${editingActivityHeadCode} — ` : ''}
                {activityContextShobahName}
              </span>
              <p className="mt-1 text-xs text-secondary">
                میقاتی منصوبہ: {selectedMansooba?.name ?? 'میقاتی منصوبہ'}
              </p>
            </div>
            {editingActivity ? (
              <span className="text-xs text-secondary bg-white/70 px-2 py-1 rounded">
                شناخت: {editingActivity.id}
              </span>
            ) : null}
          </div>

          {/* Activity Name */}
          <div>
            <label className={labelClassName} htmlFor="activity-name">
              سرگرمی کا نام
            </label>
            <input
              id="activity-name"
              className={inputClassName}
              placeholder="سرگرمی کا عنوان..."
              value={activityForm.name}
              onChange={(event) =>
                setActivityForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>

          {/* Objective Mapping & Data-Quality Section */}
          {!activityObjectiveId ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <span aria-hidden>⚠️</span>
                  سرگرمی بغیر ہدف ہے (ہدف: غیر متعین)
                </span>
                <span className="rounded bg-amber-200/90 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  توجہ درکار
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                اس سرگرمی کو تصدیق شدہ ہدف سے جوڑیں۔ نظام خود سے ہدف کا اندازہ نہیں لگاتا۔
              </p>
              <div className="mt-3">
                <label htmlFor="activity-link-objective" className="block text-xs font-medium text-amber-900 mb-1">
                  شعبہ کے تصدیق شدہ اہداف سے انتخاب کریں:
                </label>
                <select
                  id="activity-link-objective"
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none"
                  value=""
                  onChange={(event) =>
                    setActivityObjectiveId(event.target.value.trim() || null)
                  }
                >
                  <option value="">— تصدیق شدہ ہدف منتخب کریں —</option>
                  {shobahObjectives.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-muted/50 p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-xs text-secondary">منسلک ہدف</span>
                <span className="mt-0.5 block text-sm font-semibold text-text-heading whitespace-normal break-words">
                  {objectives.find((row) => row.id === activityObjectiveId)?.title ?? 'اہداف'}
                </span>
              </div>
              <select
                id="activity-change-objective"
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-heading focus:border-primary focus:outline-none"
                value={activityObjectiveId}
                onChange={(event) =>
                  setActivityObjectiveId(event.target.value.trim() || null)
                }
              >
                <option value="">ہدف الگ کریں (بغیر ہدف)</option>
                {shobahObjectives.map((row) => (
                  <option key={row.id} value={row.id}>
                    تبدیل: {row.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Implementation Status (Current Year) */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-heading">
                  عمل درآمد صورتحال ({currentMeqatiYear.label})
                </h4>
                <p className="text-xs text-secondary">
                  موجودہ میقاتی سال کے لیے حالت کا تعین ایک کلک سے کریں۔
                </p>
              </div>
              {activityRequiresAttention ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  ⚠️ توجہ درکار
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                  currentYearStatus === 'remaining'
                    ? 'border-zinc-700 bg-zinc-700 text-white shadow-sm ring-2 ring-zinc-700/20'
                    : 'border-border bg-surface hover:bg-surface-muted text-text-heading'
                }`}
                onClick={() =>
                  setActivityForm((prev) => ({
                    ...prev,
                    yearStatuses: {
                      ...prev.yearStatuses,
                      [currentYearKey]: 'remaining',
                    },
                  }))
                }
              >
                شروع نہیں
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                  currentYearStatus === 'in_progress'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                    : 'border-border bg-surface hover:bg-surface-muted text-text-heading'
                }`}
                onClick={() =>
                  setActivityForm((prev) => ({
                    ...prev,
                    yearStatuses: {
                      ...prev.yearStatuses,
                      [currentYearKey]: 'in_progress',
                    },
                  }))
                }
              >
                جاری
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                  currentYearStatus === 'completed'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'border-border bg-surface hover:bg-surface-muted text-text-heading'
                }`}
                onClick={() =>
                  setActivityForm((prev) => ({
                    ...prev,
                    yearStatuses: {
                      ...prev.yearStatuses,
                      [currentYearKey]: 'completed',
                    },
                  }))
                }
              >
                مکمل
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2.5 text-xs transition-all ${
                  !currentYearStatus
                    ? 'border-primary/60 bg-primary/10 text-primary font-medium'
                    : 'border-border bg-surface text-secondary hover:bg-surface-muted'
                }`}
                onClick={() =>
                  setActivityForm((prev) => ({
                    ...prev,
                    yearStatuses: {
                      ...prev.yearStatuses,
                      [currentYearKey]: '',
                    },
                  }))
                }
              >
                غیر متعین
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-heading">پیش رفت (Progress)</span>
              <span className="font-semibold text-primary tabular-nums">
                {calculatedProgress.displayUrdu}
              </span>
            </div>
            {calculatedProgress.kind === 'numeric' || calculatedProgress.kind === 'recurring' ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${calculatedProgress.percentage}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-secondary">
                معیاری سرگرمی: صورتحال کے مطابق ٹریک ہو رہی ہے۔ کوئی مصنوعی فیصد فرض نہیں کیا گیا۔
              </p>
            )}
          </div>

          {/* Responsible & Schedule Section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="activity-responsible">
                ذمہ دار (Responsible)
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
                <option value="">— غیر متعین —</option>
                {rukns.map((rukn) => (
                  <option key={rukn.id} value={rukn.id}>
                    {rukn.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="activity-frequency">
                نظام الاوقات (Schedule)
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
          </div>

          {/* Conditional Schedule Fields */}
          {activityForm.frequencyCadence ? (
            <div className="rounded-lg border border-border bg-surface-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">
                  موجودہ نظام الاوقات: {formatProgrammeScheduleLabel(buildActivityFrequency(activityForm))}
                </span>
                <span className="text-xs text-secondary">KC-DEC-015 مطابقت</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-text-heading mb-1" htmlFor="activity-frequency-extra">
                    دوسرا نظام الاوقات (اختیاری — مثلاً سہ ماہی جائزہ)
                  </label>
                  <select
                    id="activity-frequency-extra"
                    className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-text-heading focus:border-primary focus:outline-none"
                    value={activityForm.frequencyCadenceExtra}
                    onChange={(event) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        frequencyCadenceExtra: event.target
                          .value as ActivityFormState['frequencyCadenceExtra'],
                      }))
                    }
                  >
                    <option value="">— کوئی نہیں —</option>
                    <option value="once">یک بار</option>
                    <option value="monthly">ماہانہ</option>
                    <option value="quarterly">سہ ماہی</option>
                    <option value="yearly">سالانہ</option>
                    <option value="weekly">ہفتہ وار</option>
                    <option value="custom">دیگر</option>
                  </select>
                </div>

                {activityForm.frequencyCadence === 'weekly' ? (
                  <div>
                    <label className="block text-xs font-medium text-text-heading mb-1" htmlFor="activity-dow">
                      یوم ہفتہ (0–6)
                    </label>
                    <input
                      id="activity-dow"
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-text-heading"
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

                {activityForm.frequencyCadence === 'monthly' || activityForm.frequencyCadence === 'yearly' ? (
                  <div>
                    <label className="block text-xs font-medium text-text-heading mb-1" htmlFor="activity-dom">
                      یوم ماہ (Day of Month)
                    </label>
                    <input
                      id="activity-dom"
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-text-heading"
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
                    <label className="block text-xs font-medium text-text-heading mb-1" htmlFor="activity-month">
                      مہینہ (1–12)
                    </label>
                    <input
                      id="activity-month"
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-text-heading"
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
                    <label className="block text-xs font-medium text-text-heading mb-1" htmlFor="activity-freq-note">
                      نوٹ (تکرار کی تفصیل)
                    </label>
                    <input
                      id="activity-freq-note"
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-text-heading"
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
              </div>
            </div>
          ) : null}

          {/* Remarks / Report */}
          <div>
            <label className={labelClassName} htmlFor="activity-summary">
              مختصر کیفیت / حالیہ رپورٹ
            </label>
            <textarea
              id="activity-summary"
              className={inputClassName}
              rows={2}
              placeholder="مختصر کیفیت یا پیش رفت درج کریں (اختیاری)... عددی ہدف کے لیے 32/50 بھی درج کر سکتے ہیں"
              value={activityForm.summary}
              onChange={(event) =>
                setActivityForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>

          {/* Advanced / Multi-Year Accordion */}
          <details className="rounded-xl border border-border bg-surface p-3.5">
            <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-text-heading">
              مزید ترتیبات (سال بہ سال عمل درآمد، زمرہ، تاریخ)
            </summary>
            <div className="mt-4 space-y-4 pt-3 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-text-heading mb-2">
                  سال کے مطابق عمل درآمد (2023–27):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MEQATI_PLAN_YEARS.map((year) => (
                    <div key={year.key}>
                      <label className="block text-xs text-secondary mb-1" htmlFor={`activity-year-status-${year.key}`}>
                        {year.label}
                      </label>
                      <select
                        id={`activity-year-status-${year.key}`}
                        className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-text-heading focus:border-primary focus:outline-none"
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
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div>
                  <label className="block text-xs text-secondary mb-1" htmlFor="activity-kind">
                    عملی زمرہ
                  </label>
                  <select
                    id="activity-kind"
                    className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-text-heading focus:border-primary focus:outline-none"
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
                  <label className="block text-xs text-secondary mb-1" htmlFor="activity-status">
                    لائف سائیکل
                  </label>
                  <select
                    id="activity-status"
                    className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-text-heading focus:border-primary focus:outline-none"
                    value={activityForm.status}
                    onChange={(event) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        status: event.target.value as LocalProgrammeStatus,
                      }))
                    }
                  >
                    <option value="draft">مسودہ</option>
                    <option value="active">فعال</option>
                    <option value="archived">محفوظ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-secondary mb-1" htmlFor="activity-start">
                    آغاز
                  </label>
                  <input
                    id="activity-start"
                    type="date"
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text-heading"
                    value={activityForm.startDate}
                    onChange={(event) =>
                      setActivityForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Audit trail */}
          {editingActivity ? (
            <div className="border-t border-border/80 pt-3 text-xs text-secondary flex flex-wrap items-center justify-between gap-2">
              <span>
                آخری ترمیم: {editingActivity.updatedAt ? formatAuditTimestamp(editingActivity.updatedAt) : '—'}
                {editingActivity.updatedBy ? ` · بذریعہ ${editingActivity.updatedBy}` : ''}
              </span>
              <span>
                تخلیق: {editingActivity.createdAt ? editingActivity.createdAt.slice(0, 10) : '—'}
              </span>
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  )
}
