import { Link } from 'react-router-dom'
import {
  buildMailtoLink,
  buildTelLink,
  buildWhatsAppLink,
} from '@/utils/personContactLinks'

type ContactActionBarProps = {
  name: string
  mobile: string
  whatsapp?: string
  email?: string
  /** Route for the "View Details" action. Omit to hide the action. */
  viewDetailsHref?: string
  /** Optional message pre-filled into the WhatsApp compose window. */
  whatsAppMessage?: string
  /** Optional override for WhatsApp — e.g. open an in-app composer instead of wa.me. */
  onWhatsApp?: () => void
  /** Optional subject/body for the mail action. */
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

/**
 * Canonical Call / WhatsApp / Mail / View Details action bar.
 * Call uses tel: (launches the dialer on mobile), WhatsApp uses wa.me
 * (opens WhatsApp with an optional pre-filled message — the user sends it
 * from their own account), Mail uses mailto:. No backend required.
 */
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
          📞 Call
        </a>
      )}

      {onWhatsApp ? (
        <button type="button" className={actionClass} onClick={onWhatsApp}>
          🟢 WhatsApp
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
            🟢 WhatsApp
          </a>
        )
      )}

      {mailLink ? (
        <a href={mailLink} className={actionClass} aria-label={`Mail ${name}`}>
          ✉️ Mail
        </a>
      ) : (
        <button
          type="button"
          className={actionClass}
          disabled
          title="No email on file for this person"
        >
          ✉️ Mail
        </button>
      )}

      {viewDetailsHref && (
        <Link to={viewDetailsHref} className={actionClass} aria-label={`View details for ${name}`}>
          👁 View Details
        </Link>
      )}
    </div>
  )
}
