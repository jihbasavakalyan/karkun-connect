/**
 * KC-035C — Secretary response composition for workflows.
 */

import { WORKFLOW_URDU } from './workflowUrduCopy'
import type { RemainingSuggestion } from '../policies/nextActionPolicy'

export function buildPersonDetailsResponse(input: {
  readonly name: string
  readonly completed: readonly string[]
  readonly remaining: readonly string[]
  readonly situationSummary?: string
}): string {
  const lines: string[] = [WORKFLOW_URDU.situationHeader(input.name)]
  if (input.situationSummary?.trim()) {
    lines.push(input.situationSummary.trim())
  }
  for (const label of input.completed.slice(0, 6)) {
    lines.push(WORKFLOW_URDU.doneLine(label.replace(/ مکمل$/, '')))
  }
  for (const label of input.remaining.slice(0, 6)) {
    const clean = label.replace(/ باقی ہے.*$/, '').replace(/^◻\s*/, '')
    lines.push(WORKFLOW_URDU.pendingLine(clean))
  }
  return lines.join('\n')
}

export function buildSaveAndSuggestResponse(input: {
  readonly savedLine: string
  readonly suggestion: RemainingSuggestion | null
}): string {
  if (!input.suggestion) {
    return `${input.savedLine}\n${WORKFLOW_URDU.allClear}`
  }
  const remainingLine =
    input.suggestion.labelUrdu.length > 0
      ? WORKFLOW_URDU.onlyRemaining(input.suggestion.labelUrdu)
      : WORKFLOW_URDU.acknowledge
  return `${input.savedLine}\n${remainingLine}\n${WORKFLOW_URDU.suggestSuffix}`
}

export function buildConfirmPrompt(summaryUrdu: string): string {
  return `${summaryUrdu}\n${WORKFLOW_URDU.askConfirm}`
}
