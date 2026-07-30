/**
 * Keyword utterance → intent classification (no AI).
 */

import type { IntentTypeCode } from '../intent'

export type ClassifiedUtterance = {
  readonly intentCodes: readonly IntentTypeCode[]
  readonly searchQuery: string | null
  readonly navigationTarget: string | null
  readonly raw: string
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

const SEARCH_PATTERNS: RegExp[] = [
  /\bfind\b/i,
  /\bsearch\b/i,
  /\bshow\b/i,
  /\blocate\b/i,
  /\bopen\s+(?:profile|person)\b/i,
  /search by/i,
  /تلاش/,
  /ڈھونڈ/,
]

const NAV_PATTERNS: Array<{ target: string; patterns: RegExp[] }> = [
  {
    target: 'dashboard',
    patterns: [
      /open\s+dashboard/i,
      /go\s+to\s+dashboard/i,
      /dashboard/i,
      /ڈیش بورڈ/,
      /(کھولیں|کھولو)\s*ڈیش\s*بورڈ/,
      /ڈیش\s*بورڈ\s*(کھولیں|کھولو)/,
      /\bhome\b/i,
    ],
  },
  {
    target: 'registry',
    patterns: [
      /open\s+registry/i,
      /go\s+to\s+registry/i,
      /registry/i,
      /karkun\s*list/i,
      /رجسٹری/,
      /(کھولیں|کھولو)\s*رجسٹری/,
      /رجسٹری\s*(کھولیں|کھولو)/,
    ],
  },
  {
    target: 'weekly_ijtema',
    patterns: [
      /open\s+weekly\s*ijtema/i,
      /go\s+to\s+weekly\s*ijtema/i,
      /weekly\s*ijtema/i,
      /open\s+ijtema/i,
      /اجتما/,
    ],
  },
  {
    target: 'baitul_maal',
    patterns: [
      /open\s+bait.?ul.?maal/i,
      /go\s+to\s+bait.?ul.?maal/i,
      /(کھولیں|کھولو).{0,12}بیت\s*المال/,
      /بیت\s*المال\s*(کھولیں|کھولو|صفحہ)/,
    ],
  },
  {
    target: 'reports',
    patterns: [
      /open\s+reports?/i,
      /go\s+to\s+reports?/i,
    ],
  },
  {
    target: 'settings',
    patterns: [
      /open\s+settings?/i,
      /go\s+to\s+settings?/i,
      /settings?/i,
      /ترتیبات/,
    ],
  },
  {
    target: 'assignments',
    patterns: [
      /find\s+assigned\s+karkuns?/i,
      /show\s+assigned\s+karkuns?/i,
      /open\s+assignments?/i,
      /assigned\s+karkuns?/i,
      /assignment/i,
      /connections?/i,
      /تفویض/,
      /کنکشن/,
    ],
  },
  {
    target: 'campaign',
    patterns: [
      /open\s+campaign/i,
      /go\s+to\s+campaign/i,
      /campaign\s+setup/i,
    ],
  },
  {
    target: 'attendance',
    patterns: [
      /open\s+attendance/i,
      /go\s+to\s+attendance/i,
    ],
  },
  {
    target: 'muttafiq',
    patterns: [
      /show\s+muttafiq/i,
      /open\s+muttafiq/i,
      /muttafiq/i,
      /متفق/,
    ],
  },
]

const REPORT_PATTERNS: RegExp[] = [
  /how many/i,
  /pending\s+tasks?/i,
  /connected/i,
  /progress/i,
  /completion/i,
  /visits?\s+pending/i,
  /visits?\s+completed/i,
  /campaign\s+(summary|overview|progress)/i,
  /how is the campaign/i,
  /need(?:s)? attention/i,
  /what changed this week/i,
  /attendance\s+today/i,
  /registration progress/i,
  /bait.?ul.?maal progress/i,
  /weekly\s*ijtema\s*progress/i,
  /کتنے/,
  /کتنی/,
  /پیش رفت/,
  /مکمل/,
]

const HELP_PATTERNS: RegExp[] = [
  /how do i/i,
  /how to/i,
  /\bhelp\b/i,
  /explain/i,
  /shortcuts?/i,
  /commands?/i,
  /مدد/,
  /کیسے/,
]

/**
 * Strip common search prefixes to isolate a person/place query.
 */
export function extractSearchQuery(raw: string): string | null {
  const cleaned = raw
    .replace(
      /^(find|search|show|locate|open profile|open person|search by(?:\s+(?:mobile(?:\s+number)?|rukn\s*id|karkun\s*id))?|تلاش|ڈھونڈو?)\s+/i,
      '',
    )
    .replace(/\b(worker|karkun|person|by mobile(?: number)?|by rukn id|by karkun id|کارکن)\b/gi, '')
    .trim()
  return cleaned.length >= 2 ? cleaned : null
}

export function classifyUtterance(raw: string): ClassifiedUtterance {
  const q = normalize(raw)

  // Navigation first for explicit open/go to module phrases
  for (const nav of NAV_PATTERNS) {
    if (nav.patterns.some((p) => p.test(raw) || p.test(q))) {
      return {
        intentCodes: ['NAVIGATION'],
        searchQuery: null,
        navigationTarget: nav.target,
        raw,
      }
    }
  }

  if (HELP_PATTERNS.some((p) => p.test(raw) || p.test(q))) {
    return {
      intentCodes: ['UNKNOWN'],
      searchQuery: null,
      navigationTarget: null,
      raw,
    }
  }

  if (REPORT_PATTERNS.some((p) => p.test(raw) || p.test(q))) {
    return {
      intentCodes: ['REPORT'],
      searchQuery: null,
      navigationTarget: null,
      raw,
    }
  }

  // Mobile / ID bare tokens → SEARCH
  if (/^[\d+][\d\s-]{6,}$/.test(raw.trim()) || /^[a-z0-9_-]{4,}$/i.test(raw.trim())) {
    return {
      intentCodes: ['SEARCH'],
      searchQuery: raw.trim(),
      navigationTarget: null,
      raw,
    }
  }

  if (
    SEARCH_PATTERNS.some((p) => p.test(raw)) ||
    /^(find|show|search|locate)\s+\S+/i.test(raw.trim())
  ) {
    return {
      intentCodes: ['SEARCH'],
      searchQuery: extractSearchQuery(raw),
      navigationTarget: null,
      raw,
    }
  }

  // Bare person-looking token (≥3 chars, letters) → SEARCH
  if (/^[\p{L}\s.'-]{3,40}$/u.test(raw.trim()) && !/\d/.test(raw)) {
    const words = raw.trim().split(/\s+/)
    if (words.length <= 4) {
      return {
        intentCodes: ['SEARCH'],
        searchQuery: raw.trim(),
        navigationTarget: null,
        raw,
      }
    }
  }

  return {
    intentCodes: ['UNKNOWN'],
    searchQuery: null,
    navigationTarget: null,
    raw,
  }
}
