/**
 * Controlled Meqati content population — DEFAULT is DRY-RUN ONLY.
 *
 *   npm run meqati:populate -- --dry-run
 *
 * Production write (explicit authorization required):
 *   npx vite-node scripts/admin/meqati-populate.ts -- --write-production
 *
 * --write-production is refused if --dry-run is also present.
 * Write scope is only meqatiMansoobas / shobahs / objectives / localProgrammes.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Firestore } from 'firebase-admin/firestore'
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

const REQUIRED_PROJECT_ID = 'karkun-connect-75c68'
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

function assertPreWriteGates(
  docs: PlannedDoc[],
  planErrors: string[],
  comparison: { available: boolean; projectId: string | null },
): string[] {
  const stop: string[] = [...planErrors]
  if (!comparison.available) {
    stop.push('PRODUCTION COMPARISON UNAVAILABLE — write aborted')
  }
  if (comparison.projectId !== REQUIRED_PROJECT_ID) {
    stop.push(
      `Firebase project mismatch: ${comparison.projectId ?? 'null'} (required ${REQUIRED_PROJECT_ID})`,
    )
  }
  const counts = {
    meqatiMansoobas: docs.filter((row) => row.collection === 'meqatiMansoobas').length,
    shobahs: docs.filter((row) => row.collection === 'shobahs').length,
    objectives: docs.filter((row) => row.collection === 'objectives').length,
    localProgrammes: docs.filter((row) => row.collection === 'localProgrammes').length,
  }
  if (counts.meqatiMansoobas !== 1 || counts.shobahs !== 9 || counts.objectives !== 43 || counts.localProgrammes !== 77) {
    stop.push(`count mismatch: ${JSON.stringify(counts)}`)
  }
  if (docs.length !== 130) stop.push(`expected 130 documents, got ${docs.length}`)
  if (docs.some((row) => row.validation === 'FAIL')) stop.push('validationFailures present')
  if (docs.some((row) => row.errors.some((item) => item.includes('SCHEDULE BLOCKER')))) {
    stop.push('scheduleBlockers present')
  }
  const present = docs.filter((row) => row.production !== 'ABSENT')
  if (present.length) {
    stop.push(
      `target documents not absent: ${present.map((row) => `${row.collection}/${row.id}=${row.production}`).join(', ')}`,
    )
  }
  const collections = new Set(docs.map((row) => row.collection))
  for (const name of collections) {
    if (!ALLOWED_COLLECTIONS.includes(name)) stop.push(`disallowed collection in plan: ${name}`)
  }
  const h09o = docs.filter((row) => row.collection === 'objectives' && String(row.payload.shobahId) === 'H09')
  const h09a = docs.filter((row) => row.collection === 'localProgrammes' && String(row.payload.shobahId) === 'H09')
  if (h09o.length !== 3 || h09a.length !== 0) stop.push('H09 structure mismatch')
  const o09 = docs.find((row) => row.id === 'H01-O09')
  if (o09?.payload.title !== 'کونسلنگ سنٹر اور شرعی پنچایت کو مستحکم کیا جائے گا۔') {
    stop.push('H01-O09 wording mismatch')
  }
  return stop
}

async function snapshotForbidden(db: Firestore): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const name of FORBIDDEN_COLLECTIONS) {
    out[name] = await countCollection(db, name)
  }
  return out
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as T
  }
  if (value === null || value === undefined) return value
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) continue
      sanitized[key] = stripUndefinedDeep(child)
    }
    return sanitized as T
  }
  return value
}

async function writeProduction(docs: PlannedDoc[], projectId: string): Promise<void> {
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`refusing write: project ${projectId}`)
  }
  const { initFirebaseAdmin } = await import('./_firebase-init.mjs')
  const admin = initFirebaseAdmin()
  if (admin.projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`refusing write: runtime project ${admin.projectId}`)
  }
  const db = admin.db
  const batch = db.batch()
  for (const doc of docs) {
    if (!ALLOWED_COLLECTIONS.includes(doc.collection)) {
      throw new Error(`refusing write to ${doc.collection}`)
    }
    batch.set(db.collection(doc.collection).doc(doc.id), stripUndefinedDeep(doc.payload))
  }
  await batch.commit()
}

async function countCollection(db: Firestore, name: string): Promise<number> {
  const snap = await db.collection(name).count().get()
  return snap.data().count
}

async function verifyAfterWrite(
  docs: PlannedDoc[],
  forbiddenBefore: Record<string, number>,
): Promise<{
  ok: boolean
  details: Record<string, unknown>
}> {
  const { initFirebaseAdmin } = await import('./_firebase-init.mjs')
  const admin = initFirebaseAdmin()
  const db = admin.db
  const details: Record<string, unknown> = { projectId: admin.projectId }
  if (admin.projectId !== REQUIRED_PROJECT_ID) {
    return { ok: false, details: { ...details, error: 'project mismatch after write' } }
  }

  const counts: Record<string, number> = {}
  for (const name of ALLOWED_COLLECTIONS) {
    counts[name] = await countCollection(db, name)
  }
  const forbiddenAfter: Record<string, number> = {}
  for (const name of FORBIDDEN_COLLECTIONS) {
    forbiddenAfter[name] = await countCollection(db, name)
  }

  let mapped = 0
  let blank = 0
  let h09Activities = 0
  let h09Objectives = 0
  const mismatches: string[] = []
  for (const planned of docs) {
    const snap = await db.collection(planned.collection).doc(planned.id).get()
    if (!snap.exists) {
      mismatches.push(`missing ${planned.collection}/${planned.id}`)
      continue
    }
    const data = snap.data() as Record<string, unknown>
    if (JSON.stringify(comparable(data)) !== JSON.stringify(comparable(planned.payload))) {
      mismatches.push(`differs ${planned.collection}/${planned.id}`)
    }
    if (planned.collection === 'localProgrammes') {
      if (typeof data.objectiveId === 'string' && data.objectiveId.trim()) mapped++
      else blank++
      if (data.shobahId === 'H09') h09Activities++
    }
    if (planned.collection === 'objectives' && data.shobahId === 'H09') h09Objectives++
  }

  const h02a10 = (await db.collection('localProgrammes').doc('H02-A10').get()).data()
  const freq = h02a10?.frequency as Array<{ cadence?: string }> | undefined
  const cadences = Array.isArray(freq) ? freq.map((row) => row.cadence) : []
  const others: Record<string, unknown> = {}
  for (const id of ['H02-A01', 'H05-A07', 'H06-A04']) {
    const row = (await db.collection('localProgrammes').doc(id).get()).data()
    const f = row?.frequency as { cadence?: string; note?: string } | undefined
    others[id] = f
  }
  const o09 = (await db.collection('objectives').doc('H01-O09').get()).data()

  const forbiddenChanged = Object.fromEntries(
    FORBIDDEN_COLLECTIONS.map((name) => [
      name,
      { before: forbiddenBefore[name], after: forbiddenAfter[name] },
    ]),
  )
  const unexpectedForbiddenWrites = FORBIDDEN_COLLECTIONS.filter(
    (name) => forbiddenAfter[name] !== forbiddenBefore[name],
  )

  details.counts = counts
  details.forbiddenChanged = forbiddenChanged
  details.unexpectedForbiddenWrites = unexpectedForbiddenWrites
  details.mapped = mapped
  details.blank = blank
  details.h09Objectives = h09Objectives
  details.h09Activities = h09Activities
  details.h02a10Cadences = cadences
  details.otherConfigured = others
  details.h01o09 = o09?.title
  details.mismatches = mismatches

  const otherCadencesOk = ['H02-A01', 'H05-A07', 'H06-A04'].every((id) => {
    const row = others[id] as { cadence?: string } | undefined
    return row?.cadence === 'custom'
  })

  const ok =
    counts.meqatiMansoobas === 1 &&
    counts.shobahs === 9 &&
    counts.objectives === 43 &&
    counts.localProgrammes === 77 &&
    mapped === 37 &&
    blank === 40 &&
    h09Objectives === 3 &&
    h09Activities === 0 &&
    cadences.includes('monthly') &&
    cadences.includes('quarterly') &&
    otherCadencesOk &&
    o09?.title === 'کونسلنگ سنٹر اور شرعی پنچایت کو مستحکم کیا جائے گا۔' &&
    unexpectedForbiddenWrites.length === 0 &&
    mismatches.length === 0

  return { ok, details }
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
  const dryRunFlag = argvHas('--dry-run')
  const dryRun = !writeRequested || dryRunFlag

  if (writeRequested && dryRunFlag) {
    console.error('REFUSED: --write-production cannot be combined with --dry-run.')
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
    firestoreWrites: writeRequested && !dryRun,
    dryRun,
  }

  if (dryRun) {
    printDocs(docs)
  }

  console.log('\n========== TOTALS ==========')
  console.log(JSON.stringify(totals, null, 2))
  console.log('planErrors:', planErrors)
  console.log('validationFailures:', failed.length)
  console.log('scheduleBlockers:', scheduleBlockers.map((row) => row.id))
  console.log(
    'productionComparison:',
    comparison.available
      ? `${writeRequested ? 'PRE-WRITE' : 'READ-ONLY'} against project ${comparison.projectId}`
      : `PRODUCTION COMPARISON UNAVAILABLE (${comparison.reason})`,
  )

  if (!writeRequested || dryRun) {
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
    if (planErrors.length || failed.length || scheduleBlockers.length) {
      process.exitCode = 1
    }
    return
  }

  const gates = assertPreWriteGates(docs, planErrors, comparison)
  if (gates.length) {
    console.error('PRE-WRITE SAFETY FAILED — STOP WITHOUT WRITING')
    for (const item of gates) console.error(`- ${item}`)
    process.exitCode = 2
    return
  }

  console.log('PRE-WRITE SAFETY: PASS')
  const { initFirebaseAdmin } = await import('./_firebase-init.mjs')
  const admin = initFirebaseAdmin()
  const forbiddenBefore = await snapshotForbidden(admin.db)
  console.log(`Writing 130 complete documents to ${REQUIRED_PROJECT_ID} (allowed collections only)`)
  await writeProduction(docs, comparison.projectId!)
  console.log('WRITE COMMITTED')

  const verification = await verifyAfterWrite(docs, forbiddenBefore)
  console.log('POST-WRITE VERIFICATION')
  console.log(JSON.stringify(verification.details, null, 2))
  writeFileSync(
    resolve(REPO_ROOT, 'docs/meqati-population-production-write-report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun: false,
        firestoreWrites: true,
        projectId: comparison.projectId,
        totals,
        productionComparisonBefore: comparison,
        postWrite: verification,
      },
      null,
      2,
    ),
    'utf8',
  )
  if (!verification.ok) {
    console.error('POST-WRITE VALIDATION FAILED — no silent repair')
    process.exitCode = 1
    return
  }
  console.log('POST-WRITE VALIDATION: PASS')
}

await main()
