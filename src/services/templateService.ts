import {
  getAllTemplates,
  getTemplateById,
  upsertTemplate,
} from '@/stores/communicationStore'
import type { MessageTemplate, TemplateCategory } from '@/types/communication'

export function listTemplates(category?: TemplateCategory): MessageTemplate[] {
  const all = getAllTemplates()
  if (!category) {
    return all
  }
  return all.filter((template) => template.category === category)
}

export function getTemplate(id: string): MessageTemplate | undefined {
  return getTemplateById(id)
}

export function saveTemplate(
  input: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  updatedBy = 'Administrator',
): MessageTemplate {
  const existing = input.id ? getTemplateById(input.id) : undefined
  const timestamp = new Date().toISOString()

  const template: MessageTemplate = {
    id: input.id ?? `tpl-${Date.now()}`,
    name: input.name.trim(),
    category: input.category,
    subject: input.subject,
    body: input.body.trim(),
    variables: input.variables,
    isActive: input.isActive,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    updatedBy,
  }

  if (!template.name) {
    throw new Error('Template name is required.')
  }
  if (!template.body) {
    throw new Error('Template body is required.')
  }

  return upsertTemplate(template)
}

export function applyTemplateVariables(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`)
}

export function extractTemplateVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? []
  return [...new Set(matches.map((match) => match.replace(/\{\{|\}\}/g, '')))]
}
