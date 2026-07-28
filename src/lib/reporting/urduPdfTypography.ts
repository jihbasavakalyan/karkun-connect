/**
 * KC-BUG-0126 — Shared Urdu PDF typography.
 *
 * Single font family for every exported report. Browser OpenType shaping
 * (HTML → PDF) is required for natural Urdu ligatures; jsPDF cannot run GSUB/GPOS.
 */

export const URDU_PDF_FONT = {
  /** Canonical family name used in @font-face and CSS. */
  family: 'KCUrduReport',
  /** Public asset — Noto Nastaliq Urdu (Google, OFL). */
  fileName: 'NotoNastaliqUrdu-Regular.ttf',
  url: '/fonts/NotoNastaliqUrdu-Regular.ttf',
  format: 'truetype' as const,
  /** Display name for docs / verification. */
  productName: 'Noto Nastaliq Urdu',
} as const

/** Layout tokens (mm for PDF page math; px/CSS for HTML capture). */
export const URDU_PDF_LAYOUT = {
  page: {
    format: 'a4' as const,
    orientation: 'portrait' as const,
    widthMm: 210,
    heightMm: 297,
    /** Capture width in CSS px at 96dpi ≈ 210mm */
    widthCssPx: 794,
  },
  marginMm: {
    top: 16,
    right: 14,
    bottom: 20,
    left: 14,
  },
  /** html2canvas scale — higher = sharper print, larger file */
  captureScale: 2.5,
  type: {
    documentTitlePt: 22,
    sectionTitlePt: 15,
    bodyPt: 12,
    tablePt: 11,
    tableHeadPt: 11,
    footerPt: 9,
    lineHeight: 1.75,
    tableLineHeight: 1.65,
  },
  table: {
    cellPaddingY: 10,
    cellPaddingX: 12,
    rowMinHeight: 36,
    headBg: '#1e40af',
    headColor: '#ffffff',
    altRowBg: '#f8fafc',
    border: '#e2e8f0',
  },
  colors: {
    text: '#0f172a',
    muted: '#475569',
    accent: '#1e40af',
    danger: '#b91c1c',
    success: '#15803d',
    banner: '#1e40af',
  },
} as const

export function urduPdfFontFaceCss(): string {
  return `
@font-face {
  font-family: '${URDU_PDF_FONT.family}';
  src: url('${URDU_PDF_FONT.url}') format('${URDU_PDF_FONT.format}');
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
}
`.trim()
}
