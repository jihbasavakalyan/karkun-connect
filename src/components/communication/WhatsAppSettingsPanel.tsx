import { useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { testWhatsAppConnection } from '@/services/communicationService'
import { useCommunication } from '@/hooks/useCommunication'

function StatusPill({ label, value }: { label: string; value: string }) {
  const tone =
    value === 'connected' || value === 'configured' || value === 'success'
      ? 'bg-green-100 text-green-800'
      : value === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-600'

  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <dt className="text-xs text-secondary">{label}</dt>
      <dd className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
        {value}
      </dd>
    </div>
  )
}

export function WhatsAppSettingsPanel() {
  const { whatsappSettings } = useCommunication()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const handleTest = async () => {
    setTesting(true)
    setTestResult('')
    const result = await testWhatsAppConnection()
    setTesting(false)
    setTestResult(result.message)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">
        WhatsApp Business Platform settings are managed by the backend. Access tokens and Phone
        Number IDs are never exposed to the browser.
      </p>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-text-heading">WhatsApp Business</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <dt className="text-xs text-secondary">Business Name</dt>
            <dd className="mt-1 text-sm font-medium text-text-heading">{whatsappSettings.businessName}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <dt className="text-xs text-secondary">Phone Number</dt>
            <dd className="mt-1 text-sm font-medium text-text-heading">{whatsappSettings.phoneNumber}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <dt className="text-xs text-secondary">Phone Number ID</dt>
            <dd className="mt-1 text-sm font-medium text-text-heading">{whatsappSettings.phoneNumberId}</dd>
          </div>
          <StatusPill label="Webhook Status" value={whatsappSettings.webhookStatus} />
          <StatusPill label="API Status" value={whatsappSettings.apiStatus} />
          <StatusPill label="Token Status" value={whatsappSettings.tokenStatus} />
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-secondary">Access Token</dt>
            <dd className="mt-1 font-mono text-sm text-text-heading">{whatsappSettings.tokenMasked}</dd>
          </div>
        </dl>

        {whatsappSettings.lastConnectionTest && (
          <p className="mt-4 text-sm text-secondary">
            Last connection test: {whatsappSettings.lastConnectionTest.slice(0, 16).replace('T', ' ')} —{' '}
            {whatsappSettings.lastConnectionTestResult ?? 'unknown'}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton type="button" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing…' : 'Connection Test'}
          </PrimaryButton>
          <SecondaryButton type="button" disabled title="Coming in next release">
            Configure API
          </SecondaryButton>
        </div>
        <p className="mt-2 text-xs text-secondary">WhatsApp API configuration — Coming in next release</p>

        {testResult && <p className="mt-3 text-sm text-secondary">{testResult}</p>}
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface-muted p-4 text-sm text-secondary">
        <p className="font-medium text-text-heading">Architecture</p>
        <p className="mt-2">
          Administrator → Communication Engine → Backend API → WhatsApp Business Cloud API →
          Recipient → Webhook → Delivery / Read status stored server-side.
        </p>
      </section>
    </div>
  )
}
