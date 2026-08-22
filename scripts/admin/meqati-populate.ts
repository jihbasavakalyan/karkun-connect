/**
 * Controlled Meqati content population — DEFAULT is DRY-RUN ONLY.
 *
 *   npm run meqati:populate -- --dry-run
 *
 * Production writes require --write-production plus extra safety env.
 * This task must never invoke write mode.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseProgrammeRecurrenceRule } from '@/lib/occurrence/recurrence'
import { normalizeProgrammeSchedule } from '@/lib/planning/programmeSchedule'
import { validateLocalProgrammeForSave } from '@/lib/planning/localProgrammeValidation'
import type { LocalProgramme, ProgrammeFrequency } from '@/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '@/types/planning.types'
import { repositoryOk, type RepositoryResult } from '@/repositories/errors'

const REPO_ROOT = resolve(process.cwd())
const MANIFEST_PATH = resolve(REPO_ROOT, 'docs/meqati-population-manifest-dry-run.json')
const REPORT_PATH = resolve(REPO_ROOT, 'docs/meqati-population-controlled-dry-run-report.json')

const ALLOWED_COLLECTIONS = [
  'meqatiMansoobas',
  'shobahs',
  'objectives',
  'localProgrammes',
] as const

const FORBIDDEN_COLLECTIONS = [
  'rukns',
  'karkuns',
  'connections',
  'responsibilities',
  'work',
  'units',
  'campaigns',
  'occurrences',
  'followUps',
] as const

const POPULATION_ACTOR = 'system:meqati-population'
/** Fixed stamp so reruns produce identical complete payloads (not used as document IDs). */
const POPULATION_STAMP = '2026-08-22T00:00:00.000Z'

const NATIVE_CADENCE = new Set(['monthly', 'quarterly', 'yearly', 'once', 'weekly', 'custom'])

type Manifest = {
  meqatiMansoobas: Array<Record<string, unknown>>
  shobahs: Array<Record<string, unknown>>
  objectives: Array<Record<string, unknown>>
  activities: Array<Record<string, unknown>>
}

type PlannedDoc = {
  collection: (typeof ALLOWED_COLLECTIONS)[number]
  id: string
  operation: 'create' | 'existing-match' | 'existing-differ' | 'preview'
  payload: Record<string, unknown>
  validation: 'PASS' | 'FAIL'
  warnings: string[]
  errors: string[]
  production: 'ABSENT' | 'EXISTS AND MATCHES' | 'EXISTS BUT DIFFERS' | 'PRODUCTION COMPARISON UNAVAILABLE'
}

function argvHas(flag: string): boolean {
  return process.argv.includes(flag)
}

function stripUndefined<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue
    out[key] = value
  }
  return out as T
}

function uniqueIds(ids: string[], label: string, errors: string[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!id?.trim()) {
      errors.push(`${label} has empty id`)
      continue
    }
    if (seen.has(id)) errors.push(`duplicate ${label} id: ${id}`)
    seen.add(id)
  }
}

function mapSchedule(
  activity: Record<string, unknown>,
): { frequency?: LocalProgramme['frequency']; warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []
  const scheduleStatus = String(activity.scheduleStatus ?? '')
  const raw = activity.frequency as
    | { value?: string; patterns?: Array<{ cadence?: string; sourcePhrase?: string }> }
    | undefined

  if (scheduleStatus === 'Not specified' || raw?.value === 'Not specified' || !raw?.patterns?.length) {
    return { frequency: undefined, warnings, errors }
  }

  const mapped: ProgrammeFrequency[] = []
  for (const pattern of raw.patterns) {
    const cadence = String(pattern.cadence ?? '').trim()
    const phrase = pattern.sourcePhrase?.trim()
    if (NATIVE_CADENCE.has(cadence)) {
      const parsed = parseProgrammeRecurrenceRule({ cadence })
      if (!parsed) {
        errors.push(`SCHEDULE BLOCKER: native cadence failed parse (${cadence}) on ${activity.id}`)
        continue
      }
      mapped.push(parsed)
      continue
    }
    // Other configured frequency — preserve source cadence + phrase; do not invent product categories.
    const note = [cadence, phrase].filter(Boolean).join(': ')
    const custom = parseProgrammeRecurrenceRule({ cadence: 'custom', note })
    if (!custom) {
      errors.push(`SCHEDULE BLOCKER: cannot represent cadence "${cadence}" on ${activity.id}`)
      continue
    }
    mapped.push(custom)
    warnings.push(
      `SCHEDULE: "${cadence}" stored as Other configured frequency (custom.note) on ${activity.id} — source phrase preserved`,
    )
  }

  if (errors.length) return { warnings, errors }
  return { frequency: normalizeProgrammeSchedule(mapped), warnings, errors }
}

function buildPlan(manifest: Manifest): { docs: PlannedDoc[]; planErrors: string[] } {
  const planErrors: string[] = []
  const docs: PlannedDoc[] = []

  uniqueIds(manifest.meqatiMansoobas.map((row) => String(row.id)), 'meqatiMansooba', planErrors)
  uniqueIds(manifest.shobahs.map((row) => String(row.id)), 'shobah', planErrors)
  uniqueIds(manifest.objectives.map((row) => String(row.id)), 'objective', planErrors)
  uniqueIds(manifest.activities.map((row) => String(row.id)), 'activity', planErrors)

  if (manifest.meqatiMansoobas.length !== 1) {
    planErrors.push(`expected 1 meqati root, got ${manifest.meqatiMansoobas.length}`)
  }

  const mansoobaSrc = manifest.meqatiMansoobas[0]
  const mansoobaId = String(mansoobaSrc?.id ?? '')
  const mansooba: MeqatiMansooba = stripUndefined({
    id: mansoobaId,
    name: String(mansoobaSrc?.name ?? ''),
    status: 'draft',
    summary: String(mansoobaSrc?.organization ?? ''),
    createdAt: POPULATION_STAMP,
    updatedAt: POPULATION_STAMP,
    createdBy: POPULATION_ACTOR,
    updatedBy: POPULATION_ACTOR,
  })
  docs.push({
    collection: 'meqatiMansoobas',
    id: mansooba.id,
    operation: 'preview',
    payload: mansooba,
    validation: mansooba.id && mansooba.name ? 'PASS' : 'FAIL',
    warnings: [],
    errors: mansooba.id && mansooba.name ? [] : ['Meqati Mansooba requires id and name'],
    production: 'PRODUCTION COMPARISON UNAVAILABLE',
  })

  const shobahIds = new Set<string>()
  for (const row of manifest.shobahs) {
    const id = String(row.id)
    shobahIds.add(id)
    const shobah: Shobah = stripUndefined({
      id,
      mansoobaId: String(row.mansoobaId ?? mansoobaId),
      name: String(row.name ?? ''),
      status: 'active',
      sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
      summary: typeof row.nameNote === 'string' ? row.nameNote : undefined,
      createdAt: POPULATION_STAMP,
      updatedAt: POPULATION_STAMP,
      createdBy: POPULATION_ACTOR,
      updatedBy: POPULATION_ACTOR,
    })
    const errors: string[] = []
    if (shobah.mansoobaId !== mansoobaId) errors.push(`shobah ${id} mansoobaId mismatch`)
    if (!/^H0[1-9]$/.test(id)) errors.push(`shobah id not H01–H09: ${id}`)
    docs.push({
      collection: 'shobahs',
      id,
      operation: 'preview',
      payload: shobah,
      validation: errors.length ? 'FAIL' : 'PASS',
      warnings: [],
      errors,
      production: 'PRODUCTION COMPARISON UNAVAILABLE',
    })
  }

  const objectivesById = new Map<string, PlanningObjective>()
  for (const row of manifest.objectives) {
    const id = String(row.id)
    const objective: PlanningObjective = stripUndefined({
      id,
      mansoobaId: String(row.mansoobaId ?? mansoobaId),
      shobahId: String(row.shobahId ?? ''),
      title: String(row.title ?? ''),
      status: 'active',
      sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
      createdAt: POPULATION_STAMP,
      updatedAt: POPULATION_STAMP,
      createdBy: POPULATION_ACTOR,
      updatedBy: POPULATION_ACTOR,
    })
    objectivesById.set(id, objective)
    const errors: string[] = []
    if (objective.mansoobaId !== mansoobaId) errors.push(`objective ${id} mansoobaId mismatch`)
    if (!shobahIds.has(objective.shobahId)) errors.push(`objective ${id} unknown shobahId`)
    if (!id.startsWith(`${objective.shobahId}-O`)) errors.push(`objective ${id} Head prefix mismatch`)
    docs.push({
      collection: 'objectives',
      id,
      operation: 'preview',
      payload: objective,
      validation: errors.length || !objective.title ? 'FAIL' : 'PASS',
      warnings: [],
      errors: objective.title ? errors : [...errors, 'Objective requires title'],
      production: 'PRODUCTION COMPARISON UNAVAILABLE',
    })
  }

  const fakeObjectiveRepo = {
    getById(id: string): RepositoryResult<PlanningObjective | undefined> {
      return repositoryOk(objectivesById.get(id))
    },
  }
  const fakeCampaignRepo = {
    getById(): RepositoryResult<undefined> {
      return repositoryOk(undefined)
    },
  }

  for (const row of manifest.activities) {
    const id = String(row.id)
    const shobahId = String(row.shobahId ?? '')
    const mappedObjectiveId =
      typeof row.objectiveId === 'string' && row.objectiveId.trim()
        ? row.objectiveId.trim()
        : null
    const schedule = mapSchedule(row)
    const payload: LocalProgramme = stripUndefined({
      id,
      mansoobaId,
      shobahId,
      objectiveId: mappedObjectiveId,
      name: String(row.name ?? ''),
      kind: 'other',
      status: 'draft',
      frequency: schedule.frequency,
      createdAt: POPULATION_STAMP,
      updatedAt: POPULATION_STAMP,
      createdBy: POPULATION_ACTOR,
      updatedBy: POPULATION_ACTOR,
    }) as LocalProgramme
    // Firestore-ready: omit responsibleRuknId and yearStatuses entirely (unset, not invented).

    const errors = [...schedule.errors]
    const warnings = [...schedule.warnings]
    if (!shobahIds.has(shobahId)) errors.push(`activity ${id} unknown shobahId`)
    if (!id.startsWith(`${shobahId}-A`)) errors.push(`activity ${id} Head prefix mismatch`)
    if (mappedObjectiveId) {
      const parent = objectivesById.get(mappedObjectiveId)
      if (!parent) errors.push(`activity ${id} unknown objectiveId ${mappedObjectiveId}`)
      else {
        if (parent.shobahId !== shobahId) {
          errors.push(`activity ${id} Objective belongs to another Head`)
        }
        if (parent.mansoobaId !== mansoobaId) {
          errors.push(`activity ${id} Objective belongs to another Mansooba`)
        }
      }
    }
    if (id === 'H02-A10') {
      const cadences = Array.isArray(payload.frequency)
        ? payload.frequency.map((item) => item.cadence)
        : payload.frequency
          ? [payload.frequency.cadence]
          : []
      if (!(cadences.includes('monthly') && cadences.includes('quarterly'))) {
        errors.push('SCHEDULE BLOCKER: H02-A10 must remain Monthly + Quarterly')
      }
    }

    const invalid = validateLocalProgrammeForSave(
      payload,
      fakeObjectiveRepo,
      fakeCampaignRepo,
    )
    if (invalid) errors.push(invalid.error.message)

    docs.push({
      collection: 'localProgrammes',
      id,
      operation: 'preview',
      payload: payload as unknown as Record<string, unknown>,
      validation: errors.length ? 'FAIL' : 'PASS',
      warnings,
      errors,
      production: 'PRODUCTION COMPARISON UNAVAILABLE',
    })
  }

  const o09 = objectivesById.get('H01-O09')
  if (o09?.title !== 'کونسلنگ سنٹر اور شرعی پنچایت کو مستحکم کیا جائے گا۔') {
    planErrors.push('H01-O09 wording mismatch')
  }

  return { docs, planErrors }
}

function comparable(payload: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set(['createdAt', 'updatedAt', 'createdBy', 'updatedBy', '_revision', '_updatedAt', '_serverTime'])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (skip.has(key) || value === undefined) continue
    out[key] = value
  }
  return out
}

async function compareProduction(docs: PlannedDoc[]): Promise<{
  available: boolean
  projectId: string | null
  reason?: string
}> {
  try {
    const { initFirebaseAdmin } = await import('./_firebase-init.mjs')
    const admin = initFirebaseAdmin()
    const db = admin.db
    for (const doc of docs) {
      const snap = await db.collection(doc.collection).doc(doc.id).get()
      if (!snap.exists) {
        doc.production = 'ABSENT'
        doc.operation = 'create'
        continue
      }
      const existing = snap.data() as Record<string, unknown>
      const same = JSON.stringify(comparable(existing)) === JSON.stringify(comparable(doc.payload))
      doc.production = same ? 'EXISTS AND MATCHES' : 'EXISTS BUT DIFFERS'
      doc.operation = same ? 'existing-match' : 'existing-differ'
    }
    return { available: true, projectId: admin.projectId ?? null }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    for (const doc of docs) {
      doc.production = 'PRODUCTION COMPARISON UNAVAILABLE'
      doc.operation = 'preview'
    }
    return { available: false, projectId: null, reason }
  }
}

function printDocs(docs: PlannedDoc[]) {
  for (const doc of docs) {
    console.log('---')
    console.log(`collection: ${doc.collection}`)
    console.log(`id: ${doc.id}`)
    console.log(`classification: ${doc.operation}`)
    console.log(`production: ${doc.production}`)
    console.log(`validation: ${doc.validation}`)
    if (doc.warnings.length) console.log(`warnings: ${doc.warnings.join(' | ')}`)
    if (doc.errors.length) console.log(`errors: ${doc.errors.join(' | ')}`)
    console.log('payload:')
    console.log(JSON.stringify(doc.payload, null, 2))
  }
}

async function main() {
  const writeRequested = argvHas('--write-production')
  const dryRun = !writeRequested || argvHas('--dry-run')

  if (writeRequested) {
    console.error('REFUSED: --write-production is gated and must not run in this task.')
    console.error('Use npm run meqati:populate -- --dry-run')
    process.exitCode = 2
    return
  }

  for (const forbidden of FORBIDDEN_COLLECTIONS) {
    if (ALLOWED_COLLECTIONS.includes(forbidden as (typeof ALLOWED_COLLECTIONS)[number])) {
      throw new Error(`forbidden collection leaked into allow-list: ${forbidden}`)
    }
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
  const { docs, planErrors } = buildPlan(manifest)
  const comparison = await compareProduction(docs)

  const activities = docs.filter((row) => row.collection === 'localProgrammes')
  const mapped = activities.filter((row) => typeof row.payload.objectiveId === 'string')
  const blank = activities.filter((row) => row.payload.objectiveId == null)
  const scheduleBlockers = docs.filter((row) =>
    row.errors.some((item) => item.includes('SCHEDULE BLOCKER')),
  )
  const failed = docs.filter((row) => row.validation === 'FAIL')

  const totals = {
    meqatiMansoobas: docs.filter((row) => row.collection === 'meqatiMansoobas').length,
    shobahs: docs.filter((row) => row.collection === 'shobahs').length,
    objectives: docs.filter((row) => row.collection === 'objectives').length,
    localProgrammes: activities.length,
    activitiesApprovedObjective: mapped.length,
    activitiesObjectiveNull: blank.length,
    h09Objectives: docs.filter(
      (row) => row.collection === 'objectives' && String(row.payload.shobahId) === 'H09',
    ).length,
    h09Activities: activities.filter((row) => String(row.payload.shobahId) === 'H09').length,
    allowedCollections: [...ALLOWED_COLLECTIONS],
    forbiddenCollectionsUntouched: [...FORBIDDEN_COLLECTIONS],
    firestoreWrites: false,
    dryRun: true,
  }

  printDocs(docs)

  console.log('\n========== TOTALS ==========')
  console.log(JSON.stringify(totals, null, 2))
  console.log('planErrors:', planErrors)
  console.log('validationFailures:', failed.length)
  console.log('scheduleBlockers:', scheduleBlockers.map((row) => row.id))
  console.log(
    'productionComparison:',
    comparison.available
      ? `READ-ONLY against project ${comparison.projectId}`
      : `PRODUCTION COMPARISON UNAVAILABLE (${comparison.reason})`,
  )
  console.log('NO PRODUCTION FIRESTORE WRITES')

  mkdirSync(resolve(REPO_ROOT, 'docs'), { recursive: true })
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun: true,
        firestoreWrites: false,
        totals,
        planErrors,
        productionComparison: comparison,
        documents: docs,
      },
      null,
      2,
    ),
    'utf8',
  )
  console.log(`report: ${REPORT_PATH}`)

  if (!dryRun) {
    process.exitCode = 2
    return
  }
  if (planErrors.length || failed.length || scheduleBlockers.length) {
    process.exitCode = 1
  }
}

await main()
