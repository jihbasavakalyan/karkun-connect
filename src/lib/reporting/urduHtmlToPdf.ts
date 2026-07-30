/**
 * KC-BUG-0126 / KC-029 — HTML → PDF export with browser OpenType Urdu shaping.
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
  background: ${colors.pageBg};
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
  padding: 0;
  direction: rtl;
  text-align: right;
  background: ${colors.pageBg};
}
.urdu-report .pdf-page {
  width: 100%;
  min-height: 1040px;
  padding: 18px 22px 24px;
  background: ${colors.pageBg};
  page-break-after: always;
  break-after: page;
}

/* ── Premium header ─────────────────────────────────────────── */
.urdu-report .exec-header {
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 55%, #2563eb 100%);
  color: #fff;
  padding: 18px 20px 16px;
  margin: -18px -22px 14px;
  border-radius: 0 0 20px 20px;
  position: relative;
  overflow: hidden;
}
.urdu-report .exec-header::after {
  content: '';
  position: absolute;
  left: -40px;
  bottom: -50px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
}
.urdu-report .exec-header::before {
  content: '';
  position: absolute;
  right: 40px;
  top: -60px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
}
.urdu-report .exec-header h1 {
  margin: 0;
  font-size: ${t.documentTitlePt}pt;
  font-weight: 700;
  line-height: 1.55;
  position: relative;
  z-index: 1;
}
.urdu-report .exec-header .campaign-name {
  margin: 6px 0 0;
  font-size: 12pt;
  font-weight: 600;
  opacity: 0.98;
  position: relative;
  z-index: 1;
}
.urdu-report .exec-header .meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 10px;
  position: relative;
  z-index: 1;
}
.urdu-report .exec-header .meta-chip {
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 9pt;
  line-height: 1.55;
}

/* ── Section titles ─────────────────────────────────────────── */
.urdu-report h2.section {
  margin: 12px 0 8px;
  font-size: ${t.sectionTitlePt}pt;
  font-weight: 700;
  color: ${colors.primary};
  padding: 0 0 4px;
  border-bottom: none;
  line-height: 1.5;
  position: relative;
}
.urdu-report h2.section::after {
  content: '';
  display: block;
  width: 48px;
  height: 2.5px;
  margin-top: 4px;
  border-radius: 3px;
  background: linear-gradient(90deg, ${colors.emerald}, ${colors.secondary});
  margin-right: 0;
}

/* ── KPI cards ──────────────────────────────────────────────── */
.urdu-report .kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 10px;
}
.urdu-report .kpi-grid.kpi-4 {
  grid-template-columns: 1fr 1fr;
}
.urdu-report .kpi-grid.kpi-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.urdu-report .kpi-card {
  background: ${colors.cardBg};
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.9);
}
.urdu-report .kpi-card .kpi-label {
  margin: 0;
  font-size: 9.5pt;
  color: ${colors.muted};
  font-weight: 600;
}
.urdu-report .kpi-card .kpi-value {
  margin: 4px 0 0;
  font-size: 18pt;
  font-weight: 700;
  color: ${colors.primary};
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
.urdu-report .kpi-card .kpi-sub {
  margin: 6px 0 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.urdu-report .kpi-card .tag {
  display: inline-block;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 8pt;
  font-weight: 600;
  line-height: 1.55;
}
.urdu-report .tag-male {
  background: #e0f2fe;
  color: #0369a1;
}
.urdu-report .tag-female {
  background: #fce7f3;
  color: #be185d;
}
.urdu-report .tag-info {
  background: #e0f2fe;
  color: #0284c7;
}
.urdu-report .tag-success {
  background: #dcfce7;
  color: #15803d;
}
.urdu-report .tag-warning {
  background: #ffedd5;
  color: #c2410c;
}
.urdu-report .tag-danger {
  background: #fee2e2;
  color: #b91c1c;
}
.urdu-report .kpi-card.accent-emerald {
  border-top: 3px solid ${colors.emerald};
}
.urdu-report .kpi-card.accent-blue {
  border-top: 3px solid ${colors.secondary};
}
.urdu-report .kpi-card.accent-sky {
  border-top: 3px solid ${colors.info};
}
.urdu-report .kpi-card.accent-navy {
  border-top: 3px solid ${colors.primary};
}

/* ── Activity progress cards ────────────────────────────────── */
.urdu-report .activity-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0 0 10px;
}
.urdu-report .activity-card {
  background: ${colors.cardBg};
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.85);
}
.urdu-report .activity-card .act-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.urdu-report .activity-card .act-title {
  margin: 0;
  font-size: 10.5pt;
  font-weight: 700;
  color: ${colors.primary};
}
.urdu-report .activity-card .act-pct {
  font-size: 11pt;
  font-weight: 700;
  color: ${colors.secondary};
  font-variant-numeric: tabular-nums;
}
.urdu-report .progress-track {
  height: 7px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin: 0 0 6px;
}
.urdu-report .progress-track.thin {
  height: 5px;
  margin: 4px 0 0;
}
.urdu-report .progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, ${colors.secondary}, ${colors.emerald});
}
.urdu-report .progress-fill.warn {
  background: linear-gradient(90deg, ${colors.warning}, #f59e0b);
}
.urdu-report .progress-fill.danger {
  background: linear-gradient(90deg, ${colors.attention}, #f87171);
}
.urdu-report .progress-fill.good {
  background: linear-gradient(90deg, ${colors.emerald}, ${colors.success});
}
.urdu-report .act-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 6px;
}
.urdu-report .act-breakdown.act-breakdown-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.urdu-report .act-stat {
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px 6px;
  text-align: center;
}
.urdu-report .act-stat .lbl {
  display: block;
  font-size: 7.5pt;
  color: ${colors.muted};
  margin-bottom: 1px;
}
.urdu-report .act-stat .val {
  display: block;
  font-size: 9pt;
  font-weight: 700;
  color: ${colors.text};
  font-variant-numeric: tabular-nums;
}

/* ── Circular progress ──────────────────────────────────────── */
.urdu-report .ring-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0 2px;
}
.urdu-report .ring-card {
  background: ${colors.cardBg};
  border-radius: 14px;
  padding: 12px 18px;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.9);
  text-align: center;
  min-width: 200px;
}
.urdu-report .ring {
  position: relative;
  width: 112px;
  height: 112px;
  margin: 0 auto 4px;
}
.urdu-report .ring svg {
  width: 112px;
  height: 112px;
  transform: rotate(-90deg);
}
.urdu-report .ring .ring-bg {
  fill: none;
  stroke: #e2e8f0;
  stroke-width: 3.2;
}
.urdu-report .ring .ring-fg {
  fill: none;
  stroke: url(#ringGrad);
  stroke-width: 3.2;
  stroke-linecap: round;
}
.urdu-report .ring .ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: none;
}
.urdu-report .ring .ring-pct {
  font-size: 20pt;
  font-weight: 700;
  color: ${colors.primary};
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.urdu-report .ring .ring-sub {
  font-size: 8.5pt;
  color: ${colors.muted};
}

/* ── Recommendation tiers ───────────────────────────────────── */
.urdu-report .rec-tier {
  background: ${colors.cardBg};
  border-radius: 10px;
  padding: 8px 10px;
  margin: 0 0 8px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.85);
}
.urdu-report .rec-tier.urgent { border-right: 3px solid ${colors.attention}; }
.urdu-report .rec-tier.next { border-right: 3px solid ${colors.warning}; }
.urdu-report .rec-tier.positive { border-right: 3px solid ${colors.success}; }
.urdu-report .rec-tier h3 {
  margin: 0 0 6px;
  font-size: 11pt;
  font-weight: 700;
}
.urdu-report .rec-tier.urgent h3 { color: ${colors.attention}; }
.urdu-report .rec-tier.next h3 { color: ${colors.warning}; }
.urdu-report .rec-tier.positive h3 { color: ${colors.success}; }
.urdu-report .rec-tier ul {
  margin: 0;
  padding: 0 1.1em 0 0;
  list-style: disc;
}
.urdu-report .rec-tier li {
  margin: 0 0 4px;
  line-height: 1.55;
  font-size: 9.5pt;
}

.urdu-report .critical-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 8px;
}
.urdu-report .critical-row {
  display: grid;
  grid-template-columns: 140px auto 1fr;
  gap: 8px;
  align-items: start;
  background: ${colors.cardBg};
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 8px;
  padding: 5px 8px;
}
.urdu-report .critical-row .who {
  font-weight: 700;
  font-size: 9.5pt;
  color: ${colors.primary};
}
.urdu-report .critical-row .why {
  font-size: 8.5pt;
  color: ${colors.muted};
  line-height: 1.45;
}

/* ── Rank / performer cards ─────────────────────────────────── */
.urdu-report .rank-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0 0 8px;
}
.urdu-report .rank-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${colors.cardBg};
  border-radius: 10px;
  padding: 6px 10px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.85);
}
.urdu-report .rank-badge {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 10pt;
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.urdu-report .rank-badge.r1 { background: linear-gradient(135deg, #ca8a04, #eab308); }
.urdu-report .rank-badge.r2 { background: linear-gradient(135deg, #64748b, #94a3b8); }
.urdu-report .rank-badge.r3 { background: linear-gradient(135deg, #b45309, #d97706); }
.urdu-report .rank-badge.r4 { background: ${colors.secondary}; }
.urdu-report .rank-badge.r5 { background: ${colors.emerald}; }
.urdu-report .rank-body { flex: 1; min-width: 0; }
.urdu-report .rank-body .name {
  margin: 0;
  font-size: 10.5pt;
  font-weight: 700;
  color: ${colors.primary};
}
.urdu-report .rank-body .meta {
  margin: 2px 0 0;
  font-size: 8pt;
  color: ${colors.muted};
}
.urdu-report .rank-score {
  flex-shrink: 0;
  text-align: center;
  background: #f0fdf4;
  border-radius: 8px;
  padding: 4px 8px;
  min-width: 52px;
}
.urdu-report .rank-score .num {
  display: block;
  font-size: 12pt;
  font-weight: 700;
  color: ${colors.emerald};
  font-variant-numeric: tabular-nums;
}
.urdu-report .rank-score .lbl {
  display: block;
  font-size: 7pt;
  color: ${colors.muted};
}

.urdu-report .leader-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 0 0 6px;
}
.urdu-report .leader-card {
  background: ${colors.cardBg};
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.85);
  position: relative;
  overflow: hidden;
}
.urdu-report .leader-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, ${colors.secondary}, ${colors.emerald});
}
.urdu-report .leader-card.empty::before {
  background: #cbd5e1;
}
.urdu-report .leader-card .cat {
  margin: 0;
  font-size: 8pt;
  color: ${colors.muted};
  font-weight: 600;
}
.urdu-report .leader-card .who {
  margin: 3px 0 0;
  font-size: 10.5pt;
  font-weight: 700;
  color: ${colors.primary};
  line-height: 1.4;
}
.urdu-report .leader-card .who.muted {
  font-size: 9pt;
  font-weight: 600;
  color: ${colors.muted};
}
.urdu-report .leader-card .res {
  margin: 2px 0 0;
  font-size: 8.5pt;
  color: ${colors.secondary};
  font-variant-numeric: tabular-nums;
}

/* ── Individual rukn cards ──────────────────────────────────── */
.urdu-report .rukn-card {
  background: ${colors.cardBg};
  border-radius: 10px;
  padding: 7px 9px 6px;
  margin: 0 0 6px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.85);
}
.urdu-report .rukn-card.compact .rukn-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
  padding-bottom: 0;
  border-bottom: none;
}
.urdu-report .rukn-card .rukn-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f1f5f9;
}
.urdu-report .rukn-card .rukn-name {
  margin: 0;
  font-size: 10.5pt;
  font-weight: 700;
  color: ${colors.primary};
}
.urdu-report .rukn-card .chip-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.urdu-report .rukn-totals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 0 0 4px;
  font-size: 8.5pt;
  color: ${colors.muted};
}
.urdu-report .rukn-totals strong {
  color: ${colors.text};
  font-variant-numeric: tabular-nums;
}
.urdu-report .mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 5px;
  margin-bottom: 6px;
}
.urdu-report .mini-stat {
  background: #f8fafc;
  border-radius: 6px;
  padding: 4px 6px;
  text-align: center;
}
.urdu-report .mini-stat .lbl {
  display: block;
  font-size: 7pt;
  color: ${colors.muted};
}
.urdu-report .mini-stat .val {
  display: block;
  font-size: 9.5pt;
  font-weight: 700;
  color: ${colors.text};
  font-variant-numeric: tabular-nums;
}
.urdu-report table.compact {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  line-height: 1.4;
  margin: 0;
}
.urdu-report table.compact th,
.urdu-report table.compact td {
  padding: 3px 4px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.urdu-report table.compact th {
  background: #f8fafc;
  color: ${colors.muted};
  font-weight: 700;
  font-size: 7.5pt;
  text-align: center;
}
.urdu-report table.compact td {
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.urdu-report table.compact td.label {
  text-align: right;
  font-weight: 600;
}

/* ── Legacy helpers (kept for other reports) ────────────────── */
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
  margin-top: 24px;
  padding: 14px 16px;
  border-top: none;
  background: ${colors.cardBg};
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  font-size: ${t.footerPt}pt;
  color: ${colors.muted};
  line-height: 1.75;
  text-align: center;
}
.urdu-report .footer-note .disclaimer {
  margin-top: 6px;
  color: ${colors.muted};
  opacity: 0.9;
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
  void root.offsetHeight
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: URDU_PDF_LAYOUT.captureScale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: URDU_PDF_LAYOUT.colors.pageBg,
    logging: false,
    windowWidth: URDU_PDF_LAYOUT.page.widthCssPx,
    onclone: (_doc, cloned) => {
      cloned.dir = 'rtl'
      cloned.lang = 'ur'
    },
  })
}

function addCanvasPage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  isFirst: boolean,
): void {
  const pageWidth = URDU_PDF_LAYOUT.page.widthMm
  const pageHeight = URDU_PDF_LAYOUT.page.heightMm
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pageData = canvas.toDataURL('image/jpeg', 0.92)

  if (imgHeight <= pageHeight + 0.5) {
    if (!isFirst) pdf.addPage()
    pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
    return
  }

  let heightLeft = imgHeight
  let position = 0
  if (!isFirst) pdf.addPage()
  pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
  heightLeft -= pageHeight

  while (heightLeft > 1) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
    heightLeft -= pageHeight
  }
}

/**
 * Render RTL HTML (browser-shaped Urdu) into a multi-page A4 PDF and download.
 * When body contains `.pdf-page` sections, each is captured as its own page block.
 */
export async function downloadUrduHtmlReportPdf(
  documentSpec: UrduHtmlReportDocument,
): Promise<void> {
  const host = document.createElement('div')
  host.setAttribute('data-urdu-pdf-host', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#f1f5f9;z-index:-1;opacity:1;'

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

    const pdf = new jsPDF({
      orientation: URDU_PDF_LAYOUT.page.orientation,
      unit: 'mm',
      format: URDU_PDF_LAYOUT.page.format,
      compress: true,
    })

    const pages = Array.from(article.querySelectorAll<HTMLElement>('.pdf-page'))
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const canvas = await captureElement(pages[i]!)
        addCanvasPage(pdf, canvas, i === 0)
      }
    } else {
      const canvas = await captureElement(article)
      addCanvasPage(pdf, canvas, true)
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
