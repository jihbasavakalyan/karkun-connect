/**
 * Administrator Dashboard Assistant panel (KC-006 Sprint 6.2).
 *
 * Renders only when digitalRafeeq.enabled is true and runtime content is available.
 * When disabled or unavailable, returns null — dashboard behaviour is unchanged.
 */

import { AdminAssistantCard } from './AdminAssistantCard'
import { useAdminAssistant } from './AdminAssistantHooks'

export function AdminAssistantPanel() {
  const { enabled, loading, viewModel } = useAdminAssistant()

  if (!enabled) {
    return null
  }

  if (viewModel.visibility === 'hidden' && !loading) {
    return null
  }

  return <AdminAssistantCard viewModel={viewModel} loading={loading} />
}
