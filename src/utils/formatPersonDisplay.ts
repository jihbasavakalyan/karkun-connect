/**
 * Display-only formatting for People Management UI.
 * Does not modify stored or imported person records.
 */

function titleCaseToken(token: string): string {
  if (!token) return token

  if (token.startsWith('(') && token.endsWith(')')) {
    const inner = token.slice(1, -1)
    if (!inner) return token
    return `(${inner.charAt(0).toUpperCase()}${inner.slice(1).toLowerCase()})`
  }

  if (token.includes('@')) {
    return token
      .split('@')
      .map((part) => titleCaseToken(part))
      .join('@')
  }

  const letters = /[A-Za-z]/.test(token)
  if (!letters) return token

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

function titleCaseWord(word: string): string {
  const chunks = word.match(/[A-Za-z@()]+|[^A-Za-z@()]+/g)
  if (!chunks) return word
  return chunks.map(titleCaseToken).join('')
}

/**
 * Formats a person name for table display using Title Case.
 */
export function formatPersonNameForDisplay(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name

  return trimmed.split(/\s+/).map(titleCaseWord).join(' ')
}
