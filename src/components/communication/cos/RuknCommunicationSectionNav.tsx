import {
  RUKN_COMMUNICATION_SECTIONS,
  type RuknCommunicationSection,
} from '@/lib/ruknCommunicationNavigation'

export function RuknCommunicationSectionNav({
  active,
  onChange,
}: {
  active: RuknCommunicationSection
  onChange: (section: RuknCommunicationSection) => void
}) {
  return (
    <nav className="overflow-x-auto" aria-label="Rukn Communication sections">
      <div className="flex min-w-max gap-2 pb-1">
        {RUKN_COMMUNICATION_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={[
              'min-h-10 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active === section.id
                ? 'bg-primary-muted text-primary'
                : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading',
            ].join(' ')}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
