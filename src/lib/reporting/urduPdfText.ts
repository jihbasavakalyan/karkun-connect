/**
 * KC-0114 / KC-BUG-0126 — Legacy vector-path Urdu shaping for jsPDF.
 *
 * Prefer `urduHtmlToPdf.ts` (browser OpenType + Noto Nastaliq Urdu) for reports.
 * This helper remains for any residual jsPDF text drawing: presentation-form
 * reshape + Unicode BiDi visual reorder. It cannot produce true Nastaliq.
 */

import ArabicReshaper from 'arabic-reshaper'
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

/** Prepare Urdu/Arabic text so raw jsPDF text APIs render joined glyphs LTR-drawn. */
export function shapeUrduForPdf(text: string): string {
  if (!text) return ''
  const reshaped = ArabicReshaper.convertArabic(text)
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped, 'rtl')
  if (typeof bidi.getReorderedString === 'function') {
    return bidi.getReorderedString(reshaped, embeddingLevels)
  }
  const chars = Array.from(reshaped)
  const flips = bidi.getReorderSegments(reshaped, embeddingLevels)
  for (const range of flips) {
    const start = range[0]
    const end = range[1]
    const reversed = chars.slice(start, end + 1).reverse()
    for (let i = start; i <= end; i += 1) {
      chars[i] = reversed[i - start]!
    }
  }
  return chars.join('')
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
