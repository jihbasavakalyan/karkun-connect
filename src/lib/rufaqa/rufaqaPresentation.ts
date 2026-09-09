/**
 * Increment 04 — Rufaqa presentation helpers.
 * Navigation / labels only. Reuses existing routes and stores.
 */

import { adminARuknDetailPath, adminRuknDetailPath, ROUTES } from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import type { ResolvedPerson } from '@/lib/personResolution'
import { adminKarkunRegistryPath } from '@/lib/peopleRegistryNavigation'
import { adminPersonProfilePath } from '@/lib/personProfile/ProfilePresenter'
import { RUFAQA_LABEL_EN, RUFAQA_LABEL_UR, RUFAQA_PATH_PREFIXES } from '@/lib/rufaqa/rufaqaNav'
import type { PersonGender } from '@/types/people.types'

export { RUFAQA_LABEL_EN, RUFAQA_LABEL_UR, RUFAQA_PATH_PREFIXES }

export type RufaqaCategory = 'rukn' | 'a-rukn' | 'karkun' | 'muttafiqeen'
export type RufaqaGenderView = 'all' | 'men' | 'women'

export const RUFAQA_CATEGORIES: Array<{
  id: RufaqaCategory
  label: string
  path: string
}> = [
  { id: 'rukn', label: 'Rukn', path: ROUTES.ADMIN_RUKN },
  { id: 'a-rukn', label: 'A Rukn', path: ROUTES.ADMIN_A_RUKN },
  { id: 'karkun', label: 'Karkun', path: ROUTES.ADMIN_KARKUN },
  { id: 'muttafiqeen', label: 'Muttafiqeen', path: ROUTES.ADMIN_MUTTAFIQEEN },
]

export const RUFAQA_GENDER_VIEWS: Array<{ id: RufaqaGenderView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'men', label: 'Men' },
  { id: 'women', label: 'Women' },
]

export function isAdminRufaqaPath(pathname: string): boolean {
  const current = pathname.replace(/\/$/, '') || '/'
  return RUFAQA_PATH_PREFIXES.some(
    (prefix) => current === prefix || current.startsWith(`${prefix}/`),
  )
}

export function rufaqaCategoryFromPathname(pathname: string): RufaqaCategory | null {
  const current = pathname.replace(/\/$/, '') || '/'
  if (current === ROUTES.ADMIN_A_RUKN || current.startsWith(`${ROUTES.ADMIN_A_RUKN}/`)) {
    return 'a-rukn'
  }
  if (current === ROUTES.ADMIN_RUKN || current.startsWith(`${ROUTES.ADMIN_RUKN}/`)) {
    return 'rukn'
  }
  if (current === ROUTES.ADMIN_MUTTAFIQEEN || current.startsWith(`${ROUTES.ADMIN_MUTTAFIQEEN}/`)) {
    return 'muttafiqeen'
  }
  if (current === ROUTES.ADMIN_KARKUN || current.startsWith(`${ROUTES.ADMIN_KARKUN}/`)) {
    return 'karkun'
  }
  return null
}

export function parseRufaqaGenderView(params: URLSearchParams): RufaqaGenderView {
  const gender = params.get('gender')
  if (gender === 'Male') return 'men'
  if (gender === 'Female') return 'women'
  return 'all'
}

/** Presentation All/Men/Women → stored Male/Female or unrestricted. */
export function storedGenderFromView(view: RufaqaGenderView): PersonGender | '' {
  if (view === 'men') return 'Male'
  if (view === 'women') return 'Female'
  return ''
}

export function rufaqaCategoryPath(
  category: RufaqaCategory,
  options: { search?: string; gender?: PersonGender | ''; action?: 'add' } = {},
): string {
  const base =
    category === 'rukn'
      ? ROUTES.ADMIN_RUKN
      : category === 'a-rukn'
        ? ROUTES.ADMIN_A_RUKN
        : category === 'muttafiqeen'
          ? ROUTES.ADMIN_MUTTAFIQEEN
          : ROUTES.ADMIN_KARKUN

  if (category === 'karkun') {
    return adminKarkunRegistryPath({
      search: options.search,
      gender: options.gender,
      action: options.action,
    })
  }

  const params = new URLSearchParams()
  if (options.search?.trim()) params.set('search', options.search.trim())
  if (options.gender) params.set('gender', options.gender)
  if (options.action === 'add') params.set('action', 'add')
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export function rufaqaCategoryForResolvedPerson(person: ResolvedPerson): RufaqaCategory {
  if (person.kind === 'muttafiq') return 'muttafiqeen'
  if (person.kind === 'karkun') return 'karkun'
  const officer = getRuknById(person.personId)
  if (officer?.officerKind === 'a_rukn') return 'a-rukn'
  return 'rukn'
}

export function rufaqaDetailPathForPerson(person: ResolvedPerson): string {
  if (person.kind === 'karkun' || person.kind === 'muttafiq') {
    return person.profilePath || adminPersonProfilePath(person.personId)
  }
  const officer = getRuknById(person.personId)
  if (officer?.officerKind === 'a_rukn') {
    return adminARuknDetailPath(person.personId)
  }
  return adminRuknDetailPath(person.personId)
}

export function rufaqaCategoryLabel(category: RufaqaCategory): string {
  return RUFAQA_CATEGORIES.find((item) => item.id === category)?.label ?? RUFAQA_LABEL_EN
}

/** Back-link copy: رفقاء / Rufaqa → Category. Never “People”. */
export function rufaqaBackLabel(category: RufaqaCategory): string {
  return `${RUFAQA_LABEL_EN} → ${rufaqaCategoryLabel(category)}`
}
