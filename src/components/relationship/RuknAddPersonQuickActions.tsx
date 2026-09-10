import { useState } from 'react'
import { NewKarkunRequestModal } from '@/components/relationship/NewKarkunRequestModal'
import { NewMuttafiqRequestModal } from '@/components/relationship/NewMuttafiqRequestModal'

type RuknAddPersonQuickActionsProps = {
  ruknId: string
  className?: string
  /** Default keeps the existing dashed Connect-style buttons. */
  tone?: 'primary' | 'secondary'
}

/**
 * Shared Rukn Add Karkun / Add Muttafiq entry — reuses existing intake modals
 * (requesting Rukn is the referring Rukn on submit).
 */
export function RuknAddPersonQuickActions({
  ruknId,
  className = '',
  tone = 'primary',
}: RuknAddPersonQuickActionsProps) {
  const [showKarkun, setShowKarkun] = useState(false)
  const [showMuttafiq, setShowMuttafiq] = useState(false)
  const [message, setMessage] = useState('')
  const buttonClass =
    tone === 'secondary' ? 'rukn-karkun-add-secondary' : 'connect-add-karkun-button'

  return (
    <div className={className}>
      <div className="connect-add-karkun grid grid-cols-2 gap-2" aria-label="Add person">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setShowKarkun(true)
            setMessage('')
          }}
        >
          Add Karkun
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setShowMuttafiq(true)
            setMessage('')
          }}
        >
          Add Muttafiq
        </button>
      </div>
      {message ? (
        <p className="ds-banner-success mt-2" role="status">
          {message}
        </p>
      ) : null}

      <NewKarkunRequestModal
        isOpen={showKarkun}
        ruknId={ruknId}
        onClose={() => setShowKarkun(false)}
        onSubmitted={() => setMessage('Request submitted for administrator approval.')}
      />
      <NewMuttafiqRequestModal
        isOpen={showMuttafiq}
        ruknId={ruknId}
        onClose={() => setShowMuttafiq(false)}
        onSubmitted={() => setMessage('Muttafiq request submitted for administrator approval.')}
      />
    </div>
  )
}
