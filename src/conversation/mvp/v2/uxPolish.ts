/**
 * Module 20 — UX Polish contracts
 * Skeleton / empty / error / transition metadata for VoiceDrawer.
 */

export type RafeeqUxState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'confirming'

export type RafeeqUxPolish = {
  readonly skeletonClass: string
  readonly transitionClass: string
  readonly emptyTitleUr: string
  readonly emptyBodyUr: string
  readonly errorTitleUr: string
  readonly errorRetryLabelUr: string
  readonly urduDir: 'rtl'
  readonly urduLang: 'ur'
  readonly responsiveDrawerClass: string
}

export const RAFEEQ_UX: RafeeqUxPolish = Object.freeze({
  skeletonClass: 'dr-skeleton',
  transitionClass: 'dr-conversation-transition',
  emptyTitleUr: 'گفتگو شروع کریں',
  emptyBodyUr: 'نام تلاش کریں، ڈیش بورڈ کھولیں، یا آج کی بریفنگ مانگیں۔',
  errorTitleUr: 'جواب نہیں مل سکا',
  errorRetryLabelUr: 'دوبارہ کوشش',
  urduDir: 'rtl',
  urduLang: 'ur',
  responsiveDrawerClass: 'dr-drawer-responsive',
})

export function resolveUxState(options: {
  loading: boolean
  error: boolean
  confirming: boolean
  messageCount: number
}): RafeeqUxState {
  if (options.error) return 'error'
  if (options.loading) return 'loading'
  if (options.confirming) return 'confirming'
  if (options.messageCount === 0) return 'empty'
  return 'ready'
}
