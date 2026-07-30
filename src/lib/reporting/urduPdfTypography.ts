/**
 * KC-BUG-0126 / KC-029 — Shared Urdu PDF typography & executive palette.
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
    top: 14,
    right: 12,
    bottom: 16,
    left: 12,
  },
  /** html2canvas scale — higher = sharper print, larger file */
  captureScale: 2.5,
  type: {
    documentTitlePt: 20,
    sectionTitlePt: 14,
    bodyPt: 11,
    tablePt: 11,
    tableHeadPt: 11,
    footerPt: 8.5,
    lineHeight: 1.7,
    tableLineHeight: 1.55,
  },
  table: {
    cellPaddingY: 8,
    cellPaddingX: 10,
    rowMinHeight: 32,
    headBg: '#0b1f3a',
    headColor: '#ffffff',
    altRowBg: '#f8fafc',
    border: '#e8eef5',
  },
  colors: {
    text: '#0f172a',
    muted: '#64748b',
    accent: '#1e3a8a',
    primary: '#0b1f3a',
    secondary: '#1e40af',
    emerald: '#059669',
    success: '#16a34a',
    warning: '#ea580c',
    attention: '#dc2626',
    info: '#0ea5e9',
    danger: '#dc2626',
    banner: '#0b1f3a',
    pageBg: '#f1f5f9',
    cardBg: '#ffffff',
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
