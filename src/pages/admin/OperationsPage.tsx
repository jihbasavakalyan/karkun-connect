/**
 * KC-0113.1 — Operations workspace.
 * Embeds existing Follow-up / Execution / Compliance modules as tabs.
 * No workflow or engine changes.
 */

import { useSearchParams } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { PageHeader, PageShell } from '@/components/ui'
import { ComplianceModulePage } from '@/pages/admin/ComplianceModulePage'
import { ExecutionModulePage } from '@/pages/admin/ExecutionModulePage'
import { FollowUpDevelopmentModulePage } from '@/pages/admin/FollowUpDevelopmentModulePage'
import {
  OPERATIONS_TABS,
  pickOperationsSharedParams,
  resolveOperationsTab,
  type OperationsTab,
} from '@/lib/operationsNavigation'

const MODULE_PARAM_KEYS = ['section', 'status', 'view'] as const

function readStoredTabParams(tab: OperationsTab): URLSearchParams {
  try {
    const raw = sessionStorage.getItem(`kc.ops.tab.${tab}`)
    return raw ? new URLSearchParams(raw) : new URLSearchParams()
  } catch {
    return new URLSearchParams()
  }
}

function writeStoredTabParams(tab: OperationsTab, params: URLSearchParams): void {
  const stored = new URLSearchParams()
  for (const key of MODULE_PARAM_KEYS) {
    const value = params.get(key)
    if (value) stored.set(key, value)
  }
  try {
    sessionStorage.setItem(`kc.ops.tab.${tab}`, stored.toString())
  } catch {
    // ignore storage failures
  }
}

function OperationsTabNav({
  active,
  onChange,
}: {
  active: OperationsTab
  onChange: (tab: OperationsTab) => void
}) {
  return (
    <nav className="ds-tab-nav" aria-label="Operations sections">
      {OPERATIONS_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={['ds-tab', active === tab.id ? 'ds-tab-active' : ''].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = resolveOperationsTab(searchParams.get('tab'))

  const setTab = (nextTab: OperationsTab) => {
    if (nextTab === activeTab) return
    setSearchParams((prev) => {
      writeStoredTabParams(activeTab, prev)
      const next = pickOperationsSharedParams(prev)
      next.set('tab', nextTab)
      const restored = readStoredTabParams(nextTab)
      restored.forEach((value, key) => {
        next.set(key, value)
      })
      return next
    })
  }

  return (
    <PageShell>
      <PageHeader
        title="Operations"
        description="See pending work, execute actions, and verify completion in one place."
      />
      <ActiveCampaignSubtitle />
      <OperationsTabNav active={activeTab} onChange={setTab} />

      <div className="mt-4">
        {activeTab === 'queue' ? <FollowUpDevelopmentModulePage embedded /> : null}
        {activeTab === 'execute' ? <ExecutionModulePage embedded /> : null}
        {activeTab === 'review' ? <ComplianceModulePage embedded /> : null}
      </div>
    </PageShell>
  )
}
