/**
 * Campaign identity — presentation-only copy for the Campaign Operating System
 * experience. This is UI messaging (headline, motto, values), not business data.
 * All operational numbers continue to come from the campaign engines/services.
 */

export const CAMPAIGN_HEADLINE = 'فعال کارکن، فعال جماعت'

export const CAMPAIGN_MOTTO_LINES = [
  'ہر کارکن تک رسائی،',
  'ہر دل سے تعلق،',
  'ہر کارکن کو جماعتی عمل میں فعال بنانا۔',
] as const

export const CAMPAIGN_DESCRIPTION =
  'This campaign focuses on reconnecting every existing Karkun, understanding their current situation, and integrating them back into Jamaat work.'

export type CampaignValue = {
  id: string
  icon: string
  title: string
  subtitle: string
  accent: 'emerald' | 'rose' | 'lime' | 'gold'
}

export const CAMPAIGN_VALUES: CampaignValue[] = [
  {
    id: 'rabta',
    icon: '🤝',
    title: 'رابطہ',
    subtitle: 'ہر کارکن تک رسائی',
    accent: 'emerald',
  },
  {
    id: 'tafheem',
    icon: '❤️',
    title: 'تفہیم',
    subtitle: 'کارکن کو سمجھیں',
    accent: 'rose',
  },
  {
    id: 'faaliyat',
    icon: '🌱',
    title: 'فعالیت',
    subtitle: 'کارکن کو جماعتی عمل میں شامل کریں',
    accent: 'lime',
  },
  {
    id: 'istiqamat',
    icon: '🚩',
    title: 'استقامت',
    subtitle: 'مسلسل رابطہ برقرار رکھیں',
    accent: 'gold',
  },
]
