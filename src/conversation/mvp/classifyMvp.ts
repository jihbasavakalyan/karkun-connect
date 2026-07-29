/**
 * Extended keyword classification for MVP capabilities.
 */

import type { IntentTypeCode } from '../intent'
import { classifyUtterance as classifyBase, type ClassifiedUtterance } from './classify'
import {
  classifyCampaignIntelTopic,
  isCampaignIntelligenceUtterance,
} from './campaignIntelligence/topics'
import { classifySafeAction } from './safeActions/classifySafeAction'
import type { SafeActionKind } from './safeActions/policy'

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
  /explain/i,
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
const PROFILE_PATTERNS: RegExp[] = [
  /show profile/i,
  /show (phone|family|status|assignments?|visit history)/i,
  /پروفائل/,
  /فون دکھاو?/,
  /تاریخ ملاقات/,
]

export type MvpIntentKind =
  | IntentTypeCode
  | 'TASK_ASSIST'
  | 'SUGGEST'
  | 'HELP'
  | 'KARKUN_INFO'
  | 'CAMPAIGN_INTEL'
  | 'SAFE_ACTION'
  | 'REMINDER'

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

export function classifyMvpUtterance(raw: string): ExtendedClassification {
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

  if (PROFILE_PATTERNS.some((p) => p.test(raw))) {
    return {
      intentCodes: ['SEARCH'],
      searchQuery: stripActionSubject(raw, PROFILE_PATTERNS),
      navigationTarget: null,
      raw,
      mvpKind: 'KARKUN_INFO',
      actionSubject: stripActionSubject(raw, PROFILE_PATTERNS),
    }
  }

  const explicitNav = /^(open|go to)\b/i.test(raw.trim())
  if (!explicitNav && isCampaignIntelligenceUtterance(raw)) {
    return {
      intentCodes: ['REPORT'],
      searchQuery: null,
      navigationTarget: null,
      raw,
      mvpKind: 'CAMPAIGN_INTEL',
      actionSubject: null,
      campaignTopic: classifyCampaignIntelTopic(raw),
    }
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
