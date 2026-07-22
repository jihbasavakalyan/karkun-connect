export type CommunicationChannel = 'whatsapp' | 'sms' | 'email'

export type MessageDeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'pending'

export type MessageRecipientKind = 'karkun' | 'rukn'

export type TemplateCategory =
  | 'assignments'
  | 'first-contact'
  | 'meeting-reminder'
  | 'weekly-ijtema'
  | 'monthly-report'
  | 'baitul-maal'
  | 'follow-up'
  | 'campaign-update'
  | 'greetings'
  | 'emergency'
  | 'custom'
  | 'orientation'
  | 'development'
  | 'study'
  /** KC-0077.2 — Workflow Communication Playbook */
  | 'assignment-management'
  | 'execution-tracking'
  | 'reporting-compliance'
  | 'motivation-appreciation'
  | 'administrative'
  | 'personal-guidance'

/** Footer appended at send time — never editable by Rukn for official templates. */
export type TemplateFooterMode = 'personal' | 'official'

export type MessageTemplate = {
  id: string
  name: string
  category: TemplateCategory
  subject?: string
  body: string
  variables: string[]
  isActive: boolean
  /** Official Version 1 wording — Rukn may select/fill/preview/send only. */
  isOfficial?: boolean
  /**
   * Preferred footer for this template when role does not override.
   * Administrator sends always use `official` footer; Rukn uses `personal`.
   */
  footerMode?: TemplateFooterMode
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export type MessageRecipient = {
  personId: string
  personKind: MessageRecipientKind
  name: string
  mobile: string
  whatsapp?: string
}

export type SendIndividualMessageInput = {
  channel: CommunicationChannel
  recipient: MessageRecipient
  templateId?: string
  message: string
  linkedAssignmentId?: string
  linkedFollowUpId?: string
  linkedCampaignId?: string
}

export type SendBroadcastMessageInput = {
  channel: CommunicationChannel
  recipients: MessageRecipient[]
  templateId?: string
  message: string
  linkedCampaignId?: string
}

export type CommunicationHistoryRecord = {
  id: string
  channel: CommunicationChannel
  recipient: MessageRecipient
  templateId?: string
  templateName?: string
  message: string
  status: MessageDeliveryStatus
  sentAt: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  failureReason?: string
  retryCount: number
  linkedCampaignId?: string
  linkedAssignmentId?: string
  linkedFollowUpId?: string
  actor: string
}

export type CommunicationDashboardMetrics = {
  messagesToday: number
  delivered: number
  read: number
  pending: number
  failed: number
  scheduled: number
  topTemplates: { templateId: string; templateName: string; count: number }[]
}

export type AutomationTrigger =
  | 'assignment-created'
  | 'first-meeting-pending'
  | 'ijtema-tomorrow'
  | 'monthly-report-pending'
  | 'baitul-maal-due'
  | 'follow-up-tomorrow'
  | 'campaign-milestone'

export type AutomationRule = {
  id: string
  name: string
  trigger: AutomationTrigger
  templateId: string
  channel: CommunicationChannel
  delayDays?: number
  isEnabled: boolean
  description: string
  createdAt: string
  updatedAt: string
}

export type ScheduledMessage = {
  id: string
  channel: CommunicationChannel
  recipients: MessageRecipient[]
  templateId?: string
  message: string
  scheduledFor: string
  status: 'scheduled' | 'cancelled' | 'sent'
  createdAt: string
  createdBy: string
}

export type WhatsAppConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error'

export type WhatsAppSettings = {
  businessName: string
  phoneNumber: string
  phoneNumberId: string
  webhookStatus: WhatsAppConnectionStatus
  apiStatus: WhatsAppConnectionStatus
  tokenStatus: 'configured' | 'missing' | 'expired'
  tokenMasked: string
  lastConnectionTest?: string
  lastConnectionTestResult?: 'success' | 'failure'
}

export type CommunicationResult =
  | { success: true; historyId: string; status: MessageDeliveryStatus }
  | { success: false; error: string }

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  assignments: 'Connections',
  'first-contact': 'Welcome / First Contact',
  'meeting-reminder': 'Visit / Meeting',
  'weekly-ijtema': 'Weekly Ijtema',
  'monthly-report': 'JIH Registration',
  'baitul-maal': 'Bait-ul-Maal',
  'follow-up': 'Follow-up',
  'campaign-update': 'Campaign / Events',
  greetings: 'Greetings',
  emergency: 'Emergency',
  custom: 'Custom',
  orientation: 'Orientation',
  development: 'Development',
  study: 'Islamic Study',
  'assignment-management': 'Assignment Management',
  'execution-tracking': 'Execution Tracking',
  'reporting-compliance': 'Reporting & Compliance',
  'motivation-appreciation': 'Motivation & Appreciation',
  administrative: 'Administrative Communication',
  'personal-guidance': 'Personal Guidance',
}

/** KC-0077.2 — Workflow sections for Template Management (ordered). */
export const WORKFLOW_TEMPLATE_SECTIONS: {
  id: TemplateCategory
  label: string
  description: string
}[] = [
  {
    id: 'assignment-management',
    label: '1. Assignment Management',
    description: 'New assignments, transfers, and Amanah briefings for Rukns.',
  },
  {
    id: 'execution-tracking',
    label: '2. Execution Tracking',
    description: 'Gentle reminders for first contact, visits, and daily progress.',
  },
  {
    id: 'reporting-compliance',
    label: '3. Reporting & Compliance',
    description: 'Ijtema, annexure, and profile updates — explained with care.',
  },
  {
    id: 'motivation-appreciation',
    label: '4. Motivation & Appreciation',
    description: 'Recognition, milestones, and Islamic encouragement.',
  },
  {
    id: 'administrative',
    label: '5. Administrative Communication',
    description: 'Campaign lifecycle, meetings, training, and announcements.',
  },
  {
    id: 'personal-guidance',
    label: '6. Personal Guidance',
    description: 'Warm companion-style guidance for individual journeys.',
  },
]

export const TEMPLATE_PLACEHOLDER_KEYS = [
  'name',
  'date',
  'time',
  'venue',
  'event',
  'month',
  'campaign',
] as const

export type TemplatePlaceholderKey = (typeof TEMPLATE_PLACEHOLDER_KEYS)[number]

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  'assignment-created': 'Connection Created',
  'first-meeting-pending': 'First Meeting Pending',
  'ijtema-tomorrow': 'Ijtema Tomorrow',
  'monthly-report-pending': 'Monthly Report Pending',
  'baitul-maal-due': 'Bait-ul-Maal Due',
  'follow-up-tomorrow': 'Follow-up Tomorrow',
  'campaign-milestone': 'Campaign Milestone',
}
