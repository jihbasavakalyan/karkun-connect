/**
 * NAVIGATION adapter — resolves to existing ROUTES only.
 */

import type { ExecutionStep } from '../../secretary/plans'
import type { AdapterContext, ExecutionAdapter } from '../../executionAdapters'
import {
  createAdapterError,
  createAdapterMetadata,
  createAdapterResult,
} from '../../executionAdapters'
import { resolveNavigationTarget } from '../navigationMap'
import type { RafeeqRole } from '../types'

export const NAVIGATION_ADAPTER_ID = 'mvp-navigation-routes'

export function createNavigationAdapter(): ExecutionAdapter {
  return {
    metadata: createAdapterMetadata({
      adapterId: NAVIGATION_ADAPTER_ID,
      capability: 'NAVIGATION',
      name: 'MVP Navigation Adapter',
      description: 'Maps navigation targets to existing ROUTES helpers',
      priority: 100,
      available: true,
      isPlaceholder: false,
      extensions: { readOnly: true },
    }),
    adapt(step: ExecutionStep, context: AdapterContext) {
      const target =
        typeof context.extensions['navigationTarget'] === 'string'
          ? context.extensions['navigationTarget']
          : typeof step.metadata['navigationTarget'] === 'string'
            ? String(step.metadata['navigationTarget'])
            : null
      const role =
        (context.extensions['role'] as RafeeqRole | undefined) ??
        context.role ??
        'administrator'

      if (!target) {
        return createAdapterResult({
          status: 'error',
          capability: 'NAVIGATION',
          adapterId: NAVIGATION_ADAPTER_ID,
          stepId: step.id,
          summary: 'Missing navigation target',
          isPlaceholder: false,
          invokedService: false,
          error: createAdapterError({
            code: 'invalid_mapping',
            message: 'navigationTarget required',
            capability: 'NAVIGATION',
            adapterId: NAVIGATION_ADAPTER_ID,
            stepId: step.id,
          }),
        })
      }

      const resolved = resolveNavigationTarget(target, role === 'rukn' ? 'rukn' : 'administrator')
      if (!resolved) {
        return createAdapterResult({
          status: 'unsupported',
          capability: 'NAVIGATION',
          adapterId: NAVIGATION_ADAPTER_ID,
          stepId: step.id,
          summary: `Unknown navigation target: ${target}`,
          isPlaceholder: false,
          invokedService: false,
          error: createAdapterError({
            code: 'capability_unsupported',
            message: `Unknown target ${target}`,
            capability: 'NAVIGATION',
            adapterId: NAVIGATION_ADAPTER_ID,
            stepId: step.id,
          }),
        })
      }

      return createAdapterResult({
        status: 'success',
        capability: 'NAVIGATION',
        adapterId: NAVIGATION_ADAPTER_ID,
        stepId: step.id,
        summary: `Navigate to ${resolved.label}`,
        isPlaceholder: false,
        invokedService: true,
        metadata: {
          readOnly: true,
          wroteData: false,
          route: resolved.route,
          label: resolved.label,
          target: resolved.target,
        },
      })
    },
  }
}
