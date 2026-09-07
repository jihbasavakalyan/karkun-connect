import { useState } from 'react'
import { NewKarkunRequestModal } from '@/components/relationship/NewKarkunRequestModal'
import { NewMuttafiqRequestModal } from '@/components/relationship/NewMuttafiqRequestModal'

type RuknAddPersonQuickActionsProps = {
  ruknId: string
  className?: string
}

/**
 * Shared Rukn Add Karkun / Add Muttafiq entry — reuses existing intake modals
 * (requesting Rukn is the referring Rukn on submit).
 */
export function RuknAddPersonQuickActions({ ruknId, className = '' }: RuknAddPersonQuickActionsProps) {
  const [showKarkun, setShowKarkun] = useState(false)
  const [showMuttafiq, setShowMuttafiq] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className={className}>
      <div className="connect-add-karkun grid grid-cols-2 gap-2" aria-label="Add person">
        <button
          type="button"
          className="connect-add-karkun-button"
          onClick={() => {
            setShowKarkun(true)
            setMessage('')
          }}
        >
          Add Karkun
        </button>
        <button
          type="button"
          className="connect-add-karkun-button"
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
