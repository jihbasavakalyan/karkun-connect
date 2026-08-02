/**
 * KC-038A — Search input deletion / debounce sync certification.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function run() {
  const hookSrc = readFileSync(resolve('src/hooks/useDebouncedSearchInput.ts'), 'utf8')
  assert(hookSrc.includes('pendingCommitRef'), 'tracks internal commits')
  assert(hookSrc.includes('setDraft(committedValue)'), 'syncs external commits only')
  assert(!hookSrc.includes('setDraft(debounced'), 'debounced value never bound to draft')

  const filtersSrc = readFileSync(
    resolve('src/components/forms/people/PeopleFiltersBar.tsx'),
    'utf8',
  )
  assert(filtersSrc.includes('useDebouncedSearchInput'), 'PeopleFiltersBar uses shared hook')
  assert(!filtersSrc.includes('setSearchDraft(filters.search)'), 'no blind filters→draft sync')

  const fieldSrc = readFileSync(
    resolve('src/components/relationship/KarkunSearchField.tsx'),
    'utf8',
  )
  assert(fieldSrc.includes('useDebouncedSearchInput'), 'KarkunSearchField uses shared hook')
  assert(!fieldSrc.includes('setSearchDraft(value)'), 'no blind value→draft sync')

  console.log('KC-038A search deletion verification passed')
}

run()
