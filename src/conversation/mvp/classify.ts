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
  /تلاش/,
  /ڈھونڈ/,
]

const NAV_PATTERNS: Array<{ target: string; patterns: RegExp[] }> = [
  {
    target: 'dashboard',
    patterns: [/dashboard/i, /ڈیش بورڈ/, /میرے؟? ?ہوم/, /\bhome\b/i],
  },
  {
    target: 'registry',
    patterns: [/registry/i, /karkun\s*list/i, /رجسٹری/, /کارکنان/],
  },
  {
    target: 'weekly_ijtema',
    patterns: [/weekly\s*ijtema/i, /ijtema/i, /اجتما/, /حاضری\s*کھول/],
  },
  {
    target: 'reports',
    patterns: [/reports?/i, /رپورٹ/, /campaign\s*record/i],
  },
  {
    target: 'settings',
    patterns: [/settings?/i, /ترتیبات/],
  },
  {
    target: 'assignments',
    patterns: [/assignment/i, /connections?/i, /تفویض/, /کنکشن/],
  },
  {
    target: 'campaign',
    patterns: [/open\s+campaign/i, /campaign\s+setup/i, /مہم/],
  },
  {
    target: 'attendance',
    patterns: [/open\s+attendance/i, /attendance/i, /حاضری/],
  },
  {
    target: 'muttafiq',
    patterns: [/muttafiq/i, /متفق/],
  },
]

const REPORT_PATTERNS: RegExp[] = [
  /how many/i,
  /pending/i,
  /connected/i,
  /progress/i,
  /completion/i,
  /visits?\s+pending/i,
  /attendance\s+today/i,
  /کتنے/,
  /کتنی/,
  /پیش رفت/,
  /مکمل/,
]

const HELP_PATTERNS: RegExp[] = [
  /how do i/i,
  /how to/i,
  /help/i,
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
      /^(find|search|show|locate|open profile|open person|تلاش|ڈھونڈو?)\s+/i,
      '',
    )
    .replace(/\b(worker|karkun|person|کارکن)\b/gi, '')
    .trim()
  return cleaned.length >= 2 ? cleaned : null
}

export function classifyUtterance(raw: string): ClassifiedUtterance {
  const q = normalize(raw)

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

  // Name-like search: "Find Aslam", "Show Imran", Urdu names after search verbs
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
