export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN: '/admin',
  ADMIN_CAMPAIGN: '/admin/campaign',
  ADMIN_CAMPAIGNS: '/admin/campaign',
  ADMIN_CAMPAIGN_SETUP: '/admin/campaign/setup',
  ADMIN_RUKN: '/admin/rukn',
  ADMIN_KARKUN: '/admin/karkun',
  ADMIN_ASSIGNMENTS: '/admin/assignments',
  ADMIN_KARKUNAN: '/admin/karkun',
  ADMIN_RUKN_MASTER: '/admin/rukn',
  ADMIN_EXECUTION: '/admin/execution',
  ADMIN_REVIEW: '/admin/review',
  ADMIN_FOLLOW_UP: '/admin/follow-up',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_HELP: '/admin/help',
  RUKN: '/rukn',
  RUKN_AVAILABLE_KARKUN: '/rukn/available-karkun',
  RUKN_MY_KARKUN: '/rukn/my-karkun',
  RUKN_CAMPAIGN_RECORD: '/rukn/campaign-record',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function ruknVisitPath(karkunId: string): string {
  return `${ROUTES.RUKN}/visit/${karkunId}`
}

export function adminKarkunProfilePath(karkunId: string): string {
  return `${ROUTES.ADMIN_KARKUN}/${karkunId}`
}

export function adminRuknDetailPath(ruknId: string): string {
  return `${ROUTES.ADMIN_RUKN}/${ruknId}`
}
