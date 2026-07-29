/**
 * Canonical service capability definitions (KC-0131.7).
 * Logical service ids are string metadata only — no platform imports.
 */

import {
  createLogicalServiceRef,
  createServiceCapabilityDefinition,
} from './factories'
import type { ServiceCapabilityDefinition } from './models'
import type { ServiceCapability } from './vocabulary'
import { SERVICE_CAPABILITIES } from './vocabulary'

export const CANONICAL_SERVICE_CAPABILITIES: readonly ServiceCapabilityDefinition[] = [
  createServiceCapabilityDefinition({
    capability: 'VISIT',
    label: 'Visit',
    description: 'Field visit / follow-up platform capabilities',
    relatedAdapterCapabilities: ['VISIT'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'assignmentService',
        label: 'Assignment Service',
        documentedModulePath: 'src/services/assignmentService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'followUpService',
        label: 'Follow-Up Service',
        documentedModulePath: 'src/services/followUpService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'COMMUNICATION',
    label: 'Communication',
    description: 'Messaging / delivery / notification capabilities',
    relatedAdapterCapabilities: ['COMMUNICATION', 'CALL', 'WHATSAPP'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'communicationService',
        label: 'Communication Service',
        documentedModulePath: 'src/services/communicationService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'deliveryService',
        label: 'Delivery Service',
        documentedModulePath: 'src/services/deliveryService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'notificationService',
        label: 'Notification Service',
        documentedModulePath: 'src/services/notificationService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'ATTENDANCE',
    label: 'Attendance',
    description: 'Ijtema attendance capabilities',
    relatedAdapterCapabilities: ['ATTENDANCE'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'ijtemaAttendanceService',
        label: 'Ijtema Attendance Service',
        documentedModulePath: 'src/services/ijtemaAttendanceService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'weeklyIjtemaService',
        label: 'Weekly Ijtema Service',
        documentedModulePath: 'src/services/weeklyIjtemaService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'REPORTING',
    label: 'Reporting',
    description: 'Reports and metrics capabilities',
    relatedAdapterCapabilities: ['REPORTING'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'dailyReportService',
        label: 'Daily Report Service',
        documentedModulePath: 'src/services/dailyReportService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'dashboardMetricsService',
        label: 'Dashboard Metrics Service',
        documentedModulePath: 'src/services/dashboardMetricsService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'metricsService',
        label: 'Metrics Service',
        documentedModulePath: 'src/services/metricsService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'CAMPAIGN',
    label: 'Campaign',
    description: 'Campaign and automation capabilities',
    relatedAdapterCapabilities: [],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'campaignService',
        label: 'Campaign Service',
        documentedModulePath: 'src/services/campaignService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'campaignAutomationEngine',
        label: 'Campaign Automation Engine',
        documentedModulePath: 'src/services/campaignAutomationEngine.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'PEOPLE',
    label: 'People',
    description: 'People lifecycle / classification capabilities',
    relatedAdapterCapabilities: [],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'peopleClassificationService',
        label: 'People Classification Service',
        documentedModulePath: 'src/services/peopleClassificationService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'karkunRequestService',
        label: 'Karkun Request Service',
        documentedModulePath: 'src/services/karkunRequestService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'duplicateResolutionService',
        label: 'Duplicate Resolution Service',
        documentedModulePath: 'src/services/duplicateResolutionService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'REMINDER',
    label: 'Reminder',
    description: 'Scheduling / reminder capabilities',
    relatedAdapterCapabilities: ['REMINDER'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'schedulingService',
        label: 'Scheduling Service',
        documentedModulePath: 'src/services/schedulingService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'SEARCH',
    label: 'Search',
    description: 'People / content search (future bind to existing search libs)',
    relatedAdapterCapabilities: ['SEARCH'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'personSearch',
        label: 'Person Search (logical)',
        documentedModulePath: 'src/lib/personProfile/resolvePersonSearch.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'NAVIGATION',
    label: 'Navigation',
    description: 'In-app navigation — client-side; no backend service',
    relatedAdapterCapabilities: ['NAVIGATION'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'clientNavigation',
        label: 'Client Navigation (logical)',
        documentedModulePath: null,
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'DOCUMENT',
    label: 'Document',
    description: 'Documents / baitul maal / templates',
    relatedAdapterCapabilities: ['DOCUMENT'],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'baitulMaalService',
        label: 'Baitul Maal Service',
        documentedModulePath: 'src/services/baitulMaalService.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'annexure1Service',
        label: 'Annexure 1 Service',
        documentedModulePath: 'src/services/annexure1Service.ts',
      }),
      createLogicalServiceRef({
        serviceId: 'templateService',
        label: 'Template Service',
        documentedModulePath: 'src/services/templateService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'SETTINGS',
    label: 'Settings',
    description: 'Settings / guidance surfaces',
    relatedAdapterCapabilities: [],
    logicalServices: [
      createLogicalServiceRef({
        serviceId: 'guidanceService',
        label: 'Guidance Service',
        documentedModulePath: 'src/services/guidanceService.ts',
      }),
    ],
  }),
  createServiceCapabilityDefinition({
    capability: 'UNKNOWN',
    label: 'Unknown',
    description: 'Unmapped capability placeholder',
    relatedAdapterCapabilities: ['UNKNOWN'],
    logicalServices: [],
  }),
]

const BY_CAPABILITY = new Map(
  CANONICAL_SERVICE_CAPABILITIES.map((d) => [d.capability, d]),
)

export function getServiceCapabilityDefinition(
  capability: ServiceCapability,
): ServiceCapabilityDefinition | null {
  return BY_CAPABILITY.get(capability) ?? null
}

export function listServiceCapabilityDefinitions(): readonly ServiceCapabilityDefinition[] {
  return CANONICAL_SERVICE_CAPABILITIES
}

export function assertCanonicalServiceCapabilityCoverage(): void {
  for (const capability of SERVICE_CAPABILITIES) {
    if (!BY_CAPABILITY.has(capability)) {
      throw new Error(`Missing service capability definition: ${capability}`)
    }
  }
}
