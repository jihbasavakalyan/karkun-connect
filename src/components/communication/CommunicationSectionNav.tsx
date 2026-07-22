import {
  COMMUNICATION_SECTION_GROUPS,
  type CommunicationSection,
} from '@/lib/communicationNavigation'

export function CommunicationSectionNav({
  active,
  onChange,
}: {
  active: CommunicationSection
  onChange: (section: CommunicationSection) => void
}) {
  return (
    <nav className="space-y-3" aria-label="Communication sections">
      {COMMUNICATION_SECTION_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                className={[
                  'min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active === section.id
                    ? 'bg-primary-muted text-primary'
                    : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading',
                ].join(' ')}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
