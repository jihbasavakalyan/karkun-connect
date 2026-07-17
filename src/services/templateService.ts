import {
  getAllTemplates,
  getTemplateById,
  upsertTemplate,
} from '@/stores/communicationStore'
import { getMessageFooter } from '@/data/communication/defaultTemplates'
import type {
  MessageTemplate,
  TemplateCategory,
  TemplateFooterMode,
} from '@/types/communication'

export type ListTemplatesOptions = {
  category?: TemplateCategory
  /** When true, include archived (isActive === false). Default false. */
  includeArchived?: boolean
}

export function listTemplates(
  categoryOrOptions?: TemplateCategory | ListTemplatesOptions,
): MessageTemplate[] {
  const options: ListTemplatesOptions =
    typeof categoryOrOptions === 'string'
      ? { category: categoryOrOptions }
      : (categoryOrOptions ?? {})

  let all = getAllTemplates()
  if (!options.includeArchived) {
    all = all.filter((template) => template.isActive !== false)
  }
  if (options.category) {
    all = all.filter((template) => template.category === options.category)
  }
  return all
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
    variables: input.variables.length
      ? input.variables
      : extractTemplateVariables(input.body),
    isActive: input.isActive,
    isOfficial: input.isOfficial ?? existing?.isOfficial ?? false,
    footerMode: input.footerMode ?? existing?.footerMode ?? 'personal',
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

/** Soft-archive — preserves history references; hidden from send pickers. */
export function archiveTemplate(id: string, updatedBy = 'Administrator'): MessageTemplate {
  const existing = getTemplateById(id)
  if (!existing) {
    throw new Error('Template not found.')
  }
  return upsertTemplate({
    ...existing,
    isActive: false,
    updatedAt: new Date().toISOString(),
    updatedBy,
  })
}

export function restoreTemplate(id: string, updatedBy = 'Administrator'): MessageTemplate {
  const existing = getTemplateById(id)
  if (!existing) {
    throw new Error('Template not found.')
  }
  return upsertTemplate({
    ...existing,
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy,
  })
}

/**
 * Replace {name} and {{name}} placeholders.
 * Unresolved placeholders are left blank for WhatsApp cleanliness.
 */
export function applyTemplateVariables(
  body: string,
  variables: Record<string, string>,
): string {
  return body
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
    .replace(/(?<!\{)\{(\w+)\}(?!\})/g, (_, key: string) => variables[key] ?? '')
}

export function extractTemplateVariables(body: string): string[] {
  const keys = new Set<string>()
  for (const match of body.matchAll(/\{\{(\w+)\}\}/g)) {
    keys.add(match[1])
  }
  for (const match of body.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)) {
    keys.add(match[1])
  }
  return [...keys]
}

export function resolveFooterMode(role: 'administrator' | 'rukn'): TemplateFooterMode {
  return role === 'administrator' ? 'official' : 'personal'
}

/** Apply placeholders then append the role-appropriate footer. */
export function composeWhatsAppMessage(
  body: string,
  variables: Record<string, string>,
  footerMode: TemplateFooterMode,
): string {
  const filled = applyTemplateVariables(body, variables).trim()
  const footer = getMessageFooter(footerMode)
  if (!filled) return footer
  return `${filled}\n\n${footer}`
}
