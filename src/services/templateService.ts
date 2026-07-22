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
 * Replace {name} / {{Name}} / {{Today'sDate}} placeholders.
 * KC-0077.1 — unresolved placeholders render as "-" (never leave raw tokens).
 */
export function applyTemplateVariables(
  body: string,
  variables: Record<string, string>,
): string {
  const FALLBACK = '-'

  const resolve = (rawKey: string): string => {
    if (Object.prototype.hasOwnProperty.call(variables, rawKey)) {
      const value = variables[rawKey]
      if (typeof value === 'string' && value.trim()) return value
      if (value === '') return FALLBACK
    }
    // Case-insensitive lookup for {{karkunname}} vs {{KarkunName}}
    const lower = rawKey.toLowerCase()
    for (const [key, value] of Object.entries(variables)) {
      if (key.toLowerCase() === lower && typeof value === 'string' && value.trim()) {
        return value
      }
    }
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`[mail-merge] unresolved placeholder: ${rawKey}`)
    }
    return FALLBACK
  }

  return body
    .replace(/\{\{([A-Za-z][\w']*)\}\}/g, (_, key: string) => resolve(key))
    .replace(/(?<!\{)\{([A-Za-z][\w']*)\}(?!\})/g, (_, key: string) => resolve(key))
}

export function extractTemplateVariables(body: string): string[] {
  const keys = new Set<string>()
  for (const match of body.matchAll(/\{\{([A-Za-z][\w']*)\}\}/g)) {
    keys.add(match[1]!)
  }
  for (const match of body.matchAll(/(?<!\{)\{([A-Za-z][\w']*)\}(?!\})/g)) {
    keys.add(match[1]!)
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
