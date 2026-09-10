import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { searchParamsEqual } from '@/lib/navigation/searchParamsReplace'
import {
  parseRufaqaGenderView,
  rufaqaCategoryFromPathname,
  rufaqaCategoryPath,
  storedGenderFromView,
  type RufaqaCategory,
  type RufaqaGenderView,
} from '@/lib/rufaqa/rufaqaPresentation'

export function useRufaqaDirectoryQuery() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const category = rufaqaCategoryFromPathname(location.pathname)
  const genderView = parseRufaqaGenderView(searchParams)
  const storedGender = storedGenderFromView(genderView)
  const search = searchParams.get('search') ?? ''

  const replaceParams = useCallback(
    (patch: { search?: string; genderView?: RufaqaGenderView }) => {
      const next = new URLSearchParams(searchParams)
      const nextSearch = patch.search !== undefined ? patch.search : search
      const nextView = patch.genderView ?? genderView
      const nextGender = storedGenderFromView(nextView)

      if (nextSearch.trim()) next.set('search', nextSearch.trim())
      else next.delete('search')

      if (nextGender) next.set('gender', nextGender)
      else next.delete('gender')

      if (searchParamsEqual(searchParams, next)) return
      setSearchParams(next, { replace: true })
    },
    [genderView, search, searchParams, setSearchParams],
  )

  const setSearch = useCallback(
    (value: string) => replaceParams({ search: value }),
    [replaceParams],
  )

  const setGenderView = useCallback(
    (view: RufaqaGenderView) => replaceParams({ genderView: view }),
    [replaceParams],
  )

  const categoryHref = useCallback(
    (nextCategory: RufaqaCategory) =>
      rufaqaCategoryPath(nextCategory, {
        search: search.trim() || undefined,
        gender: storedGender || undefined,
      }),
    [search, storedGender],
  )

  return {
    category,
    genderView,
    storedGender,
    search,
    setSearch,
    setGenderView,
    categoryHref,
  }
}
