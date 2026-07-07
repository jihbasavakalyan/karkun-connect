import type { MessageTemplate, TemplateCategory } from '@/types/communication'

const now = new Date().toISOString()

function template(
  id: string,
  name: string,
  category: TemplateCategory,
  body: string,
  variables: string[],
): MessageTemplate {
  return {
    id,
    name,
    category,
    body,
    variables,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'System',
  }
}

/**
 * Default template library — editable by administrators via Template Management.
 * Loaded into the communication store at startup; not embedded in UI components.
 */
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  template(
    'tpl-assignment',
    'Assignment Notification',
    'assignments',
    'Assalamu Alaikum {{name}}, you have been assigned to Rukn {{ruknName}}. Assignment: {{assignmentNumber}}. JazakAllah.',
    ['name', 'ruknName', 'assignmentNumber'],
  ),
  template(
    'tpl-first-contact',
    'First Contact',
    'first-contact',
    'Assalamu Alaikum {{name}}, this is your Rukn from the campaign team. We look forward to connecting with you soon.',
    ['name'],
  ),
  template(
    'tpl-meeting-reminder',
    'Meeting Reminder',
    'meeting-reminder',
    'Reminder: Your meeting with {{ruknName}} is scheduled for {{date}}. Please confirm your availability.',
    ['ruknName', 'date'],
  ),
  template(
    'tpl-ijtema',
    'Weekly Ijtema Reminder',
    'weekly-ijtema',
    'Assalamu Alaikum {{name}}, reminder for tomorrow\'s Weekly Ijtema. Your presence is requested.',
    ['name'],
  ),
  template(
    'tpl-monthly-report',
    'Monthly Report Reminder',
    'monthly-report',
    'Assalamu Alaikum {{name}}, your monthly JIH portal report is pending. Please submit at your earliest convenience.',
    ['name'],
  ),
  template(
    'tpl-baitul-maal',
    'Bait-ul-Maal Reminder',
    'baitul-maal',
    'Assalamu Alaikum {{name}}, this is a gentle reminder regarding Bait-ul-Maal contribution for this month.',
    ['name'],
  ),
  template(
    'tpl-follow-up',
    'Follow-up Reminder',
    'follow-up',
    'Assalamu Alaikum {{name}}, following up on our previous discussion. {{purpose}} — scheduled for {{date}}.',
    ['name', 'purpose', 'date'],
  ),
  template(
    'tpl-campaign-update',
    'Campaign Update',
    'campaign-update',
    'Campaign Update: {{headline}}. {{details}}',
    ['headline', 'details'],
  ),
  template(
    'tpl-greeting',
    'Eid Greeting',
    'greetings',
    'Eid Mubarak {{name}}! Wishing you and your family peace and blessings.',
    ['name'],
  ),
  template(
    'tpl-emergency',
    'Emergency Alert',
    'emergency',
    'URGENT: {{message}}. Please respond as soon as possible.',
    ['message'],
  ),
]
