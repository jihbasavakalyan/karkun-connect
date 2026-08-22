/**
 * Presentation-only: Meqati workspace is one-level navigation.
 * Reads source + dry-run fixture. Does not write Firestore.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildShobahOverviewItems } from '../src/pages/admin/meqati/meqatiPlanningPresentation'
import { MeqatiPlanningWorkspace } from '../src/pages/admin/meqati/MeqatiPlanningWorkspace'
import type { LocalProgramme } from '../src/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '../src/types/planning.types'

const page = readFileSync('src/pages/admin/AdminPlanningPage.tsx', 'utf8')
const workspace = readFileSync('src/pages/admin/meqati/MeqatiPlanningWorkspace.tsx', 'utf8')
assert.match(page, /MeqatiPlanningWorkspace/)
assert.match(workspace, /level: 'overview'/)
assert.match(workspace, /level: 'shobah'/)
assert.match(workspace, /level: 'objective'/)
assert.match(workspace, /level: 'unmapped'/)
assert.match(workspace, /اس ہدف کے لیے ابھی کوئی سرگرمی درج نہیں/)
assert.match(workspace, /بغیر اہداف/)
assert.match(workspace, /CompactActivityList/)

const manifest = JSON.parse(
  readFileSync('docs/meqati-population-manifest-dry-run.json', 'utf8'),
) as {
  meqatiMansoobas: Array<{ id: string; name: string; status: string }>
  shobahs: Array<{ id: string; mansoobaId: string; name: string; status: string; sortOrder?: number }>
  objectives: Array<{
    id: string
    mansoobaId: string
    shobahId: string
    title: string
    status: string
    sortOrder?: number
  }>
  activities: Array<{
    id: string
    mansoobaId: string
    shobahId: string
    objectiveId: string | null
    name: string
    kind: string
    status: string
  }>
  totals?: { mapped?: number; blank?: number }
}

const stamp = '2026-08-22T00:00:00.000Z'
const mansooba: MeqatiMansooba = {
  id: manifest.meqatiMansoobas[0].id,
  name: manifest.meqatiMansoobas[0].name,
  status: 'draft',
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}
const shobahs: Shobah[] = manifest.shobahs.map((row) => ({
  id: row.id,
  mansoobaId: row.mansoobaId,
  name: row.name,
  status: 'active',
  sortOrder: row.sortOrder,
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}))
const objectives: PlanningObjective[] = manifest.objectives.map((row) => ({
  id: row.id,
  mansoobaId: row.mansoobaId,
  shobahId: row.shobahId,
  title: row.title,
  status: 'active',
  sortOrder: row.sortOrder,
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}))
const programmes: LocalProgramme[] = manifest.activities.map((row) => ({
  id: row.id,
  mansoobaId: row.mansoobaId,
  shobahId: row.shobahId,
  objectiveId: row.objectiveId,
  name: row.name,
  kind: 'other',
  status: 'draft',
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}))

assert.equal(shobahs.length, 9)
assert.equal(objectives.length, 43)
assert.equal(programmes.length, 77)
const mapped = programmes.filter((row) => Boolean(row.objectiveId?.trim())).length
assert.equal(mapped, 37)
assert.equal(programmes.length - mapped, 40)
const h09Objectives = objectives.filter((row) => row.shobahId === 'H09')
const h09Activities = programmes.filter((row) => row.shobahId === 'H09')
assert.equal(h09Objectives.length, 3)
assert.equal(h09Activities.length, 0)

const items = buildShobahOverviewItems(shobahs, objectives, programmes)
const totals = {
  shobahs: 9,
  objectives: 43,
  activities: 77,
  mapped: 37,
  unmapped: 40,
}

const noop = () => undefined
function render(view: Parameters<typeof MeqatiPlanningWorkspace>[0]['view']) {
  const shobahId = view.level === 'overview' ? 'H01' : view.shobahId
  const visibleObjectives = objectives.filter((row) => row.shobahId === shobahId)
  const shobahActivities = programmes.filter((row) => row.shobahId === shobahId)
  const unmappedActivities = shobahActivities.filter((row) => !row.objectiveId?.trim())
  return renderToStaticMarkup(
    createElement(MeqatiPlanningWorkspace, {
      mansooba,
      totals,
      shobahItems: items,
      visibleObjectives,
      shobahActivities,
      unmappedActivities,
      programmes,
      ruknNameById: new Map(),
      view,
      onViewChange: noop,
      canCreateMansooba: false,
      onCreateMansooba: noop,
      onEditMansooba: noop,
      onCreateShobah: noop,
      onEditShobah: noop,
      onCreateObjective: noop,
      onEditObjective: noop,
      onCreateActivity: noop,
      onOpenActivity: noop,
    }),
  )
}

const overview = render({ level: 'overview' })
assert.match(overview, /9 شعبہ/)
assert.match(overview, /43 اہداف/)
assert.match(overview, /77 سرگرمیاں/)
assert.doesNotMatch(overview, /CompactActivityList/)
assert.doesNotMatch(overview, /قرآن پر وچن/)
assert.match(overview, /ادارہ جات/)
assert.match(overview, /H01/)
assert.match(overview, /H09/)
assert.equal((overview.match(/تفصیل/g) ?? []).length, 0)

const shobahH02 = render({ level: 'shobah', shobahId: 'H02' })
assert.match(shobahH02, /تنظیم/)
assert.doesNotMatch(shobahH02, /CompactActivityList/)
assert.match(shobahH02, /بغیر ہدف/)

const shobahH09 = render({ level: 'shobah', shobahId: 'H09' })
assert.match(shobahH09, /ادارہ جات/)
for (const row of h09Objectives) {
  assert.match(shobahH09, new RegExp(row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
assert.doesNotMatch(shobahH09, /قرآن پر وچن/)
assert.doesNotMatch(shobahH09, /اس ہدف کے لیے ابھی کوئی سرگرمی درج نہیں/)

const objectiveH09 = render({
  level: 'objective',
  shobahId: 'H09',
  objectiveId: h09Objectives[0].id,
})
assert.match(objectiveH09, /اس ہدف کے لیے ابھی کوئی سرگرمی درج نہیں/)
assert.doesNotMatch(objectiveH09, /قرآن پر وچن/)

const h01Unmapped = programmes.filter((row) => row.shobahId === 'H01' && !row.objectiveId?.trim())
const unmapped = render({ level: 'unmapped', shobahId: 'H01' })
assert.match(unmapped, /بغیر ہدف/)
assert.match(unmapped, /قرآن پر وچن/)
assert.match(unmapped, /غیر متعین/)

console.log('verify-meqati-workspace-nav: ok', {
  heads: 9,
  objectives: 43,
  activities: 77,
  mapped,
  unmapped: 40,
  h09Objectives: 3,
  h09Activities: 0,
  h01Unmapped: h01Unmapped.length,
})
