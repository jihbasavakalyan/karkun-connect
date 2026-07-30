/**
 * KC-027 — Urdu TTS pronunciation prep (speakable string / SSML).
 * Display text stays unchanged; only the TTS input is transformed.
 */

/** Organisational terms → speakable aliases for Google Urdu TTS. */
export const URDU_TTS_PRONUNCIATION_ALIASES: ReadonlyArray<{
  readonly term: string
  readonly alias: string
}> = [
  { term: 'ترجیحات', alias: 'تَر جیحات' },
  { term: 'اجتماع', alias: 'اِجتِماع' },
  { term: 'بیت المال', alias: 'بیتُل مال' },
  { term: 'کارکن', alias: 'کار کُن' },
  { term: 'متفق', alias: 'مُتّفِق' },
  { term: 'رکن', alias: 'رُکن' },
  { term: 'دعوت', alias: 'دَعوَت' },
  { term: 'جماعت', alias: 'جَماعَت' },
  { term: 'حلقہ', alias: 'حَلقہ' },
  { term: 'امیر', alias: 'اَمیر' },
  { term: 'رفیق', alias: 'رَفیق' },
  { term: 'رجسٹری', alias: 'رجِسٹری' },
]

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Plain-text speakable string (pre-replace). Safe when SSML is unavailable.
 */
export function prepareUrduTtsPlainText(text: string): string {
  let out = text
  for (const { term, alias } of URDU_TTS_PRONUNCIATION_ALIASES) {
    if (!out.includes(term)) continue
    out = out.split(term).join(alias)
  }
  return out
}

/**
 * SSML with `<sub alias="…">` for organisational words. Display text unchanged upstream.
 */
export function prepareUrduTtsSsml(text: string): string {
  const sorted = [...URDU_TTS_PRONUNCIATION_ALIASES].sort(
    (a, b) => b.term.length - a.term.length,
  )
  let remaining = text
  const parts: string[] = []

  while (remaining.length > 0) {
    let earliest = -1
    let match: (typeof sorted)[number] | null = null
    for (const entry of sorted) {
      const idx = remaining.indexOf(entry.term)
      if (idx < 0) continue
      if (earliest < 0 || idx < earliest) {
        earliest = idx
        match = entry
      }
    }
    if (earliest < 0 || !match) {
      parts.push(escapeXml(remaining))
      break
    }
    if (earliest > 0) {
      parts.push(escapeXml(remaining.slice(0, earliest)))
    }
    parts.push(
      `<sub alias="${escapeXml(match.alias)}">${escapeXml(match.term)}</sub>`,
    )
    remaining = remaining.slice(earliest + match.term.length)
  }

  return `<speak>${parts.join('')}</speak>`
}

export type PreparedUrduTts = {
  readonly plain: string
  readonly ssml: string
  readonly changed: boolean
}

export function prepareUrduTtsText(text: string): PreparedUrduTts {
  const trimmed = text.trim()
  const plain = prepareUrduTtsPlainText(trimmed)
  const ssml = prepareUrduTtsSsml(trimmed)
  return {
    plain,
    ssml,
    changed: plain !== trimmed,
  }
}
