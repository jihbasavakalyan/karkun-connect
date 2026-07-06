export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN: '/admin',
  ADMIN_CAMPAIGNS: '/admin/campaigns',
  ADMIN_CAMPAIGN_SETUP: '/admin/campaign/setup',
  ADMIN_KARKUNAN: '/admin/karkunan',
  RUKN: '/rukn',
  RUKN_CAMPAIGN_RECORD: '/rukn/campaign-record',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function ruknVisitPath(karkunId: string): string {
  return `${ROUTES.RUKN}/visit/${karkunId}`
}
