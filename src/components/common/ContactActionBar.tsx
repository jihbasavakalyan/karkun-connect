import { Link } from 'react-router-dom'
import {
  buildMailtoLink,
  buildTelLink,
  buildWhatsAppLink,
} from '@/utils/personContactLinks'
import { Icon } from '@/components/ui/Icon'

type ContactActionBarProps = {
  name: string
  mobile: string
  whatsapp?: string
  email?: string
  viewDetailsHref?: string
  whatsAppMessage?: string
  onWhatsApp?: () => void
  mailSubject?: string
  size?: 'sm' | 'md'
  className?: string
}

const baseClassName =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface font-medium text-text-heading transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'

const sizeClassName: Record<NonNullable<ContactActionBarProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
}

export function ContactActionBar({
  name,
  mobile,
  whatsapp,
  email,
  viewDetailsHref,
  whatsAppMessage,
  onWhatsApp,
  mailSubject,
  size = 'md',
  className = '',
}: ContactActionBarProps) {
  const telLink = buildTelLink(mobile)
  const whatsAppLink = buildWhatsAppLink(whatsapp?.trim() ? whatsapp : mobile, whatsAppMessage)
  const mailLink = buildMailtoLink(email, mailSubject ?? `Message for ${name}`)
  const actionClass = `${baseClassName} ${sizeClassName[size]}`

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {telLink && (
        <a href={telLink} className={actionClass} aria-label={`Call ${name}`}>
          <Icon name="phone" size="sm" />
          Call
        </a>
      )}

      {onWhatsApp ? (
        <button type="button" className={actionClass} onClick={onWhatsApp}>
          <Icon name="message" size="sm" />
          WhatsApp
        </button>
      ) : (
        whatsAppLink && (
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            aria-label={`WhatsApp ${name}`}
          >
            <Icon name="message" size="sm" />
            WhatsApp
          </a>
        )
      )}

      {mailLink ? (
        <a href={mailLink} className={actionClass} aria-label={`Mail ${name}`}>
          <Icon name="mail" size="sm" />
          Mail
        </a>
      ) : (
        <button
          type="button"
          className={actionClass}
          disabled
          title="No email on file for this person"
        >
          <Icon name="mail" size="sm" />
          Mail
        </button>
      )}

      {viewDetailsHref && (
        <Link to={viewDetailsHref} className={actionClass} aria-label={`View details for ${name}`}>
          <Icon name="eye" size="sm" />
          View Details
        </Link>
      )}
    </div>
  )
}
