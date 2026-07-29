/**
 * KC-0130 — Intelligent Official Briefing Urdu from live campaign summary.
 * Numbers come only from `buildOfficialCampaignSummary` (same as Rukn card).
 */

import type { OfficialCampaignSummary } from '@/lib/ruknWorkspacePresentation'

export type IntelligentBriefingFreeText = {
  personalNote?: string
  additionalRemarks?: string
  closingMessage?: string
}

function scrubOptional(text: string | undefined): string {
  return (text ?? '').replace(/\u200b/g, '').trim()
}

/**
 * Natural Urdu WhatsApp briefing from structured campaign numbers only.
 * Omits zero-pending callouts; appreciation when all responsibilities are complete.
 */
export function generateIntelligentOfficialBriefingUrdu(input: {
  ruknName: string
  campaignName: string
  summary: OfficialCampaignSummary
  freeText?: IntelligentBriefingFreeText
}): string {
  const { ruknName, campaignName, summary } = input
  const campaign = campaignName.trim() || 'مہم'
  const name = ruknName.trim() || 'بھائی / بہن'
  const statusLabel = summary.overallStatus.label
  const lines: string[] = []

  lines.push('السلام علیکم ورحمۃ اللہ وبرکاتہ')
  lines.push(name)
  lines.push('')
  lines.push(
    `${campaign} کے سلسلے میں آپ کی ذمہ داری اور پیش رفت کا مختصر جائزہ حاضر خدمت ہے۔`,
  )
  lines.push('')

  if (summary.connectedKarkuns <= 0) {
    lines.push(
      'اس وقت آپ کے ساتھ کوئی کارکن منسلک نہیں۔ جب سپردگی ہو گی تو پیش رفت یہاں نظر آئے گی۔',
    )
  } else if (summary.allResponsibilitiesComplete) {
    lines.push(
      `الحمد للہ — آپ کے ${summary.connectedKarkuns} منسلک کارکنوں پر مہم کی ذمہ داریاں مکمل نظر آ رہی ہیں۔ آپ کی مستقل کوشش قابلِ قدر ہے۔`,
    )
    lines.push('')
    lines.push(`مجموعی صورتِ حال: ${statusLabel}`)
  } else {
    lines.push(`منسلک کارکن: ${summary.connectedKarkuns}`)
    lines.push(`مجموعی صورتِ حال: ${statusLabel}`)
    lines.push('')
    lines.push('موجودہ پیش رفت:')
    lines.push(
      `ملاقات — مکمل ${summary.completedVisits}، باقی ${summary.pendingVisits}`,
    )
    lines.push(
      `ہفتہ وار اجتماع — مکمل ${summary.completedWeeklyIjtema}، باقی ${summary.pendingWeeklyIjtema}`,
    )
    lines.push(
      `ماہانہ بیت المال — مکمل ${summary.completedMonthlyBaitulMaal}، باقی ${summary.pendingMonthlyBaitulMaal}`,
    )
    lines.push(
      `ایپ رجسٹریشن — مکمل ${summary.completedAppRegistration}، باقی ${summary.pendingAppRegistration}`,
    )

    const pendingLines: string[] = []
    if (summary.pendingVisits > 0) {
      pendingLines.push(`ملاقات باقی: ${summary.pendingVisits}`)
    }
    if (summary.pendingWeeklyIjtema > 0) {
      pendingLines.push(`ہفتہ وار اجتماع باقی: ${summary.pendingWeeklyIjtema}`)
    }
    if (summary.pendingMonthlyBaitulMaal > 0) {
      pendingLines.push(`ماہانہ بیت المال باقی: ${summary.pendingMonthlyBaitulMaal}`)
    }
    if (summary.pendingAppRegistration > 0) {
      pendingLines.push(`ایپ رجسٹریشن باقی: ${summary.pendingAppRegistration}`)
    }

    if (pendingLines.length > 0) {
      lines.push('')
      lines.push('ابھی توجہ کے اہل امور:')
      for (const item of pendingLines) {
        lines.push(`• ${item}`)
      }
    }

    lines.push('')
    lines.push(
      'ان شاء اللہ باہمی تعاون اور مستقل پیش رفت سے مہم آگے بڑھے گی۔ آپ کی کوشش اس سفر کا اہم حصہ ہے۔',
    )
  }

  if (summary.lastCommunication && summary.lastCommunication !== '-') {
    lines.push('')
    lines.push(`آخری رابطہ: ${summary.lastCommunication}`)
  }

  const personalNote = scrubOptional(input.freeText?.personalNote)
  const additionalRemarks = scrubOptional(input.freeText?.additionalRemarks)
  const closingMessage = scrubOptional(input.freeText?.closingMessage)

  if (personalNote) {
    lines.push('')
    lines.push(personalNote)
  }
  if (additionalRemarks) {
    lines.push('')
    lines.push(additionalRemarks)
  }

  lines.push('')
  if (closingMessage) {
    lines.push(closingMessage)
  } else if (summary.allResponsibilitiesComplete) {
    lines.push('اللہ آپ کی خدمت کو قبول فرمائے اور مزید توفیق عطا کرے۔')
  } else {
    lines.push('اللہ آپ کو حکمت، آسانی اور استقامت عطا فرمائے۔')
  }
  lines.push('')
  lines.push('جزاکم اللہ خیراً')

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Compact Urdu pending summary for mail-merge aliases (no repeated Visit Pending labels). */
export function formatPendingResponsibilitiesUrdu(summary: OfficialCampaignSummary): string {
  if (summary.connectedKarkuns <= 0) {
    return 'ابھی کوئی سپردگی نہیں'
  }
  if (summary.allResponsibilitiesComplete) {
    return 'تمام ذمہ داریاں مکمل'
  }
  const parts: string[] = []
  if (summary.pendingVisits > 0) parts.push(`ملاقات ${summary.pendingVisits}`)
  if (summary.pendingWeeklyIjtema > 0) parts.push(`اجتماع ${summary.pendingWeeklyIjtema}`)
  if (summary.pendingMonthlyBaitulMaal > 0) {
    parts.push(`بیت المال ${summary.pendingMonthlyBaitulMaal}`)
  }
  if (summary.pendingAppRegistration > 0) {
    parts.push(`ایپ ${summary.pendingAppRegistration}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'مہم کی عمومی پیش رفت'
}
