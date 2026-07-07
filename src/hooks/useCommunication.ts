import { useEffect, useState } from 'react'
import { subscribeToCommunicationStore } from '@/stores/communicationStore'
import {
  getCommunicationMetrics,
  getWhatsAppConfiguration,
  sendBroadcastMessage,
  sendIndividualMessage,
  testWhatsAppConnection,
} from '@/services/communicationService'
import { getMessageHistory, getRecentCommunicationActivity } from '@/services/historyService'
import { listTemplates } from '@/services/templateService'
import { getAutomationRules } from '@/stores/communicationStore'
import { getScheduledMessages } from '@/stores/communicationStore'

export function useCommunication() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToCommunicationStore(() => setVersion((current) => current + 1))
  }, [])

  void version

  return {
    version,
    metrics: getCommunicationMetrics(),
    templates: listTemplates(),
    history: getMessageHistory(),
    recentActivity: getRecentCommunicationActivity(),
    automationRules: getAutomationRules(),
    scheduledMessages: getScheduledMessages(),
    whatsappSettings: getWhatsAppConfiguration(),
    sendIndividualMessage,
    sendBroadcastMessage,
    testWhatsAppConnection,
  }
}
