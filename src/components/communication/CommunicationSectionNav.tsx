import {
  COMMUNICATION_SECTIONS,
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
    <nav className="flex flex-wrap gap-2" aria-label="Communication sections">
      {COMMUNICATION_SECTIONS.map((section) => (
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
    </nav>
  )
}
