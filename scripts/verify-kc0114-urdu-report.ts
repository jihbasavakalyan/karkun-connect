/**
 * KC-0114 — Offline-ish verification that Urdu shaping + font assets exist.
 * Does not invent metrics; only checks presentation prerequisites.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import ArabicReshaper from 'arabic-reshaper'
import bidiFactory from 'bidi-js'

const root = resolve(process.cwd())
const regular = resolve(root, 'public/fonts/NotoNaskhArabic-Regular.ttf')
const bold = resolve(root, 'public/fonts/NotoNaskhArabic-Bold.ttf')

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(existsSync(regular), 'Missing NotoNaskhArabic-Regular.ttf')
assert(existsSync(bold), 'Missing NotoNaskhArabic-Bold.ttf')
assert(readFileSync(regular).byteLength > 50_000, 'Regular font too small')
assert(readFileSync(bold).byteLength > 50_000, 'Bold font too small')

const sample = 'مہم کی رپورٹ · مجموعی پیش رفت · زیر التواء کام'
const reshaped = ArabicReshaper.convertArabic(sample)
assert(reshaped.length >= sample.length, 'Reshape failed')
assert(reshaped !== sample || /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(reshaped), 'Expected presentation forms')

const bidi = bidiFactory()
const levels = bidi.getEmbeddingLevels(reshaped, 'rtl')
assert(levels.levels.length === reshaped.length, 'Bidi levels mismatch')
const flips = bidi.getReorderSegments(reshaped, levels)
assert(Array.isArray(flips), 'Reorder segments missing')

console.log(
  JSON.stringify(
    {
      ok: true,
      fonts: {
        regularBytes: readFileSync(regular).byteLength,
        boldBytes: readFileSync(bold).byteLength,
      },
      sample,
      reshapedPreview: reshaped.slice(0, 24),
      flipCount: flips.length,
      checks: [
        'Urdu Unicode font files present',
        'Arabic/Urdu reshape produces presentation forms',
        'RTL bidi reorder segments available',
      ],
    },
    null,
    2,
  ),
)
