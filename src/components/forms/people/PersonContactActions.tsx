import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'

type PersonContactActionsProps = {
  mobile: string
  whatsapp?: string
}

const actionClassName =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-heading transition-colors hover:border-primary hover:text-primary'

export function PersonContactActions({ mobile, whatsapp }: PersonContactActionsProps) {
  const telLink = buildTelLink(mobile)
  const whatsAppLink = buildWhatsAppLink(whatsapp || mobile)

  if (!telLink && !whatsAppLink) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {telLink && (
        <a href={telLink} className={actionClassName}>
          📞 Call
        </a>
      )}
      {whatsAppLink && (
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noopener noreferrer"
          className={actionClassName}
        >
          💬 WhatsApp
        </a>
      )}
    </div>
  )
}
