/** Capture one-level Meqati workspace screenshots. Read-only. No Firestore. */
import { mkdirSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chromium } from 'playwright'
import { buildShobahOverviewItems } from '../../src/pages/admin/meqati/meqatiPlanningPresentation'
import { MeqatiPlanningWorkspace } from '../../src/pages/admin/meqati/MeqatiPlanningWorkspace'
import type { LocalProgramme } from '../../src/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '../../src/types/planning.types'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap');
:root { --color-primary:#1b4332; --color-secondary:#64748b; --color-surface:#fff; --color-surface-muted:#f7f7f2; --color-text-heading:#0f172a; --shadow-card:0 1px 3px rgb(0 0 0 / .06); }
html,body { margin:0; background:#f7f7f2; font-family:'Noto Nastaliq Urdu', Tahoma, sans-serif; color:#334155; }
.page { margin: 0 auto; padding: 24px; }
.page.desktop { max-width: 1100px; }
.page.mobile { max-width: 390px; }
.space-y-8 > * + * { margin-top: 2rem; } .space-y-3 > * + * { margin-top: .75rem; }
.flex { display:flex; } .flex-wrap { flex-wrap:wrap; } .flex-col { flex-direction:column; }
.items-start { align-items:flex-start; } .items-center { align-items:center; } .items-end { align-items:flex-end; }
.items-stretch { align-items:stretch; } .justify-between { justify-content:space-between; } .justify-end { justify-content:flex-end; }
.gap-2 { gap:.5rem; } .gap-3 { gap:.75rem; } .gap-4 { gap:1rem; }
.w-full { width:100%; } .w-1 { width:.25rem; } .w-1\\.5 { width:.375rem; }
.h-10 { height:2.5rem; } .w-10 { width:2.5rem; } .h-11 { height:2.75rem; } .w-11 { width:2.75rem; }
.min-w-0 { min-width:0; } .min-w-11 { min-width:2.75rem; } .flex-1 { flex:1; } .shrink-0 { flex-shrink:0; }
.max-w-xl { max-width: 36rem; } .min-h-11 { min-height:2.75rem; } .min-h-12 { min-height:3rem; } .min-h-14 { min-height:3.5rem; }
.text-start { text-align:start; } .text-center { text-align:center; }
.text-2xl { font-size:1.5rem; } .text-xl { font-size:1.25rem; } .text-lg { font-size:1.125rem; }
.text-base { font-size:1rem; } .text-sm { font-size:.875rem; } .text-xs { font-size:.75rem; }
.font-semibold { font-weight:600; } .font-medium { font-weight:500; } .tracking-wide { letter-spacing:.04em; }
.text-text-heading { color:var(--color-text-heading); } .text-secondary { color:var(--color-secondary); }
.text-primary { color:var(--color-primary); } .block { display:block; } .inline-flex { display:inline-flex; }
.mt-1 { margin-top:.25rem; } .mt-2 { margin-top:.5rem; } .mt-3 { margin-top:.75rem; } .mt-4 { margin-top:1rem; }
.mb-4 { margin-bottom:1rem; } .-mx-1 { margin-inline:-.25rem; }
.rounded-2xl { border-radius:1rem; } .rounded-full { border-radius:9999px; }
.bg-surface { background:var(--color-surface); } .bg-surface-muted\\/95 { background:rgba(247,247,242,.95); }
.px-1 { padding-inline:.25rem; } .px-3 { padding-inline:.75rem; } .px-4 { padding-inline:1rem; } .px-5 { padding-inline:1.25rem; }
.py-3 { padding-block:.75rem; } .py-4 { padding-block:1rem; } .py-5 { padding-block:1.25rem; } .py-8 { padding-block:2rem; }
.shadow-card { box-shadow: var(--shadow-card); }
.whitespace-normal { white-space:normal; } .break-words { overflow-wrap:anywhere; }
.overflow-hidden { overflow:hidden; } .overflow-x-hidden { overflow-x:hidden; }
.sticky { position:sticky; } .top-0 { top:0; } .z-20 { z-index:20; } .backdrop-blur-sm { backdrop-filter: blur(4px); }
.grid { display:grid; } .grid-cols-1 { grid-template-columns:1fr; } .gap-4 { gap:1rem; }
.hidden { display:none; }
@media (min-width: 1024px) {
  .lg\\:grid-cols-3 { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .lg\\:block { display:block !important; }
  .lg\\:hidden { display:none !important; }
}
.table-fixed { table-layout:fixed; }
table { width:100%; border-collapse:collapse; }
th,td { text-align:start; }
.border-b { border-bottom:1px solid #e5e7de; }
.last\\:border-b-0:last-child { border-bottom:0; }
.ms-1 { margin-inline-start:.25rem; }
.inline-flex { display:inline-flex; }
.tabular-nums { font-variant-numeric: tabular-nums; }
button { font: inherit; background:none; border:0; cursor:pointer; color:inherit; }
ul { list-style:none; padding:0; margin:0; }
.ds-icon-md { width:1.25rem; height:1.25rem; }
svg { display:block; }
`

const manifest = JSON.parse(readFileSync('docs/meqati-population-manifest-dry-run.json', 'utf8'))
const stamp = '2026-08-22T00:00:00.000Z'
const mansooba = {
  id: manifest.meqatiMansoobas[0].id,
  name: manifest.meqatiMansoobas[0].name,
  status: 'draft',
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
} as MeqatiMansooba
const shobahs: Shobah[] = manifest.shobahs.map((row: Shobah) => ({
  ...row,
  status: 'active',
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}))
const objectives: PlanningObjective[] = manifest.objectives.map((row: PlanningObjective) => ({
  ...row,
  status: 'active',
  createdAt: stamp,
  updatedAt: stamp,
  createdBy: 'verify',
  updatedBy: 'verify',
}))
const programmes: LocalProgramme[] = manifest.activities.map((row: LocalProgramme) => ({
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
const items = buildShobahOverviewItems(shobahs, objectives, programmes)
const totals = { shobahs: 9, objectives: 43, activities: 77, mapped: 37, unmapped: 40 }
const noop = () => undefined

function htmlFor(
  view: Parameters<typeof MeqatiPlanningWorkspace>[0]['view'],
  layout: 'desktop' | 'mobile',
) {
  const shobahId = view.level === 'overview' ? 'H01' : view.shobahId
  const visibleObjectives = objectives.filter((row) => row.shobahId === shobahId)
  const shobahActivities = programmes.filter((row) => row.shobahId === shobahId)
  const unmappedActivities = shobahActivities.filter((row) => !row.objectiveId?.trim())
  const inner = renderToStaticMarkup(
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
  return `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="page ${layout}">${inner}</div></body></html>`
}

const mappedActivity = programmes.find((row) => row.objectiveId === 'H01-O05')!
const detail = `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="page desktop">
  <p class="text-xs text-secondary">اصل</p>
  <h2 class="text-xl font-semibold text-text-heading">سرگرمی</h2>
  <p class="mt-3 text-base text-text-heading whitespace-normal break-words">${mappedActivity.name}</p>
  <p class="mt-4 text-sm text-secondary">شعبہ · بنیادی و لازمی کام</p>
  <p class="mt-1 text-sm text-secondary">ہدف · ${objectives.find((row) => row.id === 'H01-O05')?.title}</p>
  <p class="mt-1 text-sm text-secondary">ذمہ دار · —</p>
  <p class="mt-1 text-sm text-secondary">Schedule · غیر متعین</p>
  <p class="mt-1 text-sm text-secondary">Status · مسودہ</p>
  <h3 class="mt-8 text-base font-semibold text-text-heading">مزید</h3>
  <p class="mt-2 text-sm text-secondary">Kind · Dates · Remarks · Year Status</p>
</div></body></html>`

const outDir = 'docs/todays-mission-evidence'
mkdirSync(outDir, { recursive: true })

const h02Objective = objectives.find((row) => row.shobahId === 'H02' && programmes.some((p) => p.objectiveId === row.id))!

const shots: Array<[string, string, { width: number; height: number }]> = [
  ['meqati-visual-desktop-overview.png', htmlFor({ level: 'overview' }, 'desktop'), { width: 1280, height: 900 }],
  ['meqati-visual-desktop-head-h02.png', htmlFor({ level: 'shobah', shobahId: 'H02' }, 'desktop'), { width: 1280, height: 900 }],
  ['meqati-visual-desktop-objective.png', htmlFor({ level: 'objective', shobahId: 'H02', objectiveId: h02Objective.id }, 'desktop'), { width: 1280, height: 900 }],
  ['meqati-visual-activity-detail.png', detail, { width: 900, height: 700 }],
  ['meqati-visual-mobile-overview.png', htmlFor({ level: 'overview' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-visual-mobile-head-h02.png', htmlFor({ level: 'shobah', shobahId: 'H02' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-visual-mobile-objective.png', htmlFor({ level: 'objective', shobahId: 'H02', objectiveId: h02Objective.id }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-overview.png', htmlFor({ level: 'overview' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-shobah-h01.png', htmlFor({ level: 'shobah', shobahId: 'H01' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-shobah-h09.png', htmlFor({ level: 'shobah', shobahId: 'H09' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-objective-h01-o05.png', htmlFor({ level: 'objective', shobahId: 'H01', objectiveId: 'H01-O05' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-objective-h09-empty.png', htmlFor({ level: 'objective', shobahId: 'H09', objectiveId: 'H09-O01' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-unmapped-h01.png', htmlFor({ level: 'unmapped', shobahId: 'H01' }, 'mobile'), { width: 390, height: 844 }],
  ['meqati-nav-activity-detail.png', detail, { width: 390, height: 844 }],
]

const browser = await chromium.launch()
for (const [name, html, viewport] of shots) {
  const page = await browser.newPage({ viewport })
  await page.setContent(html, { waitUntil: 'networkidle' })
  const path = `${outDir}/${name}`
  await page.screenshot({ path, fullPage: true })
  await page.close()
  console.log('wrote', path)
}
await browser.close()
