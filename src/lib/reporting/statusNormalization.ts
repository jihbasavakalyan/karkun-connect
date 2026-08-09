/**
 * Reporting-boundary status normalization.
 * Preserves original stored values; maps only for display / KPI vocabulary.
 * Never converts Weekly Ijtema Commitment into Attendance Present.
 */

export type BaitulMaalStoredStatus = 'Paid' | 'Pending' | 'Exempt' | string
export type BaitulMaalReportBucket =
  | 'contributed'
  | 'pending'
  | 'exempt'
  | 'campaign_committed'
  | 'campaign_discussed'
  | 'other'

export type IjtemaLegacyReportKind = 'commitment' | 'attendance_like' | 'other'

function isIjtemaCampaignCommitmentRemarks(remarks?: string | null): boolean {
  const value = (remarks ?? '').trim().toLowerCase()
  if (!value) return false
  return (
    value.includes('campaign: committed') ||
    value.includes('campaign: discussed') ||
    value.includes('campaign: not discussed') ||
    value.includes('campaign: not interested') ||
    value.includes('campaign: deferred') ||
    value.includes('campaign: invited') ||
    value.includes('campaign: not invited') ||
    value.includes('campaign: excused')
  )
}

/** Map legacy BM fields for report labels without mutating storage. */
export function classifyBaitulMaalStoredRecord(input: {
  status?: BaitulMaalStoredStatus
  remarks?: string | null
}): {
  bucket: BaitulMaalReportBucket
  label: string
  /** Canonical cycle mark equivalent when justified for the BM contribution track. */
  canonicalContributionEquivalent: 'Contributed' | 'Pending' | null
} {
  const status = String(input.status ?? '').trim()
  const remarks = String(input.remarks ?? '').trim()
  const remarksLower = remarks.toLowerCase()

  if (status === 'Paid') {
    return {
      bucket: 'contributed',
      label: 'Paid (legacy) → Contributed',
      canonicalContributionEquivalent: 'Contributed',
    }
  }
  if (status === 'Exempt') {
    return {
      bucket: 'exempt',
      label: 'Exempt',
      canonicalContributionEquivalent: null,
    }
  }
  if (remarksLower.includes('campaign: committed') || /\bcommitted\b/.test(remarksLower)) {
    return {
      bucket: 'campaign_committed',
      label: 'Campaign: Committed',
      canonicalContributionEquivalent: 'Contributed',
    }
  }
  if (remarksLower.includes('campaign: discussed') || /\bdiscussed\b/.test(remarksLower)) {
    return {
      bucket: 'campaign_discussed',
      label: 'Campaign: Discussed',
      canonicalContributionEquivalent: 'Pending',
    }
  }
  if (status === 'Pending' || status === 'Contributed') {
    return {
      bucket: status === 'Contributed' ? 'contributed' : 'pending',
      label: status,
      canonicalContributionEquivalent: status === 'Contributed' ? 'Contributed' : 'Pending',
    }
  }
  return {
    bucket: 'other',
    label: status || 'Unknown',
    canonicalContributionEquivalent: null,
  }
}

/**
 * Classify a legacy ijtema_* row for Admin reporting.
 * Campaign remarks → commitment; plain Present/Absent/Excused → attendance-like.
 * Does NOT treat Campaign:Committed/Discussed as Attendance Present.
 */
export function classifyIjtemaLegacyRecord(input: {
  status?: string
  remarks?: string | null
}): {
  kind: IjtemaLegacyReportKind
  label: string
} {
  if (isIjtemaCampaignCommitmentRemarks(input.remarks)) {
    return {
      kind: 'commitment',
      label: String(input.remarks ?? 'Commitment').trim() || 'Commitment',
    }
  }
  const status = String(input.status ?? '').trim()
  if (status === 'Present' || status === 'Absent' || status === 'Excused' || status === 'Reminded') {
    return { kind: 'attendance_like', label: status }
  }
  return { kind: 'other', label: status || 'Unknown' }
}
