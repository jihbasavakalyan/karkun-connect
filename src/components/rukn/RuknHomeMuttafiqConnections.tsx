import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { getRuknHomeMuttafiqRows } from '@/stores/muttafiqRelationshipStore'

type RuknHomeMuttafiqConnectionsProps = {
  ruknId: string
}

/**
 * Connected Muttafiq on Rukn Home — Active `muttafiqRelationships` for this Rukn only.
 * Not campaign `connections`. Pending Inbox links are never stored here.
 */
export function RuknHomeMuttafiqConnections({ ruknId }: RuknHomeMuttafiqConnectionsProps) {
  const version = useMuttafiqRelationshipStore()
  void version
  const rows = getRuknHomeMuttafiqRows(ruknId)

  return (
    <section className="rukn-home-card" aria-labelledby="rukn-home-muttafiq-title" dir="rtl" lang="ur">
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-muttafiq-title" className="rukn-home-card-title">
          متفقین
        </h2>
        <p className="rukn-home-card-sub">Connected Muttafiq</p>
      </header>
      {rows.length === 0 ? (
        <p className="rukn-home-muttafiq-empty">No connected Muttafiq.</p>
      ) : (
        <ul className="rukn-home-muttafiq-list">
          {rows.map((row) => (
            <li key={row.relationshipId} className="rukn-home-muttafiq-item">
              <span className="rukn-home-muttafiq-initials" aria-hidden>
                {row.initials}
              </span>
              <span className="rukn-home-muttafiq-copy">
                <span className="rukn-home-muttafiq-name">{row.counterpartName}</span>
                <span className="rukn-home-muttafiq-id">{row.counterpartIdentifier}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
