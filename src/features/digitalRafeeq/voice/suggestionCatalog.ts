/**
 * Digital Rafeeq suggestion catalog (KC-018.3).
 * Single source of truth for quick chips, voice prompts, and suggested actions.
 * Speakable text === display text (ready for future TTS).
 */

import type {
  AdminCommandCenterSnapshot,
  RuknCommandCenterSnapshot,
} from '@/types/campaignAutomation.types'

export type RafeeqSuggestionCategory =
  | 'planning'
  | 'contact'
  | 'performance'
  | 'visits'
  | 'development'
  | 'meetings'

export type RafeeqSuggestion = {
  id: string
  category: RafeeqSuggestionCategory
  /** Display + speakable + AI prompt — same string everywhere. */
  text: string
  /** Ready for future voice phone command; chip only for now. */
  futureVoicePhone?: boolean
}

export const RAFEEQ_WELCOME_MESSAGE =
  'میں کارکنان، ملاقاتوں، ترجیحات اور جماعتی ذمہ داریوں کے بارے میں آپ کی رہنمائی کے لیے حاضر ہوں۔ آپ جو چاہیں پوچھ سکتے ہیں۔'

/** Full catalog — do not duplicate these strings elsewhere. */
export const RAFEEQ_SUGGESTION_CATALOG: readonly RafeeqSuggestion[] = [
  // Planning
  {
    id: 'plan-who-today',
    category: 'planning',
    text: 'آج کن کارکنان سے ملاقات کرنی چاہیے؟',
  },
  {
    id: 'plan-order-today',
    category: 'planning',
    text: 'آج کی ملاقاتوں کی ترتیب بنا دیں۔',
  },
  {
    id: 'plan-upcoming-offer',
    category: 'planning',
    text: 'اگر آپ چاہیں تو میں آئندہ ملاقاتوں کی منصوبہ بندی کر سکتا ہوں۔',
  },
  {
    id: 'plan-tomorrow',
    category: 'planning',
    text: 'کل کی ملاقاتوں کی منصوبہ بندی کریں۔',
  },

  // Contact
  {
    id: 'contact-phone-future',
    category: 'contact',
    text: 'کیا آپ کسی کارکن کو فون کرنا چاہتے ہیں؟ نام بولیے، میں خدمت کے لیے حاضر ہوں۔',
    futureVoicePhone: true,
  },
  {
    id: 'contact-long-gap',
    category: 'contact',
    text: 'کس کارکن سے کافی عرصے سے رابطہ نہیں ہوا؟',
  },
  {
    id: 'contact-first',
    category: 'contact',
    text: 'سب سے پہلے کس سے رابطہ کرنا بہتر ہوگا؟',
  },

  // Performance
  {
    id: 'perf-today',
    category: 'performance',
    text: 'میری آج کی کارکردگی کیسی ہے؟',
  },
  {
    id: 'perf-priorities',
    category: 'performance',
    text: 'میری ترجیحات کیا ہیں؟',
  },
  {
    id: 'perf-goal',
    category: 'performance',
    text: 'آج کا میرا ہدف کیا ہے؟',
  },

  // Visits
  {
    id: 'visit-first-pending',
    category: 'visits',
    text: 'کس کارکن کی پہلی ملاقات باقی ہے؟',
  },
  {
    id: 'visit-still-pending',
    category: 'visits',
    text: 'کس کی ملاقات ابھی باقی ہے؟',
  },
  {
    id: 'visit-who-today',
    category: 'visits',
    text: 'آج مجھے کس سے ملاقات کرنی چاہیے؟',
  },
  {
    id: 'visit-followups-today',
    category: 'visits',
    text: 'آج کے فالو اَپ کون سے ہیں؟',
  },

  // Worker development
  {
    id: 'dev-attention',
    category: 'development',
    text: 'کن کارکنان کو زیادہ توجہ درکار ہے؟',
  },
  {
    id: 'dev-overview',
    category: 'development',
    text: 'میرے کارکنان کی مجموعی صورتحال کیا ہے؟',
  },
  {
    id: 'dev-incomplete',
    category: 'development',
    text: 'کس کارکن کی معلومات نامکمل ہیں؟',
  },
  {
    id: 'dev-reconnect',
    category: 'development',
    text: 'کن کارکنان سے دوبارہ رابطہ ضروری ہے؟',
  },

  // Meetings / Ijtema
  {
    id: 'meet-absent',
    category: 'meetings',
    text: 'آج اجتماع میں کون غیر حاضر رہا؟',
  },
  {
    id: 'meet-attended',
    category: 'meetings',
    text: 'کتنے کارکن آج اجتماع میں شریک ہوئے؟',
  },
] as const

const byId = (id: string): RafeeqSuggestion => {
  const found = RAFEEQ_SUGGESTION_CATALOG.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Unknown Rafeeq suggestion id: ${id}`)
  }
  return found
}

export type RafeeqSuggestionContext = {
  role: 'administrator' | 'rukn'
  ruknSnapshot?: RuknCommandCenterSnapshot
  adminSnapshot?: AdminCommandCenterSnapshot
  /** Optional clock for tests. */
  now?: Date
}

function countFollowUpsDue(snapshot?: RuknCommandCenterSnapshot | AdminCommandCenterSnapshot): number {
  if (!snapshot) return 0
  return snapshot.followUpQueue
    .filter((group) => group.section === 'overdue' || group.section === 'today')
    .reduce((sum, group) => sum + group.items.length, 0)
}

function countPendingVisits(snapshot?: RuknCommandCenterSnapshot | AdminCommandCenterSnapshot): number {
  if (!snapshot) return 0
  const fromKpi =
    snapshot.kpis.find((kpi) => kpi.id === 'pending-first-visits')?.value ??
    snapshot.kpis.find((kpi) => kpi.id === 'pending')?.value ??
    0
  const fromSchedule = snapshot.schedule.filter(
    (item) =>
      item.type === 'first-meeting' ||
      item.type === 'scheduled-visit' ||
      /visit|meeting|ملاقات/i.test(item.title),
  ).length
  return Math.max(fromKpi, fromSchedule)
}

/** Friday–Saturday window approximates “before / around Weekly Ijtema”. */
function isNearWeeklyIjtema(now: Date): boolean {
  const day = now.getDay()
  return day === 5 || day === 6
}

const MAX_VISIBLE = 8

/**
 * Context-aware chip list. Same `text` is used for chips, voice prompts, and actions.
 */
export function resolveContextualSuggestions(
  context: RafeeqSuggestionContext,
): readonly RafeeqSuggestion[] {
  const now = context.now ?? new Date()
  const snapshot = context.role === 'rukn' ? context.ruknSnapshot : context.adminSnapshot
  const pendingVisits = countPendingVisits(snapshot)
  const followUpsDue = countFollowUpsDue(snapshot)
  const nearIjtema = isNearWeeklyIjtema(now)

  const prioritizedIds: string[] = []

  if (pendingVisits > 0) {
    prioritizedIds.push('plan-who-today', 'visit-still-pending', 'plan-order-today', 'visit-who-today')
  } else {
    prioritizedIds.push('perf-today', 'perf-priorities', 'plan-upcoming-offer', 'perf-goal')
  }

  if (followUpsDue > 0) {
    prioritizedIds.push('dev-reconnect', 'dev-attention', 'visit-followups-today')
  }

  if (nearIjtema) {
    prioritizedIds.push('meet-absent', 'meet-attended')
  }

  // Always keep contact + development coverage available, including future phone prompt.
  prioritizedIds.push(
    'contact-first',
    'contact-long-gap',
    'contact-phone-future',
    'visit-first-pending',
    'dev-overview',
    'dev-incomplete',
    'plan-tomorrow',
  )

  const seen = new Set<string>()
  const resolved: RafeeqSuggestion[] = []
  for (const id of prioritizedIds) {
    if (seen.has(id)) continue
    seen.add(id)
    resolved.push(byId(id))
    if (resolved.length >= MAX_VISIBLE) break
  }

  return resolved
}

/** Flat speakable strings for legacy callers / tests. */
export function getSuggestionTexts(context: RafeeqSuggestionContext): readonly string[] {
  return resolveContextualSuggestions(context).map((item) => item.text)
}

/** Legacy static lists — prefer resolveContextualSuggestions. */
export const SUGGESTED_QUESTIONS_RUKN: readonly string[] = RAFEEQ_SUGGESTION_CATALOG.map(
  (item) => item.text,
)

export const SUGGESTED_QUESTIONS_ADMIN: readonly string[] = [
  byId('plan-who-today').text,
  byId('dev-attention').text,
  byId('meet-absent').text,
  byId('perf-priorities').text,
  byId('dev-reconnect').text,
  byId('meet-attended').text,
]
