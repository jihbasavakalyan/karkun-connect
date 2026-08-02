import { PageHeader, PageShell } from '@/components/ui'
import { ReportCenterPanel } from '@/components/reporting/ReportCenterPanel'

/**
 * KC-037B — Dedicated Admin Report Center (entry point for all reports).
 * KC-037 V1 policy: Administrator-only for the current campaign (no Rukn report access).
 * @see docs/architecture/kc-037-v1-admin-only-reporting-policy.md
 */
export function AdminReportCenterPage() {
  return (
    <PageShell variant="wide">
      <PageHeader
        title="Report Center"
        description="Configure campaign reports. Every KPI comes from KC-033 providers via the Report Composer. Connection (assignment) is never conflated with Visit (personal meeting)."
      />
      <ReportCenterPanel />
    </PageShell>
  )
}
