/**
 * KC-0114 Part 3 — Shape Urdu for PDF engines without OpenType layout
 * (reshape + Unicode bidi reordering).
 */

import ArabicReshaper from 'arabic-reshaper'
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

/** Prepare Urdu/Arabic text so jsPDF renders connected glyphs in RTL order. */
export function shapeUrduForPdf(text: string): string {
  if (!text) return ''
  const reshaped = ArabicReshaper.convertArabic(text)
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped, 'rtl')
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
