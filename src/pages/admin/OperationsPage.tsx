/**
 * KC-0113.1 / KC-0115 — Activities deep workspace (Follow-up / Campaign Execution / Review).
 * Embeds existing modules as tabs. No workflow or engine changes.
 * Primary entry is via Activities nav; this route keeps deep links working.
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

const TAB_HEADERS: Record<OperationsTab, { title: string; description: string }> = {
  queue: {
    title: 'Follow-up',
    description: 'Pending and completed follow-up work for connected Karkuns.',
  },
  execute: {
    title: 'Campaign Execution',
    description:
      'Execute campaign work across pending connections, visits, app registration, Weekly Ijtema, Baitul Maal, and overall progress.',
  },
  review: {
    title: 'Review',
    description: 'Verify completion across Weekly Ijtema, portal registration, reporting, and Baitul Maal.',
  },
}

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

function ActivitiesTabNav({
  active,
  onChange,
}: {
  active: OperationsTab
  onChange: (tab: OperationsTab) => void
}) {
  return (
    <nav className="ds-tab-nav" aria-label="Activities sections">
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
  const header = TAB_HEADERS[activeTab]

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
      <PageHeader title={header.title} description={header.description} />
      <ActiveCampaignSubtitle />
      <ActivitiesTabNav active={activeTab} onChange={setTab} />

      <div className="mt-4">
        {activeTab === 'queue' ? <FollowUpDevelopmentModulePage embedded /> : null}
        {activeTab === 'execute' ? <ExecutionModulePage embedded /> : null}
        {activeTab === 'review' ? <ComplianceModulePage embedded /> : null}
      </div>
    </PageShell>
  )
}
