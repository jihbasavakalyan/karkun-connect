import { formatRuknOrgMetric } from '@/lib/rukn/ruknOrganisationalInformation'
import { useJamaatReadModels } from '@/hooks/useJamaatReadModels'
import { RuknHomeOrgMetric } from '@/components/rukn/RuknHomeOrgMetric'

type RuknHomeJamaatCurrentSituationProps = {
  metricsReady: boolean
}

function formatFreshness(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ur-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Jamaat-wide organisational situation. Consumes the Admin-authored aggregate only.
 * Person registries are not read on this card.
 */
export function RuknHomeJamaatCurrentSituation({
  metricsReady,
}: RuknHomeJamaatCurrentSituationProps) {
  const { situation } = useJamaatReadModels()
  const ready = metricsReady && situation != null

  return (
    <section
      className="rukn-home-card rukn-org-card"
      aria-labelledby="rukn-jamaat-situation-title"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-home-card-head">
        <h2 id="rukn-jamaat-situation-title" className="rukn-home-card-title">
          جماعت کی موجودہ صورتحال
        </h2>
        <p className="rukn-home-card-sub">Jamaat-wide current organisational situation</p>
        {situation ? (
          <p className="rukn-org-year">تازگی: {formatFreshness(situation.generatedAt)}</p>
        ) : null}
      </header>

      <ul className="rukn-org-people" aria-label="افراد">
        <RuknHomeOrgMetric
          label="ارکان"
          value={situation && ready ? formatRuknOrgMetric(situation.rukns) : '—'}
        />
        <RuknHomeOrgMetric
          label="عازمِ رکن"
          value={situation && ready ? formatRuknOrgMetric(situation.aRukns) : '—'}
        />
        <RuknHomeOrgMetric
          label="کارکنان"
          value={situation && ready ? formatRuknOrgMetric(situation.karkuns) : '—'}
        />
        <RuknHomeOrgMetric
          label="متفقین"
          value={situation && ready ? formatRuknOrgMetric(situation.muttafiqeen) : '—'}
        />
        <RuknHomeOrgMetric
          label="باہمی ربط"
          value={situation && ready ? formatRuknOrgMetric(situation.connections) : '—'}
        />
      </ul>
    </section>
  )
}
