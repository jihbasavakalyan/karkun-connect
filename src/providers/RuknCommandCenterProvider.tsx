/**
 * KC-027F — Single Rukn command-center snapshot for the authenticated Rukn tree.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'

const RuknCommandCenterContext = createContext<RuknCommandCenterSnapshot | null>(null)

export function RuknCommandCenterProvider({ children }: { children: ReactNode }) {
  const ruknId = useRequiredRuknId() ?? ''
  const snapshot = useCampaignAutomationEngine({
    role: 'rukn',
    ruknId,
  }) as RuknCommandCenterSnapshot

  return (
    <RuknCommandCenterContext.Provider value={snapshot}>
      {children}
    </RuknCommandCenterContext.Provider>
  )
}

export function useRuknCommandCenter(): RuknCommandCenterSnapshot {
  const snapshot = useContext(RuknCommandCenterContext)
  if (!snapshot) {
    throw new Error('useRuknCommandCenter must be used within RuknCommandCenterProvider')
  }
  return snapshot
}

export function useOptionalRuknCommandCenter(): RuknCommandCenterSnapshot | null {
  return useContext(RuknCommandCenterContext)
}
