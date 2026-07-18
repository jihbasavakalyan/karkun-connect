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
  ADMIN_COMPLIANCE: '/admin/compliance',
  /** Legacy path — redirects to Execution Reports tab */
  ADMIN_REVIEW: '/admin/review',
  ADMIN_FOLLOW_UP: '/admin/follow-up',
  ADMIN_COMMUNICATION: '/admin/communication',
  ADMIN_LISTS: '/admin/lists',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_HELP: '/admin/help',
  /** KC-029 — DEV/admin runtime diagnostics (gated by feature flag). */
  ADMIN_RUNTIME_DEBUG: '/admin/debug/runtime',
  RUKN: '/rukn',
  RUKN_AVAILABLE_KARKUN: '/rukn/available-karkun',
  RUKN_MY_KARKUN: '/rukn/my-karkun',
  RUKN_CAMPAIGN_RECORD: '/rukn/campaign-record',
  RUKN_SETTINGS: '/rukn/settings',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function ruknVisitPath(karkunId: string): string {
  return `${ROUTES.RUKN}/visit/${karkunId}`
}

export function adminAnnexure1Path(karkunId: string): string {
  return `${ROUTES.ADMIN}/annexure-1/${karkunId}`
}

export function adminKarkunProfilePath(karkunId: string): string {
  return `${ROUTES.ADMIN_KARKUN}/${karkunId}`
}

export function adminRuknDetailPath(ruknId: string): string {
  return `${ROUTES.ADMIN_RUKN}/${ruknId}`
}

export function adminAssignmentsPath(options?: {
  ruknId?: string
  view?: 'assign' | 'mapping'
}): string {
  const params = new URLSearchParams()
  if (options?.ruknId) {
    params.set('rukn', options.ruknId)
  }
  if (options?.view) {
    params.set('view', options.view)
  }
  const query = params.toString()
  return query ? `${ROUTES.ADMIN_ASSIGNMENTS}?${query}` : ROUTES.ADMIN_ASSIGNMENTS
}

export function adminExecutionPath(section?: string): string {
  return section ? `${ROUTES.ADMIN_EXECUTION}?section=${section}` : ROUTES.ADMIN_EXECUTION
}

export function adminCompliancePath(section?: string, status?: string): string {
  const params = new URLSearchParams()
  if (section) {
    params.set('section', section)
  }
  if (status) {
    params.set('status', status)
  }
  const query = params.toString()
  return query ? `${ROUTES.ADMIN_COMPLIANCE}?${query}` : ROUTES.ADMIN_COMPLIANCE
}

export function adminCommunicationPath(section?: string): string {
  return section ? `${ROUTES.ADMIN_COMMUNICATION}?section=${section}` : ROUTES.ADMIN_COMMUNICATION
}
