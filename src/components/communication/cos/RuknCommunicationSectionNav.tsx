import {
  RUKN_COMMUNICATION_PRIMARY_SECTIONS,
  type RuknCommunicationPrimarySection,
  type RuknCommunicationSection,
} from '@/lib/ruknCommunicationNavigation'

export function RuknCommunicationSectionNav({
  active,
  onChange,
}: {
  active: RuknCommunicationSection
  onChange: (next: RuknCommunicationPrimarySection) => void
}) {
  return (
    <nav
      className="mb-4 flex flex-nowrap gap-1 overflow-x-auto border-b border-border pb-px"
      aria-label="Rukn Communication sections"
    >
      {RUKN_COMMUNICATION_PRIMARY_SECTIONS.map((section) => {
        const selected = active === section.id
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-current={selected ? 'page' : undefined}
            className={`ds-tab shrink-0 border-b-2 rounded-none px-4 ${
              selected ? 'border-primary text-primary ds-tab-active' : 'border-transparent'
            }`}
          >
            {section.label}
          </button>
        )
      })}
    </nav>
  )
}
