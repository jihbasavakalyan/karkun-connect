/**
 * KC-027F — Single admin command-center snapshot for the authenticated admin tree.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

const AdminCommandCenterContext = createContext<AdminCommandCenterSnapshot | null>(null)

export function AdminCommandCenterProvider({ children }: { children: ReactNode }) {
  const snapshot = useCampaignAutomationEngine({
    role: 'administrator',
  }) as AdminCommandCenterSnapshot

  return (
    <AdminCommandCenterContext.Provider value={snapshot}>
      {children}
    </AdminCommandCenterContext.Provider>
  )
}

export function useAdminCommandCenter(): AdminCommandCenterSnapshot {
  const snapshot = useContext(AdminCommandCenterContext)
  if (!snapshot) {
    throw new Error('useAdminCommandCenter must be used within AdminCommandCenterProvider')
  }
  return snapshot
}

export function useOptionalAdminCommandCenter(): AdminCommandCenterSnapshot | null {
  return useContext(AdminCommandCenterContext)
}
