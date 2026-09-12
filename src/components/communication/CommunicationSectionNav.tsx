import { Link } from 'react-router-dom'
import {
  COMMUNICATION_INBOX_NAV,
  COMMUNICATION_PRIMARY_SECTIONS,
  communicationPrimaryNavId,
  type CommunicationPrimarySection,
  type CommunicationSection,
} from '@/lib/communicationNavigation'

export function CommunicationSectionNav({
  active,
  onChange,
  inboxActive = false,
}: {
  active: CommunicationSection
  onChange: (next: CommunicationPrimarySection) => void
  /** True when the Admin is on /admin/inbox (product-area highlight only). */
  inboxActive?: boolean
}) {
  const current = inboxActive ? null : communicationPrimaryNavId(active)

  return (
    <nav
      className="mb-4 flex flex-nowrap gap-1 overflow-x-auto border-b border-border pb-px"
      aria-label="Communication sections"
    >
      {COMMUNICATION_PRIMARY_SECTIONS.map((section) => {
        const selected = current === section.id
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-current={selected ? 'page' : undefined}
            className={`ds-tab shrink-0 border-b-2 rounded-none px-4 min-h-11 ${
              selected ? 'border-primary text-primary ds-tab-active' : 'border-transparent'
            }`}
          >
            {section.label}
          </button>
        )
      })}
      <Link
        to={COMMUNICATION_INBOX_NAV.to}
        aria-current={inboxActive ? 'page' : undefined}
        className={`ds-tab inline-flex shrink-0 items-center border-b-2 rounded-none px-4 min-h-11 ${
          inboxActive ? 'border-primary text-primary ds-tab-active' : 'border-transparent text-secondary hover:text-text-heading'
        }`}
      >
        {COMMUNICATION_INBOX_NAV.label}
      </Link>
    </nav>
  )
}

export function CommunicationWorkspaceSubnav({
  labelledBy,
  items,
  active,
  onChange,
}: {
  labelledBy: string
  items: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <nav
      className="mb-4 flex flex-wrap gap-2"
      aria-label={labelledBy}
    >
      {items.map((item) => {
        const selected = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={selected}
            className={`min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-primary-muted text-primary'
                : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
