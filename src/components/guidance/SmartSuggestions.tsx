import { Link } from 'react-router-dom'
import type { SmartSuggestion } from '@/types/guidance'

type SmartSuggestionsProps = {
  suggestions: SmartSuggestion[]
}

export function SmartSuggestions({ suggestions }: SmartSuggestionsProps) {
  if (suggestions.length === 0) {
    return null
  }

  return (
    <ul className="space-y-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion.kind}>
          <Link
            to={suggestion.route}
            className="block rounded-lg border border-border bg-surface-muted px-4 py-3 transition-colors hover:border-primary hover:bg-primary-muted/20"
          >
            <p className="text-sm font-semibold text-text-heading">{suggestion.label}</p>
            <p className="mt-0.5 text-xs text-secondary">{suggestion.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
