import { CosPlaceholderPanel } from '@/components/communication/cos/CosPlaceholderPanel'

export function AdminQueuePanel() {
  return (
    <CosPlaceholderPanel
      title="Communication Queue"
      description="Mission communications awaiting planning, review, or release will appear here. Sending is out of scope for this foundation sprint."
    >
      <ul className="space-y-2 text-sm text-secondary">
        <li className="rounded-lg border border-dashed border-border px-3 py-2">
          Visit follow-up pack — draft
        </li>
        <li className="rounded-lg border border-dashed border-border px-3 py-2">
          Weekly Ijtema reminder — planned
        </li>
        <li className="rounded-lg border border-dashed border-border px-3 py-2">
          Appreciation note — awaiting review
        </li>
      </ul>
    </CosPlaceholderPanel>
  )
}

export function AdminAudiencesPanel() {
  return (
    <CosPlaceholderPanel
      title="Audiences"
      description="Static, dynamic, and hybrid groups for mission-wide communication. Configuration arrives in a later sprint."
    >
      <ul className="grid gap-2 sm:grid-cols-3 text-sm">
        {['All Rukns', 'Selected Karkuns', 'Dynamic · Journey stage'].map((label) => (
          <li
            key={label}
            className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-3 text-secondary"
          >
            {label}
          </li>
        ))}
      </ul>
    </CosPlaceholderPanel>
  )
}

export function AdminJourneysPanel() {
  return (
    <CosPlaceholderPanel
      title="Journeys"
      description="Align communication patterns to Connection Journey stages. Journey libraries are documented in KC-0090; wiring comes later."
    />
  )
}

export function AdminReportsPlaceholderPanel() {
  return (
    <CosPlaceholderPanel
      title="Reports"
      description="Communication support reports will help administrators act — not vanity analytics. Not implemented in KC-0091."
    />
  )
}

export function AdminDeliveryPlaceholderPanel() {
  return (
    <CosPlaceholderPanel
      title="Delivery Center"
      description="Channel-independent delivery monitoring (WhatsApp, SMS, Email) is specified in KC-0090. This foundation shows structure only — no adapters."
    >
      <div className="grid gap-2 sm:grid-cols-3 text-sm text-secondary">
        {['WhatsApp', 'SMS', 'Email'].map((channel) => (
          <div
            key={channel}
            className="rounded-lg border border-dashed border-border px-3 py-3 text-center"
          >
            {channel}
            <p className="mt-1 text-xs">Adapter not active</p>
          </div>
        ))}
      </div>
    </CosPlaceholderPanel>
  )
}

export function AdminTemplatesPlaceholderPanel() {
  return (
    <CosPlaceholderPanel
      title="Templates"
      description="Template Library for mission communication. Existing messaging templates remain under Messaging Tools until the COS library migrates them."
    />
  )
}

export function AdminSettingsPlaceholderPanel() {
  return (
    <CosPlaceholderPanel
      title="Settings"
      description="COS mission settings and delivery policies will live here. Existing WhatsApp tool settings remain under Messaging Tools → Settings alias for now."
    />
  )
}
