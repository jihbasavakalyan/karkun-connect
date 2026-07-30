/**
 * Extended keyword classification for MVP + v2 capabilities.
 */

import type { IntentTypeCode } from '../intent'
import { classifyUtterance as classifyBase, type ClassifiedUtterance } from './classify'
import {
  classifyCampaignIntelTopic,
  isCampaignIntelligenceUtterance,
} from './campaignIntelligence/topics'
import { classifySafeAction } from './safeActions/classifySafeAction'
import type { SafeActionKind } from './safeActions/policy'
import {
  isClarificationUtterance,
  detectContextSwitchTopic,
} from './v2/conversationAdvanced'
import { isPersonRemainingFollowUp } from './secretaryIntelligence'

const TASK_PATTERNS: RegExp[] = [
  /what should i do/i,
  /pending tasks?/i,
  /upcoming follow-?ups?/i,
  /unassigned/i,
  /missed visits?/i,
  /today'?s? (work|mission|tasks?)/i,
  /کیا کروں/,
  /باقی کام/,
  /آج کیا/,
]

const SUGGEST_PATTERNS: RegExp[] = [
  /suggest/i,
  /who should (i )?contact/i,
  /bottleneck/i,
  /assignment gaps?/i,
  /تجویز/,
  /کسے رابطہ/,
]

const HELP_PATTERNS: RegExp[] = [
  /how do i/i,
  /how to/i,
  /\bhelp\b/i,
  /shortcuts?/i,
  /commands?/i,
  /مدد/,
  /کیسے/,
  /ہدایت/,
]

const VISIT_PATTERNS: RegExp[] = [/record visit/i, /mark visit/i, /ملاقات درج/, /وزیٹ/]
const ATTENDANCE_MARK_PATTERNS: RegExp[] = [
  /mark attendance/i,
  /حاضری لگاو?/,
  /حاضری درج/,
]
/** KC-027 — first-person Rukn secretary report (before PROFILE / person name). */
const SELF_REPORT_PATTERNS: RegExp[] = [
  /میری رپورٹ/,
  /میرا جائزہ/,
  /میری ذمہ داری/,
  /my (report|review|responsibilities)/i,
]

/** KC-027 — first-person priorities (before TASK_PATTERNS «آج کیا»). */
const SELF_PRIORITIES_PATTERNS: RegExp[] = [
  /میری ترجیحات/,
  /آج مجھے کیا/,
  /آج کیا کرنا/,
  /my (priorities|priorities today)/i,
  /what should i (do|focus on) today/i,
]

const PROFILE_PATTERNS: RegExp[] = [
  /show profile/i,
  /show (phone|family|status|assignments?|visit history)/i,
  /پروفائل/,
  /فون دکھاو?/,
  /تاریخ ملاقات/,
  /کی رپورٹ/,
  /کا رپورٹ/,
  /رپورٹ بتا/,
  /رپورٹ سنا/,
  /کارکن کی معلومات/,
  /کی معلومات بتا/,
  /کا جائزہ/,
]

const PROACTIVE_PATTERNS: RegExp[] = [
  /\bproactive\b/i,
  /good morning/i,
  /what('?s| is) (important|urgent)/i,
  /surface (updates?|alerts?)/i,
  /صبح بخیر/,
  /فوری معلومات/,
]

const BRIEFING_PATTERNS: RegExp[] = [
  /daily briefing/i,
  /today'?s? briefing/i,
  /morning briefing/i,
  /complete briefing/i,
  /آج کی بریفنگ/,
  /بریفنگ/,
]

const WORK_QUEUE_PATTERNS: RegExp[] = [
  /work queue/i,
  /smart queue/i,
  /prioritized? (work|tasks?|queue)/i,
  /show pending visits/i,
  /ترجیحی (کام|قطار)/,
  /کام کی قطار/,
]

const DASHBOARD_PATTERNS: RegExp[] = [
  /personal dashboard/i,
  /my (progress|dashboard|stats)/i,
  /completion %/i,
  /ذاتی ڈیش بورڈ/,
  /میرا ڈیٹا/,
]

const RECOMMEND_PATTERNS: RegExp[] = [
  /recommend/i,
  /visit these (workers?|karkuns?)/i,
  /who (to|should i) visit first/i,
  /next best/i,
  /سفارش/,
]

const NOTIFY_PATTERNS: RegExp[] = [
  /notifications?/i,
  /reminders? due/i,
  /unread (messages?|communication)/i,
  /اطلاعات/,
  /یاددہانیاں/,
]

const TIMELINE_PATTERNS: RegExp[] = [
  /\btimeline\b/i,
  /recent activity/i,
  /what happened (today|yesterday)/i,
  /activity (today|this week)/i,
  /ٹائم لائن/,
  /حالیہ سرگرمی/,
]

const HISTORY_PATTERNS: RegExp[] = [
  /conversation history/i,
  /recent (conversations?|searches?|actions?)/i,
  /pinned conversations?/i,
  /گفتگو کی تاریخ/,
  /حالیہ تلاش/,
]

const ENTITY_CARD_PATTERNS: RegExp[] = [
  /entity cards?/i,
  /show (campaign|assignment|attendance) card/i,
  /کارڈ دکھاو?/,
]

const INSIGHTS_V2_PATTERNS: RegExp[] = [
  /operational insights?/i,
  /weekly trend/i,
  /آپریشنل بصیرت/,
]

const GUIDED_PATTERNS: RegExp[] = [
  /guided (workflow|flow)/i,
  /walk me through/i,
  /ہدایتی بہاؤ/,
]

const VOICE_READY_PATTERNS: RegExp[] = [
  /voice ready/i,
  /voice (status|interface)/i,
  /صوتی تیاری/,
]

export type MvpIntentKind =
  | IntentTypeCode
  | 'TASK_ASSIST'
  | 'SUGGEST'
  | 'HELP'
  | 'KARKUN_INFO'
  | 'RUKN_SELF_REPORT'
  | 'RUKN_SELF_PRIORITIES'
  | 'CAMPAIGN_INTEL'
  | 'SAFE_ACTION'
  | 'REMINDER'
  | 'PROACTIVE'
  | 'DAILY_BRIEFING'
  | 'WORK_QUEUE'
  | 'PERSONAL_DASHBOARD'
  | 'RECOMMENDATIONS'
  | 'NOTIFICATIONS'
  | 'TIMELINE'
  | 'HISTORY'
  | 'ENTITY_CARDS'
  | 'OPERATIONAL_INSIGHTS'
  | 'GUIDED_WORKFLOW'
  | 'EXPLAINABILITY'
  | 'VOICE_READY'
  | 'CLARIFY'

export type ExtendedClassification = ClassifiedUtterance & {
  readonly mvpKind: MvpIntentKind
  readonly actionSubject: string | null
  readonly campaignTopic?: string | null
  readonly safeActionKind?: SafeActionKind | null
  readonly safeExtraKinds?: readonly SafeActionKind[]
}

function stripActionSubject(raw: string, patterns: RegExp[]): string | null {
  let text = raw
  for (const pattern of patterns) {
    text = text.replace(pattern, ' ')
  }
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length >= 2 ? cleaned : null
}

/** Drop leftover report verbs so «اسلم کی رپورٹ بتاؤ» → «اسلم». */
function cleanPersonReportSubject(subject: string | null): string | null {
  if (!subject) return null
  const cleaned = subject
    .replace(/بتاؤ?|بتاو?|سناؤ?|سناو?|دکھاؤ?|دکھاو?|please|show|me/giu, ' ')
    .replace(/[؟?!.،,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length >= 2 ? cleaned : null
}

function v2Kind(
  kind: MvpIntentKind,
  raw: string,
  subject: string | null = null,
): ExtendedClassification {
  return {
    intentCodes: ['FOLLOW_UP'],
    searchQuery: subject,
    navigationTarget: null,
    raw,
    mvpKind: kind,
    actionSubject: subject,
  }
}

export function classifyMvpUtterance(raw: string): ExtendedClassification {
  const trimmed = raw.trim()

  // Bare why / explain — explainability. "What about attendance?" continues to campaign intel.
  if (/^(why\??|کیوں\??|explain more|وضاحت)$/i.test(trimmed)) {
    return v2Kind('EXPLAINABILITY', raw)
  }

  if (VOICE_READY_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('VOICE_READY', raw)
  }

  if (BRIEFING_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('DAILY_BRIEFING', raw)
  }

  if (PROACTIVE_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('PROACTIVE', raw)
  }

  if (WORK_QUEUE_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('WORK_QUEUE', raw)
  }

  if (DASHBOARD_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('PERSONAL_DASHBOARD', raw)
  }

  if (RECOMMEND_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('RECOMMENDATIONS', raw)
  }

  if (NOTIFY_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('NOTIFICATIONS', raw)
  }

  if (TIMELINE_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('TIMELINE', raw)
  }

  if (HISTORY_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('HISTORY', raw)
  }

  if (GUIDED_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind(
      'GUIDED_WORKFLOW',
      raw,
      stripActionSubject(raw, [
        /guided (workflow|flow)/i,
        /walk me through/i,
        /ہدایتی بہاؤ/,
      ]),
    )
  }

  if (ENTITY_CARD_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind(
      'ENTITY_CARDS',
      raw,
      stripActionSubject(raw, ENTITY_CARD_PATTERNS),
    )
  }

  if (INSIGHTS_V2_PATTERNS.some((p) => p.test(raw))) {
    return v2Kind('OPERATIONAL_INSIGHTS', raw)
  }

  if (HELP_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['UNKNOWN'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'HELP',
      actionSubject: null,
    }
  }

  const safe = classifySafeAction(raw)
  if (safe) {
    const intentCode: IntentTypeCode =
      safe.kind === 'CALL'
        ? 'CALL'
        : safe.kind === 'WHATSAPP'
          ? 'WHATSAPP'
          : safe.kind === 'REMINDER'
            ? 'REMINDER'
            : safe.kind === 'CONFIRM' || safe.kind === 'CANCEL'
              ? 'UNKNOWN'
              : 'NAVIGATION'

    return {
      intentCodes: [intentCode],
      searchQuery: safe.subject,
      navigationTarget: null,
      raw,
      mvpKind:
        safe.kind === 'REMINDER'
          ? 'REMINDER'
          : safe.kind === 'CONFIRM' || safe.kind === 'CANCEL'
            ? 'SAFE_ACTION'
            : safe.kind === 'CALL' || safe.kind === 'WHATSAPP'
              ? safe.kind
              : 'SAFE_ACTION',
      actionSubject: safe.subject,
      safeActionKind: safe.kind,
      safeExtraKinds: safe.extraKinds,
    }
  }

  if (ATTENDANCE_MARK_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['IJTEMA_ATTENDANCE'],
      searchQuery: null,
      navigationTarget: 'weekly_ijtema',
      raw,
      mvpKind: 'IJTEMA_ATTENDANCE',
      actionSubject: null,
    }
  }

  if (VISIT_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['VISIT_UPDATE'],
      searchQuery: stripActionSubject(raw, VISIT_PATTERNS),
      navigationTarget: null,
      raw,
      mvpKind: 'VISIT_UPDATE',
      actionSubject: stripActionSubject(raw, VISIT_PATTERNS),
    }
  }

  // Person continuity: «کیا باقی ہے؟» after a karkun report (before TASK / campaign).
  if (isPersonRemainingFollowUp(trimmed)) {
    return {
      intentCodes: ['SEARCH'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'KARKUN_INFO',
      actionSubject: null,
    }
  }

  // KC-027 — first-person secretary (before TASK / PROFILE so «میری» is never a person name).
  if (SELF_REPORT_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['REPORT'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'RUKN_SELF_REPORT',
      actionSubject: null,
    }
  }

  if (SELF_PRIORITIES_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['FOLLOW_UP'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'RUKN_SELF_PRIORITIES',
      actionSubject: null,
    }
  }

  if (TASK_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['FOLLOW_UP'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'TASK_ASSIST',
      actionSubject: null,
    }
  }

  if (SUGGEST_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['FOLLOW_UP'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'SUGGEST',
      actionSubject: null,
    }
  }

  if (
    PROFILE_PATTERNS.some((p) => p.test(raw)) &&
    !/مہم|campaign/i.test(raw)
  ) {
    const subject = cleanPersonReportSubject(
      stripActionSubject(raw, PROFILE_PATTERNS),
    )
    return {
      intentCodes: ['SEARCH'],
      searchQuery: subject,
      navigationTarget: null,
      raw,
      mvpKind: 'KARKUN_INFO',
      actionSubject: subject,
    }
  }

  const explicitNav = /^(open|go to)\b/i.test(raw.trim())
  // Context switch "what about attendance?" must hit campaign intel (strip filler).
  const contextTopic = detectContextSwitchTopic(raw)
  const campaignProbe = contextTopic
    ? contextTopic
    : raw
  if (!explicitNav && isCampaignIntelligenceUtterance(campaignProbe)) {
    return {
      intentCodes: ['REPORT'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'CAMPAIGN_INTEL',
      actionSubject: null,
      campaignTopic: classifyCampaignIntelTopic(campaignProbe),
    }
  }

  if (isClarificationUtterance(raw) && !contextTopic) {
    return v2Kind('CLARIFY', raw)
  }

  const base = classifyBase(raw)
  return {
    ...base,
    mvpKind: (base.intentCodes[0] as MvpIntentKind) ?? 'UNKNOWN',
    actionSubject: base.searchQuery,
    campaignTopic:
      base.intentCodes[0] === 'REPORT' ? classifyCampaignIntelTopic(raw) : null,
  }
}
