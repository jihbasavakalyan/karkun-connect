import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'

type RuknHomeKarkunActionsProps = {
  ruknId: string
}

type ActionCard = {
  id: string
  label: string
  hint: string
  icon: IconName
  to?: string
  href?: string
  external?: boolean
}

export function RuknHomeKarkunActions({ ruknId }: RuknHomeKarkunActionsProps) {
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  void assignmentVersion
  const assigned = getAssignedKarkunanForRukn(ruknId)
  const topGuidance = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  const focusKarkun =
    (topGuidance ? getKarkunById(topGuidance.karkunId) : undefined) ?? assigned[0]
  const visitTo = focusKarkun
    ? topGuidance?.nextAction.route || ruknVisitPath(focusKarkun.id)
    : ROUTES.RUKN_AVAILABLE_KARKUN
  const callHref = focusKarkun?.mobile ? buildTelLink(focusKarkun.mobile) : null
  const whatsAppHref =
    focusKarkun?.mobile || focusKarkun?.whatsapp
      ? buildWhatsAppLink(
          focusKarkun.whatsapp?.trim() ? focusKarkun.whatsapp : focusKarkun.mobile,
        )
      : null

  const actions: ActionCard[] = [
    {
      id: 'visit',
      label: 'Visit',
      hint: focusKarkun ? focusKarkun.name : 'Connect a Karkun',
      icon: 'clipboard',
      to: visitTo,
    },
    {
      id: 'call',
      label: 'Call',
      hint: callHref ? 'Phone' : 'Open Connected',
      icon: 'phone',
      href: callHref ?? undefined,
      to: callHref ? undefined : ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      hint: whatsAppHref ? 'Message' : 'Open Connected',
      icon: 'message',
      href: whatsAppHref ?? undefined,
      external: Boolean(whatsAppHref),
      to: whatsAppHref ? undefined : ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'assignments',
      label: 'Assignments',
      hint: assigned.length ? `${assigned.length} connected` : 'Connect',
      icon: 'users',
      to: assigned.length ? ROUTES.RUKN_MY_KARKUN : ROUTES.RUKN_AVAILABLE_KARKUN,
    },
  ]

  return (
    <section className="rukn-home-card" aria-labelledby="rukn-home-karkun-title">
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-karkun-title" className="rukn-home-card-title">
          Karkun
        </h2>
        <p className="rukn-home-card-sub">Visit, call, WhatsApp, and assignments</p>
      </header>
      <div className="rukn-home-karkun-grid">
        {actions.map((action) => {
          const className = 'rukn-home-karkun-action'
          const inner = (
            <>
              <Icon name={action.icon} size="md" className="text-kc-shell" />
              <span className="rukn-home-karkun-action-label">{action.label}</span>
              <span className="rukn-home-karkun-action-hint">{action.hint}</span>
            </>
          )
          if (action.href) {
            return (
              <a
                key={action.id}
                className={className}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noopener noreferrer' : undefined}
              >
                {inner}
              </a>
            )
          }
          return (
            <Link key={action.id} className={className} to={action.to ?? ROUTES.RUKN_MY_KARKUN}>
              {inner}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
