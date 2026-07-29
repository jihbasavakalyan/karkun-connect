/**
 * Build a person secretary snapshot from existing guidance / journey / compliance.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import {
  daysSince,
  hasVisitRecorded,
  isJihRegistered,
} from '@/lib/guidance/journeyEngine'
import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { getIjtemaAttendanceRecord } from '@/stores/ijtemaAttendanceStore'
import { getWeekEndingDate } from '@/types/ijtemaAttendance'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getPersonCategory } from '@/lib/peopleClassification'
import type { RelationshipHealthLevel } from '@/types/guidance'
import type { PersonSecretaryFacts, SecretaryCheckItem, SecretaryFocus } from './types'
import { formatSecretarySections } from './formatSecretarySections'

const RISK_URDU: Record<RelationshipHealthLevel, string> = {
  healthy: 'اطمینان بخش',
  'needs-attention': 'توجہ درکار',
  urgent: 'فوری توجہ',
  dormant: 'رابطہ منقطع',
}

function categoryUrdu(
  person: Parameters<typeof getPersonCategory>[0] | undefined,
): string {
  if (!person) return 'کارکن'
  return getPersonCategory(person) === 'Muttafiq' ? 'متفق' : 'کارکن'
}

function lastContactUrdu(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'آخری رابطہ درج نہیں'
  const days = daysSince(iso)
  if (!Number.isFinite(days)) return 'آخری رابطہ درج نہیں'
  const rounded = Math.floor(days)
  if (rounded <= 0) return 'آج رابطہ ہوا'
  if (rounded === 1) return 'گزشتہ ایک دن پہلے رابطہ'
  return `آخری رابطہ ${rounded} دن پہلے`
}

function adviceForRisk(level: RelationshipHealthLevel, name: string): string {
  switch (level) {
    case 'urgent':
      return `میرے خیال میں ${name} سے آئندہ دو دن کے اندر ذاتی ملاقات زیادہ مؤثر ہوگی۔`
    case 'dormant':
      return `${name} سے جلد از جلد رابطہ بحال کریں؛ طویل سکوت تعلق کو کمزور کر دیتا ہے۔`
    case 'needs-attention':
      return `اس مرحلے پر ہفتہ وار اجتماع یا بیت المال میں سے جو کام رہ گیا ہے اسے اولین ترجیح دیں۔`
    default:
      return `${name} کی رفتار اچھی ہے؛ باقاعدہ فالو اپ سے اسے مزید مستحکم کیا جا سکتا ہے۔`
  }
}

export function buildPersonSecretaryFacts(input: {
  personId: string
  name: string
  mobile: string
  profilePath: string
  ruknId?: string | null
}): PersonSecretaryFacts | null {
  const karkun = getKarkunById(input.personId)
  const guidance = getKarkunGuidance(input.personId, input.ruknId ?? undefined)

  if (!karkun && !guidance) {
    return {
      personId: input.personId,
      name: input.name,
      mobile: input.mobile,
      categoryLabel: 'کارکن',
      ruknLabel: '—',
      situationSummary: `${input.name} کا ریکارڈ تلاش میں ملا ہے، مگر تفصیلی رہنمائی ابھی دستیاب نہیں۔`,
      completed: [],
      remaining: [{ label: 'تفصیلی پروفائل کھول کر جائزہ لیں', done: false }],
      attentionNotes: ['مکمل تفصیل کے لیے پروفائل دیکھیں۔'],
      recentActivity: [],
      lastContactLabel: '—',
      followUpLabel: 'درج نہیں',
      riskLabel: 'نامعلوم',
      nextPlan: ['پروفائل کھولیں اور موجودہ مرحلہ تصدیق کریں۔'],
      advice: `${input.name} کی مکمل رپورٹ کے لیے پروفائل کھولنا بہتر ہوگا۔`,
      profilePath: input.profilePath,
    }
  }

  const assignmentId = guidance?.assignmentId
  const visitDone = karkun ? hasVisitRecorded(karkun, assignmentId) : false
  const jihDone = karkun ? isJihRegistered(karkun) : false
  const ijtema = getIjtemaAttendanceRecord(input.personId, getWeekEndingDate())
  const ijtemaDone = ijtema?.status === 'Present'
  const baitul = getCurrentBaitulMaalStatus(input.personId)
  const baitulDone = baitul.status === 'Paid' || baitul.status === 'Exempt'
  const followUp = getActiveFollowUpForKarkun(input.personId)
  const healthLevel = guidance?.health.level ?? 'needs-attention'
  const pending = guidance?.pendingCommitments ?? []

  const checks: SecretaryCheckItem[] = [
    { label: 'ملاقات مکمل', done: visitDone },
    { label: 'JIH App اندراج', done: jihDone },
    { label: 'ہفتہ وار اجتماع میں شرکت', done: ijtemaDone },
    { label: 'بیت المال کی وابستگی', done: baitulDone },
  ]

  const completed = checks.filter((c) => c.done)
  const remainingChecks = checks.filter((c) => !c.done)
  for (const commitment of pending.slice(0, 3)) {
    remainingChecks.push({
      label: `زیر التوا وعدہ: ${commitment.text}`,
      done: false,
    })
  }

  const attentionNotes: string[] = []
  if (guidance?.health.reasons?.length) {
    // Keep Urdu voice — paraphrase level, avoid English reason dump.
    attentionNotes.push(`خطرے کی سطح: ${RISK_URDU[healthLevel]}`)
  }
  if (!visitDone) attentionNotes.push('ملاقات ابھی باقی ہے — تعلق کا پہلا قدم۔')
  if (visitDone && !jihDone) attentionNotes.push('ملاقات کے بعد JIH App اندراج ترجیح ہے۔')
  if (!ijtemaDone) attentionNotes.push('ہفتہ وار اجتماع میں باقاعدگی مطلوب ہے۔')
  if (!baitulDone) attentionNotes.push('بیت المال کی وابستگی باقی ہے۔')
  if (pending.length > 0) {
    attentionNotes.push(`${pending.length} وعدے زیر التوا ہیں۔`)
  }

  const recentActivity: string[] = []
  if (karkun?.lastVisit) recentActivity.push(`آخری ملاقات: ${karkun.lastVisit}`)
  if (visitDone) recentActivity.push('ملاقات کا ریکارڈ موجود ہے')
  if (jihDone) recentActivity.push('JIH App اندراج مکمل')

  const ruknLabel =
    karkun?.assignedRukn?.trim() ||
    (karkun?.assignedRuknId ? karkun.assignedRuknId : 'تفویض نہیں')

  const doneCount = completed.length
  const situationSummary =
    healthLevel === 'healthy'
      ? `${input.name} کی مجموعی صورتحال اطمینان بخش ہے (${doneCount} اہم قدم مکمل)۔`
      : healthLevel === 'urgent' || healthLevel === 'dormant'
        ? `${input.name} کی صورتحال نازک ہے — ${RISK_URDU[healthLevel]}۔`
        : `${input.name} کی صورتحال درمیانی ہے؛ کچھ اہم کام باقی ہیں۔`

  const nextPlan: string[] = []
  if (!visitDone) nextPlan.push('جلد ذاتی ملاقات طے کریں۔')
  else if (!jihDone) nextPlan.push('JIH App اندراج میں مدد دیں۔')
  else if (!ijtemaDone) nextPlan.push('اگلے اجتماع کی دعوت دیں اور حاضری یقینی بنائیں۔')
  else if (!baitulDone) nextPlan.push('بیت المال کی اہمیت سمجھائیں اور وابستگی مکمل کریں۔')
  if (pending.length > 0) nextPlan.push('زیر التوا وعدوں کو وقت پر پورا کریں۔')
  if (nextPlan.length === 0) nextPlan.push('باقاعدہ رابطہ اور فالو اپ جاری رکھیں۔')

  return {
    personId: input.personId,
    name: input.name,
    mobile: input.mobile || karkun?.mobile || '—',
    categoryLabel: categoryUrdu(karkun),
    ruknLabel,
    situationSummary,
    completed,
    remaining: remainingChecks,
    attentionNotes: attentionNotes.slice(0, 5),
    recentActivity,
    lastContactLabel: lastContactUrdu(karkun?.lastVisit ?? null),
    followUpLabel: followUp ? 'فعال فالو اپ موجود ہے' : 'کوئی فعال فالو اپ نہیں',
    riskLabel: RISK_URDU[healthLevel],
    nextPlan: nextPlan.slice(0, 4),
    advice: adviceForRisk(healthLevel, input.name),
    profilePath: input.profilePath,
  }
}

export function formatPersonSecretaryReport(
  facts: PersonSecretaryFacts,
  focus: SecretaryFocus = 'full',
): string {
  const intro = [
    `${facts.name} (${facts.categoryLabel})`,
    `متعلقہ رکن: ${facts.ruknLabel}`,
    facts.mobile && facts.mobile !== '—' ? `موبائل: ${facts.mobile}` : null,
    facts.lastContactLabel,
    facts.followUpLabel,
    `خطرے کی سطح: ${facts.riskLabel}`,
  ]
    .filter(Boolean)
    .join('\n')

  const progress = [
    ...facts.completed.map((c) => c.label),
    ...facts.recentActivity.slice(0, 2),
  ]
  const remaining = facts.remaining.map((c) => c.label)

  return formatSecretarySections({
    situation: `${facts.situationSummary}\n${intro}`,
    progress,
    remaining,
    attention: facts.attentionNotes,
    nextPlan: facts.nextPlan,
    advice: facts.advice,
    remainingFirst: focus === 'remaining',
  })
}
