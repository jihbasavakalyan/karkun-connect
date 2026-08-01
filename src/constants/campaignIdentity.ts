/**
 * Campaign identity — presentation-only copy for the Campaign Operating System
 * experience. This is UI messaging (headline, motto, values), not business data.
 * All operational numbers continue to come from the campaign engines/services.
 */

export const CAMPAIGN_HEADLINE = 'فعال کارکن، فعال جماعت'

/** Original approved end before KC-038 extension (informational). */
export const CAMPAIGN_ORIGINAL_END_DATE = '2026-08-02'

/** Official extended campaign end (KC-038). */
export const CAMPAIGN_EXTENDED_END_DATE = '2026-08-09'

export const CAMPAIGN_EXTENSION_ANNOUNCEMENT_TITLE_UR = '📢 اہم اعلان'

export const CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR =
  'مرکزی مہم "فعال کارکن، فعال جماعت" کی مدت میں توسیع کرتے ہوئے اب یہ مہم 9 اگست 2026 تک جاری رہے گی۔'

/** Extended-period operational goals — display only; no duplicate KPI engines. */
export const CAMPAIGN_EXTENDED_OBJECTIVES_UR = [
  'باقی کارکنوں کی تکمیل',
  'تمام ملاقاتوں کی تکمیل',
  'ہفتہ وار اجتماع میں مؤثر شرکت',
  'بیت المال کے عزم اور ادائیگی کی تکمیل',
  'JIH Reporting App رجسٹریشن',
  'متفقین کی فہرست کی تکمیل',
  'مسلسل فالو اپ',
] as const

export function isCampaignEndExtended(endDate: string | undefined | null): boolean {
  if (!endDate) return false
  return endDate > CAMPAIGN_ORIGINAL_END_DATE
}

export const CAMPAIGN_MOTTO_LINES = [
  'ہر کارکن تک رسائی،',
  'ہر دل سے تعلق،',
  'ہر کارکن کو جماعتی عمل میں فعال بنانا۔',
] as const

export const CAMPAIGN_DESCRIPTION =
  'This campaign focuses on reconnecting every existing Karkun, understanding their current situation, and integrating them back into Jamaat work.'

import type { IconName } from '@/design-system/iconNames'

export type CampaignValue = {
  id: string
  icon: IconName
  title: string
  subtitle: string
  accent: 'emerald' | 'rose' | 'lime' | 'gold'
}

export const CAMPAIGN_VALUES: CampaignValue[] = [
  {
    id: 'rabta',
    icon: 'handshake',
    title: 'رابطہ',
    subtitle: 'ہر کارکن تک رسائی',
    accent: 'emerald',
  },
  {
    id: 'tafheem',
    icon: 'heart',
    title: 'تفہیم',
    subtitle: 'کارکن کو سمجھیں',
    accent: 'rose',
  },
  {
    id: 'faaliyat',
    icon: 'sprout',
    title: 'فعالیت',
    subtitle: 'کارکن کو جماعتی عمل میں شامل کریں',
    accent: 'lime',
  },
  {
    id: 'istiqamat',
    icon: 'flag',
    title: 'استقامت',
    subtitle: 'مسلسل رابطہ برقرار رکھیں',
    accent: 'gold',
  },
]
