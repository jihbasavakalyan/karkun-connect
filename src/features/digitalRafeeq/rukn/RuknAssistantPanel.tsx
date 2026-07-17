/**
 * Rukn Home Assistant panel (KC-006 Sprint 6.3).
 *
 * Renders only when digitalRafeeq.enabled is true and runtime content is available.
 * When disabled or unavailable, returns null — Home page behaviour is unchanged.
 */

import { RuknAssistantCard } from './RuknAssistantCard'
import { useRuknAssistant } from './RuknAssistantHooks'

export function RuknAssistantPanel() {
  const { enabled, loading, viewModel } = useRuknAssistant()

  if (!enabled) {
    return null
  }

  if (viewModel.visibility === 'hidden' && !loading) {
    return null
  }

  return <RuknAssistantCard viewModel={viewModel} loading={loading} />
}
