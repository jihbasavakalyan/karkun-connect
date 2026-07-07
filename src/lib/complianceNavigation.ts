export const COMPLIANCE_SECTIONS = [
  { id: 'ijtema', label: 'Weekly Ijtema' },
  { id: 'jih-registration', label: 'JIH Portal Registration' },
  { id: 'monthly-reporting', label: 'Monthly Reporting' },
  { id: 'baitul-maal', label: 'Bait-ul-Maal' },
] as const

export type ComplianceSection = (typeof COMPLIANCE_SECTIONS)[number]['id']

const SECTION_ALIASES: Record<string, ComplianceSection> = {
  ijtema: 'ijtema',
  'weekly-ijtema': 'ijtema',
  'jih-registration': 'jih-registration',
  registration: 'jih-registration',
  'jih-portal': 'jih-registration',
  'monthly-reporting': 'monthly-reporting',
  'jih-reporting': 'monthly-reporting',
  reporting: 'monthly-reporting',
  'baitul-maal': 'baitul-maal',
  baitul_maal: 'baitul-maal',
}

export function resolveComplianceSection(sectionParam: string | null): ComplianceSection {
  if (sectionParam && SECTION_ALIASES[sectionParam]) {
    return SECTION_ALIASES[sectionParam]
  }
  if (COMPLIANCE_SECTIONS.some((section) => section.id === sectionParam)) {
    return sectionParam as ComplianceSection
  }
  return 'ijtema'
}

export function normalizeComplianceStatus(statusParam: string | null): string {
  return statusParam?.trim() ?? ''
}

export const COMPLIANCE_PENDING_STATUS: Record<ComplianceSection, string> = {
  ijtema: 'Not recorded',
  'jih-registration': 'Not Registered',
  'monthly-reporting': 'Pending',
  'baitul-maal': 'Pending',
}

export function resolveComplianceViewFilter(
  section: ComplianceSection,
  statusFilter: string,
  viewAll: boolean,
): { effectiveStatus: string; isPendingView: boolean } {
  if (statusFilter) {
    return { effectiveStatus: statusFilter, isPendingView: false }
  }

  if (viewAll) {
    return { effectiveStatus: '', isPendingView: false }
  }

  return {
    effectiveStatus: COMPLIANCE_PENDING_STATUS[section],
    isPendingView: true,
  }
}

export function getPendingStatusLabel(section: ComplianceSection): string {
  return COMPLIANCE_PENDING_STATUS[section]
}
