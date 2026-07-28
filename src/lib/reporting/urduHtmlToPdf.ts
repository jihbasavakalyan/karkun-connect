/**
 * KC-BUG-0126 — HTML → PDF export with browser OpenType Urdu shaping.
 *
 * jsPDF cannot apply GSUB/GPOS. Rendering the report as RTL HTML with an
 * embedded Nastaliq face lets Chrome/Edge shape ligatures correctly; we then
 * rasterize at print DPI into a multi-page PDF.
 */

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  URDU_PDF_FONT,
  URDU_PDF_LAYOUT,
  urduPdfFontFaceCss,
} from './urduPdfTypography'

export type UrduHtmlReportDocument = {
  title: string
  /** Full HTML body inner markup (tables, sections). Must be RTL-ready. */
  bodyHtml: string
  fileName: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function urduReportShellCss(): string {
  const t = URDU_PDF_LAYOUT.type
  const table = URDU_PDF_LAYOUT.table
  const colors = URDU_PDF_LAYOUT.colors
  const family = URDU_PDF_FONT.family

  return `
${urduPdfFontFaceCss()}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: ${colors.text};
  font-family: '${family}', 'Noto Nastaliq Urdu', serif;
  font-size: ${t.bodyPt}pt;
  line-height: ${t.lineHeight};
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga" 1, "calt" 1, "kern" 1;
}
.urdu-report {
  width: ${URDU_PDF_LAYOUT.page.widthCssPx}px;
  padding: 28px 32px 40px;
  direction: rtl;
  text-align: right;
  background: #fff;
}
.urdu-report .banner {
  background: ${colors.banner};
  color: #fff;
  padding: 22px 24px 20px;
  margin: -28px -32px 28px;
  border-radius: 0;
}
.urdu-report .banner h1 {
  margin: 0;
  font-size: ${t.documentTitlePt}pt;
  font-weight: 700;
  line-height: 1.55;
}
.urdu-report .banner .subtitle {
  margin: 8px 0 0;
  font-size: 12pt;
  opacity: 0.95;
  line-height: 1.7;
}
.urdu-report .banner .campaign {
  margin: 10px 0 0;
  font-size: 11pt;
  opacity: 0.9;
}
.urdu-report h2.section {
  margin: 28px 0 12px;
  font-size: ${t.sectionTitlePt}pt;
  font-weight: 700;
  color: ${colors.text};
  border-bottom: 2.5px solid ${colors.accent};
  padding-bottom: 6px;
  line-height: 1.6;
}
.urdu-report .kv {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 8px;
}
.urdu-report .kv th,
.urdu-report .kv td {
  padding: 8px 10px;
  vertical-align: middle;
  font-size: ${t.bodyPt}pt;
  line-height: ${t.lineHeight};
  border-bottom: 1px solid ${table.border};
}
.urdu-report .kv th {
  width: 38%;
  font-weight: 700;
  color: ${colors.muted};
  text-align: right;
}
.urdu-report .kv td {
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.urdu-report table.data {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 6px;
  font-size: ${t.tablePt}pt;
  line-height: ${t.tableLineHeight};
}
.urdu-report table.data th,
.urdu-report table.data td {
  padding: ${table.cellPaddingY}px ${table.cellPaddingX}px;
  min-height: ${table.rowMinHeight}px;
  border: 1px solid ${table.border};
  vertical-align: middle;
}
.urdu-report table.data thead th {
  background: ${table.headBg};
  color: ${table.headColor};
  font-weight: 700;
  font-size: ${t.tableHeadPt}pt;
  text-align: right;
}
.urdu-report table.data tbody tr:nth-child(even) td {
  background: ${table.altRowBg};
}
.urdu-report table.data td.label {
  text-align: right;
  font-weight: 600;
}
.urdu-report table.data td.value {
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.urdu-report table.data.danger thead th {
  background: ${colors.danger};
}
.urdu-report table.data.success thead th {
  background: ${colors.success};
}
.urdu-report .empty {
  color: ${colors.muted};
  margin: 4px 0 12px;
}
.urdu-report .recs {
  margin: 0;
  padding: 0 1.2em 0 0;
  list-style: decimal;
}
.urdu-report .recs li {
  margin: 0 0 10px;
  line-height: ${t.lineHeight};
}
.urdu-report .footer-note {
  margin-top: 28px;
  padding-top: 12px;
  border-top: 1px solid ${table.border};
  font-size: ${t.footerPt}pt;
  color: ${colors.muted};
  line-height: 1.7;
}
`.trim()
}

async function waitForUrduFonts(root: HTMLElement): Promise<void> {
  if (!document.fonts?.load) {
    await new Promise((r) => setTimeout(r, 400))
    return
  }
  const family = URDU_PDF_FONT.family
  await document.fonts.load(`400 16px "${family}"`)
  await document.fonts.load(`700 16px "${family}"`)
  await document.fonts.ready
  // Force layout after face activation
  void root.offsetHeight
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

/**
 * Render RTL HTML (browser-shaped Urdu) into a multi-page A4 PDF and download.
 */
export async function downloadUrduHtmlReportPdf(
  documentSpec: UrduHtmlReportDocument,
): Promise<void> {
  const host = document.createElement('div')
  host.setAttribute('data-urdu-pdf-host', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;opacity:1;'

  const style = document.createElement('style')
  style.textContent = urduReportShellCss()

  const article = document.createElement('article')
  article.className = 'urdu-report'
  article.lang = 'ur'
  article.dir = 'rtl'
  article.innerHTML = documentSpec.bodyHtml

  host.appendChild(style)
  host.appendChild(article)
  document.body.appendChild(host)

  try {
    await waitForUrduFonts(article)

    const canvas = await html2canvas(article, {
      scale: URDU_PDF_LAYOUT.captureScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: URDU_PDF_LAYOUT.page.widthCssPx,
      onclone: (_doc, cloned) => {
        cloned.dir = 'rtl'
        cloned.lang = 'ur'
      },
    })

    const pdf = new jsPDF({
      orientation: URDU_PDF_LAYOUT.page.orientation,
      unit: 'mm',
      format: URDU_PDF_LAYOUT.page.format,
      compress: true,
    })

    const pageWidth = URDU_PDF_LAYOUT.page.widthMm
    const pageHeight = URDU_PDF_LAYOUT.page.heightMm
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0
    const pageData = canvas.toDataURL('image/jpeg', 0.92)

    pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
    heightLeft -= pageHeight

    while (heightLeft > 1) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight
    }

    const safe =
      documentSpec.fileName.replace(/[^\w\u0600-\u06FF.-]+/g, '_').slice(0, 80) ||
      'Urdu_Report.pdf'
    pdf.save(safe.endsWith('.pdf') ? safe : `${safe}.pdf`)
  } finally {
    host.remove()
  }
}

/** Helpers for building report markup (unshaped logical Unicode — browser shapes). */
export const UrduHtml = {
  escape: escapeHtml,
  text(value: string): string {
    return escapeHtml(value)
  },
  section(title: string): string {
    return `<h2 class="section">${escapeHtml(title)}</h2>`
  },
  empty(message: string): string {
    return `<p class="empty">${escapeHtml(message)}</p>`
  },
  kvTable(rows: Array<[string, string]>): string {
    const body = rows
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td class="value">${escapeHtml(value)}</td></tr>`,
      )
      .join('')
    return `<table class="kv" role="presentation">${body}</table>`
  },
  dataTable(options: {
    headers: string[]
    rows: string[][]
    /** Column indexes that are numeric / centered values (LTR-friendly). */
    valueColumns?: number[]
    variant?: 'default' | 'danger' | 'success'
  }): string {
    const valueSet = new Set(options.valueColumns ?? [])
    const head = options.headers
      .map((h, i) => {
        const cls = valueSet.has(i) ? 'value' : 'label'
        return `<th class="${cls}">${escapeHtml(h)}</th>`
      })
      .join('')
    const body = options.rows
      .map((row) => {
        const cells = row
          .map((cell, i) => {
            const cls = valueSet.has(i) ? 'value' : 'label'
            return `<td class="${cls}">${escapeHtml(cell)}</td>`
          })
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')
    const variant =
      options.variant === 'danger'
        ? ' danger'
        : options.variant === 'success'
          ? ' success'
          : ''
    return `<table class="data${variant}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  },
}
