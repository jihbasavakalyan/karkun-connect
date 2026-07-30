/**
 * KC-BUG-0126 / KC-029 / KC-034 — Urdu PDF typography + executive report contracts.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { URDU_PDF_FONT, URDU_PDF_LAYOUT } from '../src/lib/reporting/urduPdfTypography'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
const fontPath = resolve(root, 'public/fonts', URDU_PDF_FONT.fileName)
assert(existsSync(fontPath), `Missing canonical Urdu font: ${URDU_PDF_FONT.fileName}`)
const size = statSync(fontPath).size
assert(size > 500_000, `Urdu font too small (${size}) — expected full Nastaliq TTF`)

const htmlEngine = readFileSync(resolve(root, 'src/lib/reporting/urduHtmlToPdf.ts'), 'utf8')
assert(htmlEngine.includes('html2canvas'), 'HTML→PDF engine uses html2canvas')
assert(htmlEngine.includes('dir = \'rtl\'') || htmlEngine.includes('dir="rtl"'), 'RTL dir set')
assert(htmlEngine.includes('URDU_PDF_FONT'), 'canonical font family wired')
assert(htmlEngine.includes('urduPdfFontFaceCss') || htmlEngine.includes('urduReportShellCss'), 'font-face CSS included')
assert(htmlEngine.includes('pdf-page'), 'paged PDF capture supported')
assert(htmlEngine.includes('band-list'), 'progress band styles present')
assert(htmlEngine.includes('exception-list'), 'exception follow-up styles present')

const report = readFileSync(resolve(root, 'src/lib/reporting/campaignReportPdf.ts'), 'utf8')
assert(report.includes('downloadUrduHtmlReportPdf'), 'campaign report uses HTML OT pipeline')
assert(!report.includes('NotoNaskhArabic'), 'campaign report no longer embeds Naskh for body')
assert(report.includes('exec-header'), 'executive report header present')
assert(report.includes('progressBands'), 'operational progress bands wired')
assert(report.includes('exceptionLists'), 'exception follow-up lists wired')
assert(report.includes('chunkSize = 18'), 'individual section uses compact table pages')
assert(report.includes('exec-table'), 'compact individual rukn table')
assert(!report.includes('peopleCovered'), 'coverage KPI removed from executive PDF')
assert(!report.includes('topOverallPerformers'), 'selective Top-5 ranking removed from PDF')
assert(report.includes('columns.connected') && report.includes('columns.visits'), 'Connection ≠ Visit columns')

const model = readFileSync(resolve(root, 'src/lib/reporting/campaignReportModel.ts'), 'utf8')
assert(model.includes('buildProgressBands'), 'progress band builder present')
assert(model.includes('exceptionLists'), 'exception lists on model')
assert(model.includes('score(row) > 0 && completed(row) > 0'), 'legacy category leaders still gated')
assert(!model.includes('کوریج'), 'model copy must not use coverage wording')

const urdu = readFileSync(resolve(root, 'src/lib/reporting/campaignReportUrdu.ts'), 'utf8')
assert(!urdu.includes('زیرِ کوریج'), 'no زیرِ کوریج in Urdu report copy')
assert(!urdu.includes('Coverage'), 'no Coverage label in Urdu report copy')
assert(urdu.includes('ملاقات زیر التواء'), 'visit pending follow-up label')
assert(urdu.includes('رابطے'), 'Connection terminology present')
assert(urdu.includes('ملاقات'), 'Visit terminology present')
assert(urdu.includes("male: 'مرد'"), 'Men terminology (مرد)')
assert(urdu.includes("female: 'خواتین'"), 'Women terminology (خواتین)')

assert(URDU_PDF_LAYOUT.captureScale >= 2, 'capture scale must be print-quality')
assert(URDU_PDF_LAYOUT.type.tablePt >= 11, 'table type must be readable without zoom')
assert(URDU_PDF_LAYOUT.table.cellPaddingY >= 8, 'table cell padding elevated')
assert(URDU_PDF_LAYOUT.colors.primary === '#0b1f3a', 'deep navy primary')

console.log(
  JSON.stringify(
    {
      ok: true,
      font: URDU_PDF_FONT.productName,
      fontBytes: size,
      pipeline: 'HTML + browser OpenType → multi-page PDF',
      checks: [
        'Noto Nastaliq Urdu embedded asset present',
        'Shared typography tokens',
        'Campaign report uses HTML OT pipeline',
        'Progress bands + exception lists (KC-034)',
        'Connection ≠ Visit preserved',
        'RTL + print-scale capture',
      ],
    },
    null,
    2,
  ),
)
