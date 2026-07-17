import {
  DEFAULT_MESSAGE_TEMPLATES,
  OFFICIAL_WHATSAPP_TEMPLATES,
} from '@/data/communication/defaultTemplates'
import type {
  AutomationRule,
  CommunicationDashboardMetrics,
  CommunicationHistoryRecord,
  MessageTemplate,
  ScheduledMessage,
  WhatsAppSettings,
} from '@/types/communication'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

type CommunicationPersistedState = {
  templates: MessageTemplate[]
  history: CommunicationHistoryRecord[]
  automationRules: AutomationRule[]
  scheduledMessages: ScheduledMessage[]
  whatsappSettings: WhatsAppSettings
}

function createDefaultAutomationRules(): AutomationRule[] {
  const timestamp = new Date().toISOString()
  const base = (
    id: string,
    name: string,
    trigger: AutomationRule['trigger'],
    templateId: string,
    description: string,
    delayDays?: number,
  ): AutomationRule => ({
    id,
    name,
    trigger,
    templateId,
    channel: 'whatsapp',
    delayDays,
    isEnabled: false,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  return [
    base('rule-assignment', 'Connection Created', 'assignment-created', 'tpl-welcome', 'Welcome when a new connection is confirmed.'),
    base('rule-first-meeting', 'First Meeting Pending', 'first-meeting-pending', 'tpl-visit-reminder', 'Reminder after 3 days if first meeting is pending.', 3),
    base('rule-ijtema', 'Ijtema Tomorrow', 'ijtema-tomorrow', 'tpl-ijtema', 'Reminder sent the day before Weekly Ijtema.'),
    base('rule-monthly', 'JIH Registration Pending', 'monthly-report-pending', 'tpl-jih-registration', 'Reminder when JIH registration is pending.'),
    base('rule-baitul', 'Bait-ul-Maal Due', 'baitul-maal-due', 'tpl-baitul-maal', 'Reminder when Bait-ul-Maal contribution is due.'),
    base('rule-follow-up', 'Follow-up Tomorrow', 'follow-up-tomorrow', 'tpl-development-follow-up', 'Reminder for follow-ups scheduled tomorrow.'),
    base('rule-milestone', 'Campaign Milestone', 'campaign-milestone', 'tpl-campaign-announcement', 'Announcement when a campaign milestone is reached.'),
  ]
}

/** Merge official library with persisted custom/admin edits; preserve archive flags. */
export function mergeOfficialTemplates(persisted: MessageTemplate[]): MessageTemplate[] {
  const obsoleteDefaultIds = new Set([
    'tpl-assignment',
    'tpl-first-contact',
    'tpl-meeting-reminder',
    'tpl-monthly-report',
    'tpl-follow-up',
    'tpl-campaign-update',
    'tpl-greeting',
    'tpl-emergency',
  ])

  const byId = new Map(
    persisted
      .filter((template) => !obsoleteDefaultIds.has(template.id))
      .map((template) => [template.id, template]),
  )
  const result: MessageTemplate[] = []

  for (const official of OFFICIAL_WHATSAPP_TEMPLATES) {
    const existing = byId.get(official.id)
    if (existing) {
      result.push({
        ...official,
        // Prefer admin-edited body/name/category when updatedBy is not System
        name: existing.updatedBy !== 'System' ? existing.name : official.name,
        body: existing.updatedBy !== 'System' ? existing.body : official.body,
        category: existing.updatedBy !== 'System' ? existing.category : official.category,
        variables:
          existing.updatedBy !== 'System' ? existing.variables : official.variables,
        isActive: existing.isActive,
        isOfficial: true,
        footerMode: existing.footerMode ?? official.footerMode,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        updatedBy: existing.updatedBy,
      })
      byId.delete(official.id)
    } else {
      result.push(official)
    }
  }

  for (const remaining of byId.values()) {
    result.push(remaining)
  }

  return result
}

const defaultWhatsAppSettings: WhatsAppSettings = {
  businessName: 'Karkun Connect',
  phoneNumber: 'Not configured',
  phoneNumberId: '—',
  webhookStatus: 'pending',
  apiStatus: 'disconnected',
  tokenStatus: 'missing',
  tokenMasked: '••••••••••••',
}

const defaultState: CommunicationPersistedState = {
  templates: [...DEFAULT_MESSAGE_TEMPLATES],
  history: [],
  automationRules: createDefaultAutomationRules(),
  scheduledMessages: [],
  whatsappSettings: defaultWhatsAppSettings,
}

const persisted = unwrapRepository(
  getRepositories().communication.loadState(defaultState),
  defaultState,
)

type CommunicationStoreListener = () => void

const listeners = new Set<CommunicationStoreListener>()

const templates: MessageTemplate[] = mergeOfficialTemplates(persisted.templates)
const history: CommunicationHistoryRecord[] = [...persisted.history]
const automationRules: AutomationRule[] = [...persisted.automationRules]
const scheduledMessages: ScheduledMessage[] = [...persisted.scheduledMessages]
const whatsappSettings: WhatsAppSettings = { ...persisted.whatsappSettings }

function persistCommunicationStore(): void {
  getRepositories().communication.saveState({
    templates,
    history,
    automationRules,
    scheduledMessages,
    whatsappSettings,
  })
}

export function subscribeToCommunicationStore(listener: CommunicationStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyCommunicationStoreChange(): void {
  persistCommunicationStore()
  listeners.forEach((listener) => listener())
}

export function getAllTemplates(): MessageTemplate[] {
  return [...templates]
}

export function getTemplateById(id: string): MessageTemplate | undefined {
  return templates.find((template) => template.id === id)
}

export function upsertTemplate(template: MessageTemplate): MessageTemplate {
  const index = templates.findIndex((item) => item.id === template.id)
  if (index >= 0) {
    templates[index] = template
  } else {
    templates.unshift(template)
  }
  notifyCommunicationStoreChange()
  return template
}

export function appendHistoryRecord(record: CommunicationHistoryRecord): CommunicationHistoryRecord {
  history.unshift(record)
  notifyCommunicationStoreChange()
  return record
}

export function getCommunicationHistory(): CommunicationHistoryRecord[] {
  return [...history]
}

export function getFailedMessages(): CommunicationHistoryRecord[] {
  return history.filter((record) => record.status === 'failed')
}

export function getAutomationRules(): AutomationRule[] {
  return [...automationRules]
}

export function updateAutomationRule(rule: AutomationRule): AutomationRule {
  const index = automationRules.findIndex((item) => item.id === rule.id)
  if (index >= 0) {
    automationRules[index] = rule
    notifyCommunicationStoreChange()
  }
  return rule
}

export function getScheduledMessages(): ScheduledMessage[] {
  return [...scheduledMessages]
}

export function addScheduledMessage(message: ScheduledMessage): ScheduledMessage {
  scheduledMessages.unshift(message)
  notifyCommunicationStoreChange()
  return message
}

export function cancelScheduledMessage(id: string): void {
  const index = scheduledMessages.findIndex((item) => item.id === id)
  if (index >= 0) {
    scheduledMessages[index] = { ...scheduledMessages[index], status: 'cancelled' }
    notifyCommunicationStoreChange()
  }
}

export function getWhatsAppSettings(): WhatsAppSettings {
  return { ...whatsappSettings }
}

export function updateWhatsAppSettings(updates: Partial<WhatsAppSettings>): WhatsAppSettings {
  Object.assign(whatsappSettings, updates)
  notifyCommunicationStoreChange()
  return { ...whatsappSettings }
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

export function getCommunicationDashboardMetrics(): CommunicationDashboardMetrics {
  const todayRecords = history.filter((record) => isToday(record.sentAt))
  const templateCounts = new Map<string, { name: string; count: number }>()

  for (const record of history) {
    if (!record.templateId) continue
    const current = templateCounts.get(record.templateId) ?? {
      name: record.templateName ?? record.templateId,
      count: 0,
    }
    current.count += 1
    templateCounts.set(record.templateId, current)
  }

  const topTemplates = [...templateCounts.entries()]
    .map(([templateId, value]) => ({
      templateId,
      templateName: value.name,
      count: value.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    messagesToday: todayRecords.length,
    delivered: history.filter((r) => r.status === 'delivered' || r.status === 'read').length,
    read: history.filter((r) => r.status === 'read').length,
    pending: history.filter((r) => r.status === 'queued' || r.status === 'pending').length,
    failed: history.filter((r) => r.status === 'failed').length,
    scheduled: scheduledMessages.filter((m) => m.status === 'scheduled').length,
    topTemplates,
  }
}

export function reloadCommunicationStoreFromPersistence(): void {
  const loaded = unwrapRepository(
    getRepositories().communication.loadState(defaultState),
    defaultState,
  )
  templates.length = 0
  templates.push(...mergeOfficialTemplates(loaded.templates))
  history.length = 0
  history.push(...loaded.history)
  automationRules.length = 0
  automationRules.push(...loaded.automationRules)
  scheduledMessages.length = 0
  scheduledMessages.push(...loaded.scheduledMessages)
  Object.assign(whatsappSettings, loaded.whatsappSettings)
  listeners.forEach((listener) => listener())
}

export function clearCommunicationStore(): void {
  templates.length = 0
  templates.push(...DEFAULT_MESSAGE_TEMPLATES)
  history.length = 0
  automationRules.length = 0
  automationRules.push(...createDefaultAutomationRules())
  scheduledMessages.length = 0
  Object.assign(whatsappSettings, defaultWhatsAppSettings)
  getRepositories().communication.clear()
  notifyCommunicationStoreChange()
}
