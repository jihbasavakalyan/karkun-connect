import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { humanizeAvailableKarkunStatusShort, fatherHusbandLabel } from '@/lib/relationshipPresentation'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Icon } from '@/components/ui/Icon'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type AvailableKarkunRowProps = {
  karkun: KarkunRegistryRecord
  journeyLabel?: string
  onConnect: () => void
  connectDisabled?: boolean
}

export function AvailableKarkunRow({
  karkun,
  journeyLabel,
  onConnect,
  connectDisabled = false,
}: AvailableKarkunRowProps) {
  const connectionLabel = getConnectionStatusLabel(karkun.assignmentStatus)
  const isReady = karkun.assignmentStatus === 'Available'

  return (
    <article className="relationship-available-row">
      <div className="relationship-available-row-main">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-text-heading">{karkun.name}</p>
          <div className="mt-1 grid gap-0.5 text-sm text-secondary sm:grid-cols-2">
            {karkun.fatherHusbandName?.trim() && (
              <p className="truncate">
                {fatherHusbandLabel(karkun.gender)}: {karkun.fatherHusbandName}
              </p>
            )}
            <p className="truncate">{karkun.mobile || 'Mobile not added'}</p>
            <p className="truncate sm:col-span-2">{karkun.area || karkun.place}</p>
          </div>
        </div>

        <div className="relationship-available-row-meta">
          {journeyLabel ? (
            <span className="relationship-chip">{journeyLabel}</span>
          ) : isReady ? (
            <span className="relationship-chip relationship-chip-ready">
              {humanizeAvailableKarkunStatusShort()}
            </span>
          ) : (
            <span className="relationship-chip">{connectionLabel}</span>
          )}
        </div>
      </div>

      <div className="relationship-available-row-action">
        <PrimaryButton
          type="button"
          className="min-h-11 w-full whitespace-nowrap sm:w-auto sm:min-w-[8.5rem]"
          disabled={connectDisabled || !isReady}
          onClick={onConnect}
        >
          <Icon name="plus" size="sm" />
          Connect
        </PrimaryButton>
      </div>
    </article>
  )
}
