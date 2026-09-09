import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useDebouncedSearchInput } from '@/hooks/useDebouncedSearchInput'
import { useRufaqaDirectoryQuery } from '@/hooks/useRufaqaDirectoryQuery'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import {
  RUFAQA_CATEGORIES,
  RUFAQA_GENDER_VIEWS,
  RUFAQA_LABEL_EN,
  RUFAQA_LABEL_UR,
} from '@/lib/rufaqa/rufaqaPresentation'
import { UI_LABELS } from '@/lib/uiTerminology'
import type { RufaqaCategory } from '@/lib/rufaqa/rufaqaPresentation'

type RufaqaDirectoryShellProps = {
  category: RufaqaCategory
  actions?: ReactNode
  children: ReactNode
}

export function RufaqaDirectoryShell({ category, actions, children }: RufaqaDirectoryShellProps) {
  const hydration = useRepositoryHydrationStatus()
  const query = useRufaqaDirectoryQuery()
  const search = useDebouncedSearchInput(query.search, query.setSearch, 250)

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span dir="rtl" lang="ur">
              {RUFAQA_LABEL_UR}
            </span>
            <span className="text-lg font-medium text-secondary sm:text-xl">{RUFAQA_LABEL_EN}</span>
          </span>
        }
        description="Organisational identity directory — who this person is."
        actions={actions}
      />

      <form
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault()
          search.commitNow()
        }}
      >
        <label htmlFor="rufaqa-search" className="text-sm font-medium text-text-heading">
          Search
        </label>
        <p className="mt-0.5 text-xs text-secondary">
          Name, father or husband name, mobile, area, ID, and other fields already on this record.
        </p>
        <input
          id="rufaqa-search"
          type="search"
          value={search.draft}
          onChange={(event) => search.setDraftValue(event.target.value)}
          placeholder={UI_LABELS.registrySearchPlaceholder}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <nav className="ds-tab-nav mb-3 border-b border-border pb-px" aria-label="Rufaqa category">
        {RUFAQA_CATEGORIES.map((item) => {
          const current = category === item.id
          return (
            <Link
              key={item.id}
              to={query.categoryHref(item.id)}
              aria-current={current ? 'page' : undefined}
              className={`ds-tab border-b-2 rounded-none px-4 ${
                current ? 'border-primary text-primary ds-tab-active' : 'border-transparent'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Gender">
        {RUFAQA_GENDER_VIEWS.map((item) => {
          const current = query.genderView === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`min-h-10 rounded-full border px-4 py-1.5 text-sm ${
                current
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-border bg-surface text-text-heading hover:border-primary/40'
              }`}
              aria-pressed={current}
              onClick={() => query.setGenderView(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {hydration.failed ? (
        <EmptyState
          icon="warning"
          title="Unable to load Rufaqa"
          description={hydration.error ?? 'Organisational records could not be loaded.'}
        >
          <PrimaryButton type="button" className="mt-3" onClick={hydration.retry}>
            Retry
          </PrimaryButton>
        </EmptyState>
      ) : !hydration.ready ? (
        <ListSkeleton rows={6} />
      ) : (
        children
      )}
    </PageShell>
  )
}
