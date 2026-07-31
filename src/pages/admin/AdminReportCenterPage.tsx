import { PageHeader, PageShell } from '@/components/ui'
import { ReportCenterPanel } from '@/components/reporting/ReportCenterPanel'

/**
 * KC-037B — Dedicated Admin Report Center (entry point for all reports).
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
