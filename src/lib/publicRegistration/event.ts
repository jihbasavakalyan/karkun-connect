/** Bounded operational event for the 13 Sep 2026 training gathering. Not a Programme Master. */

export const TRAINING_GATHERING_EVENT = {
  id: 'training-gathering-2026-09-13',
  campaignTitleUrdu: 'فعال کارکن، فعال رکن، فعال جماعت',
  eventTitleUrdu: 'ایک روزہ تربیتی اجتماع',
  dateLabel: '13 September 2026 • Sunday',
  dateUrdu: '13 ستمبر 2026 • بروز اتوار',
  venue: 'RG Palace Function Hall',
  city: 'Basavakalyan',
  feeInr: 100,
} as const

export type TrainingGatheringEventId = typeof TRAINING_GATHERING_EVENT.id

export function formatRegistrationId(mobile10: string): string {
  return `TG260913-${mobile10}`
}
