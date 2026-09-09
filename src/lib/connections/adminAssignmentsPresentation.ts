/**
 * Increment 06 — Admin باہمی ربط workspace view (presentation only).
 * Canonical route remains `/admin/assignments`. Desk is Manage; Mapping is default.
 */

export type AdminAssignmentsWorkspaceView = 'mapping' | 'manage'

/**
 * Mapping is the default landing.
 * Manage opens when the operator asks for it (`view=manage` or legacy `view=assign`)
 * or when a Rukn is already in context (`?rukn=`), so Open Connection lands on the desk.
 */
export function resolveAdminAssignmentsView(
  params: URLSearchParams,
): AdminAssignmentsWorkspaceView {
  const view = params.get('view')
  if (view === 'mapping') return 'mapping'
  if (view === 'manage' || view === 'assign') return 'manage'
  if (params.get('rukn')?.trim()) return 'manage'
  return 'mapping'
}
