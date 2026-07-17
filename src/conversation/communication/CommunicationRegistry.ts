/**
 * Communication template registry (KC-004 Sprint 1.4).
 *
 * Purpose: Discover templates without scattered switch statements.
 * Ownership: Registry holds template metadata; Communication Engine selects entries.
 * Extension points: Localization packs register alternate keys per locale.
 * Future localization strategy: Locale-specific template overrides register with higher priority.
 */

import type { CommunicationChannel, TemplateCategory } from './CommunicationTypes'
import {
  DEFAULT_COMMUNICATION_TEMPLATES,
  type CommunicationTemplate,
} from './CommunicationTemplates'

export type TemplateLookupKey =
  | 'localizationKey'
  | 'templateKey'
  | 'category'

export class CommunicationRegistry {
  private readonly byTemplateKey = new Map<string, CommunicationTemplate>()
  private readonly byLocalizationKey = new Map<string, CommunicationTemplate>()
  private readonly byCategory = new Map<TemplateCategory, CommunicationTemplate[]>()

  register(template: CommunicationTemplate): () => void {
    this.byTemplateKey.set(template.templateKey, template)
    this.byLocalizationKey.set(template.localizationKey, template)

    const categoryList = this.byCategory.get(template.category) ?? []
    const filtered = categoryList.filter(
      (entry) => entry.templateKey !== template.templateKey,
    )
    filtered.push(template)
    this.byCategory.set(template.category, filtered)

    return () => {
      this.byTemplateKey.delete(template.templateKey)
      this.byLocalizationKey.delete(template.localizationKey)
      const remaining = (this.byCategory.get(template.category) ?? []).filter(
        (entry) => entry.templateKey !== template.templateKey,
      )
      if (remaining.length === 0) {
        this.byCategory.delete(template.category)
      } else {
        this.byCategory.set(template.category, remaining)
      }
    }
  }

  getByTemplateKey(templateKey: string): CommunicationTemplate | undefined {
    return this.byTemplateKey.get(templateKey)
  }

  getByLocalizationKey(localizationKey: string): CommunicationTemplate | undefined {
    return this.byLocalizationKey.get(localizationKey)
  }

  getByCategory(category: TemplateCategory): readonly CommunicationTemplate[] {
    return this.byCategory.get(category) ?? []
  }

  findForChannel(
    localizationKey: string,
    category: TemplateCategory,
    channel: CommunicationChannel,
  ): CommunicationTemplate | undefined {
    const byKey = this.byLocalizationKey.get(localizationKey)
    if (byKey && byKey.supportedChannels.includes(channel)) return byKey

    const categoryTemplates = this.getByCategory(category)
    return categoryTemplates.find((template) =>
      template.supportedChannels.includes(channel),
    )
  }

  getAll(): readonly CommunicationTemplate[] {
    return [...this.byTemplateKey.values()]
  }
}

export function createCommunicationRegistry(): CommunicationRegistry {
  return new CommunicationRegistry()
}

export function registerDefaultCommunicationTemplates(
  registry: CommunicationRegistry,
  templates: readonly CommunicationTemplate[],
): void {
  for (const template of templates) {
    registry.register(template)
  }
}

export function registerBuiltInCommunicationTemplates(
  registry: CommunicationRegistry,
): void {
  registerDefaultCommunicationTemplates(registry, DEFAULT_COMMUNICATION_TEMPLATES)
}
