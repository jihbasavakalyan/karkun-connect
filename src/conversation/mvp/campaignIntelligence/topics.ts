/**
 * Campaign intelligence topic classification (keyword only — no AI).
 */

export type CampaignIntelTopic =
  | 'overview'
  | 'connected'
  | 'visits_pending'
  | 'visits_completed'
  | 'visits'
  | 'ijtema'
  | 'registration'
  | 'baitul_maal'
  | 'attention'
  | 'week_change'
  | 'today'
  | 'why'
  | 'details'
  | 'open_report'

const TOPIC_PATTERNS: Array<{ topic: CampaignIntelTopic; patterns: RegExp[] }> = [
  {
    topic: 'why',
    patterns: [/^why\??$/i, /\bwhy\b/i, /کیوں/, /وجہ/],
  },
  {
    topic: 'details',
    patterns: [/show details/i, /\bdetails\b/i, /تفصیل/],
  },
  {
    topic: 'open_report',
    patterns: [/open report/i, /open the report/i, /رپورٹ کھولو?/],
  },
  {
    topic: 'connected',
    patterns: [
      /how many.*connected/i,
      /karkuns?\s+are\s+connected/i,
      /connection progress/i,
      /منسلک/,
    ],
  },
  {
    topic: 'visits_pending',
    patterns: [
      /visits?\s+are\s+pending/i,
      /visits?\s+pending/i,
      /pending\s+visits?/i,
      /how many.*pending.*visits?/i,
      /how many.*visits?.*pending/i,
      /باقی ملاقات/,
      /ملاقات باقی/,
      /کن.*ملاقات باقی/,
    ],
  },
  {
    topic: 'visits_completed',
    patterns: [
      /visits?\s+(are\s+)?completed/i,
      /completed\s+visits?/i,
      /how many.*visits?.*completed/i,
      /how many.*completed.*visits?/i,
      /مکمل ملاقات/,
    ],
  },
  {
    topic: 'visits',
    patterns: [/visit (progress|metrics|status)/i, /ملاقات/],
  },
  {
    topic: 'ijtema',
    patterns: [
      /weekly\s*ijtema\s*progress/i,
      /ijtema\s*progress/i,
      /what about attendance/i,
      /attendance progress/i,
      /اجتما.*پیش رفت/,
      /حاضری.*پیش رفت/,
      /ہفتہ وار اجتماع/,
      /شرکت کم/,
    ],
  },
  {
    topic: 'registration',
    patterns: [
      /app registration/i,
      /registration progress/i,
      /jih.*registration/i,
      /رجسٹریشن/,
      /کن کی رجسٹریشن/,
      /رجسٹریشن نہیں/,
    ],
  },
  {
    topic: 'baitul_maal',
    patterns: [/bait.?ul.?maal/i, /بیت المال/, /contribution progress/i],
  },
  {
    topic: 'attention',
    patterns: [
      /need(?:s)? attention/i,
      /metrics need attention/i,
      /which campaign metrics/i,
      /توجہ/,
      /فوری توجہ/,
      /کمزور رکن/,
      /سب سے کمزور/,
    ],
  },
  {
    topic: 'week_change',
    patterns: [/what changed this week/i, /this week/i, /اس ہفتے/],
  },
  {
    topic: 'today',
    patterns: [/progress today/i, /today'?s? progress/i, /آج کی پیش رفت/],
  },
  {
    topic: 'overview',
    patterns: [
      /how is the campaign progressing/i,
      /campaign (progress|summary|overview)/i,
      /show campaign summary/i,
      /campaign overview/i,
      /مہم.*پیش رفت/,
      /مہم خلاصہ/,
      /مہم کی صورتحال/,
      /صورتحال کیا ہے/,
    ],
  },
]

/** Broad report/intel gate — used after follow-up resolution. */
export const CAMPAIGN_INTEL_GATE: RegExp[] = [
  /campaign/i,
  /connected/i,
  /progress/i,
  /visits?/i,
  /ijtema/i,
  /attendance/i,
  /registration/i,
  /bait.?ul.?maal/i,
  /overview/i,
  /summary/i,
  /how many/i,
  /what changed/i,
  /need(?:s)? attention/i,
  /مہم/,
  /منسلک/,
  /پیش رفت/,
  /ملاقات/,
  /اجتما/,
  /بیت المال/,
  /رجسٹریشن/,
  /کمزور/,
  /^why\??$/i,
  /show details/i,
  /what about attendance/i,
  /open report/i,
]

export function classifyCampaignIntelTopic(
  utterance: string,
): CampaignIntelTopic | null {
  const raw = utterance.trim()
  if (!raw) return null
  for (const entry of TOPIC_PATTERNS) {
    if (entry.patterns.some((p) => p.test(raw))) return entry.topic
  }
  if (CAMPAIGN_INTEL_GATE.some((p) => p.test(raw))) return 'overview'
  return null
}

export function isCampaignIntelligenceUtterance(utterance: string): boolean {
  return classifyCampaignIntelTopic(utterance) !== null
}
