import { FormSectionCard } from '@/components/forms/annexure1/FormSectionCard'

type WorkerInfoSectionProps = {
  name: string
  mobile: string
  area: string
  address: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-1 text-base font-medium text-text-heading">{value}</dd>
    </div>
  )
}

export function WorkerInfoSection({ name, mobile, area, address }: WorkerInfoSectionProps) {
  return (
    <FormSectionCard title="Karkun Information">
      <dl className="space-y-3">
        <InfoRow label="Name" value={name} />
        <InfoRow label="Mobile" value={mobile} />
        <InfoRow label="Area" value={area} />
        <InfoRow label="Address" value={address} />
      </dl>
    </FormSectionCard>
  )
}
