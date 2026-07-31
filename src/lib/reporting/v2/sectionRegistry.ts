/**
 * KC-037A — Section registry.
 * New sections: registerSection(...) only — Composer is unaware of concrete ids.
 */

import type { SectionDefinition } from './types'

const registry = new Map<string, SectionDefinition>()

export function registerSection(definition: SectionDefinition): void {
  if (!definition.id.trim()) {
    throw new Error('SectionDefinition.id is required')
  }
  registry.set(definition.id, definition)
}

export function getSection(id: string): SectionDefinition | undefined {
  return registry.get(id)
}

export function listSections(): SectionDefinition[] {
  return [...registry.values()].sort((a, b) => a.renderPriority - b.renderPriority)
}

export function listEnabledSections(enabledIds: string[]): SectionDefinition[] {
  const ordered: SectionDefinition[] = []
  for (const id of enabledIds) {
    const def = registry.get(id)
    if (!def) {
      throw new Error(`Unknown report section id: ${id}`)
    }
    if (!def.featureFlag || def.status !== 'active' || !def.buildModel) {
      throw new Error(
        `Report section "${id}" is not active (status=${def.status}, featureFlag=${def.featureFlag})`,
      )
    }
    ordered.push(def)
  }
  return ordered.sort((a, b) => a.renderPriority - b.renderPriority)
}

/** Test / hot-reload helper — does not affect production boot after modules load. */
export function unregisterSectionForTests(id: string): void {
  registry.delete(id)
}

export function resetSectionRegistryForTests(): void {
  registry.clear()
}
