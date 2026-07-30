/**
 * KC-BUG-0126 / KC-029 — Urdu PDF typography contracts.
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

const report = readFileSync(resolve(root, 'src/lib/reporting/campaignReportPdf.ts'), 'utf8')
assert(report.includes('downloadUrduHtmlReportPdf'), 'campaign report uses HTML OT pipeline')
assert(!report.includes('NotoNaskhArabic'), 'campaign report no longer embeds Naskh for body')
assert(report.includes('exec-header'), 'executive report header present')
assert(report.includes('topOverallPerformers'), 'weighted top performers wired')
assert(report.includes('chunkSize = 6'), 'individual section packs 6 cards per page')
assert(report.includes('rukn-card compact'), 'compact individual rukn cards')
assert(!report.includes('peopleCovered'), 'coverage KPI removed from executive PDF')
assert(report.includes('noCategoryLeader') || report.includes('hasLeader'), 'zero-leader empty state wired')

const model = readFileSync(resolve(root, 'src/lib/reporting/campaignReportModel.ts'), 'utf8')
assert(model.includes('score(row) > 0 && completed(row) > 0'), 'category leaders require positive metric + completion')
assert(model.includes('hasLeader'), 'category leader empty-state flag')
assert(!model.includes('کوریج'), 'model copy must not use coverage wording')

const urdu = readFileSync(resolve(root, 'src/lib/reporting/campaignReportUrdu.ts'), 'utf8')
assert(!urdu.includes('زیرِ کوریج'), 'no زیرِ کوریج in Urdu report copy')
assert(!urdu.includes('Coverage'), 'no Coverage label in Urdu report copy')
assert(urdu.includes('فی الحال اس شعبہ میں کوئی نمایاں کارکردگی موجود نہیں'), 'empty category leader copy')

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
        'Executive layout + paged capture',
        'RTL + print-scale capture',
      ],
    },
    null,
    2,
  ),
)
