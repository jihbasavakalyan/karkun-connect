/**
 * KC-007.6 — Rukn Mission Control: contextual CTA only + mission summary labels.
 */
import { buildRuknMissionControl } from '../src/lib/missionControl/buildRuknMissionControl'
import { buildAdminMissionControl } from '../src/lib/missionControl/buildAdminMissionControl'
import { ROUTES } from '../src/constants/routes'
import type {
  AdminCommandCenterSnapshot,
  RuknCommandCenterSnapshot,
} from '../src/types/campaignAutomation.types'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const emptyAdmin = {
  schedule: [],
  callQueue: [],
  alerts: [],
  followUpQueue: [],
  nextAction: {
    title: 'Review',
    description: '',
    route: ROUTES.ADMIN,
    actionLabel: 'Open',
    isCaughtUp: true,
  },
} as unknown as AdminCommandCenterSnapshot

const emptyRukn = {
  schedule: [],
  callQueue: [],
  followUpQueue: [],
  nextAction: {
    title: 'Visit Pending',
    description: 'Record a visit',
    route: '/rukn/visit/K001',
    actionLabel: 'Record Visit',
    isCaughtUp: false,
  },
} as unknown as RuknCommandCenterSnapshot

const admin = buildAdminMissionControl(emptyAdmin)
assert(admin.quickActions.length > 0, 'admin quick actions missing')

const rukn = buildRuknMissionControl('R001', emptyRukn)
const labels = rukn.quickActions.map((action) => action.label)
const moduleNav = ['Connect', 'Connected', 'Record']

assert(rukn.quickActions.length === 1, 'rukn must have exactly one contextual CTA')
assert(
  !labels.some((label) => moduleNav.includes(label)),
  `Mission Control still has module nav: ${labels.join(', ')}`,
)
assert(
  rukn.quickActions.some((action) => /visit|today/i.test(action.label)),
  'expected Record Visit / Continue Today work action',
)
assert(
  rukn.quickActions[0]?.route === '/rukn/visit/K001',
  'Record Visit route wrong',
)

const summaryLabels = rukn.kpis.map((kpi) => kpi.label)
assert(summaryLabels.includes('Assigned to Me'), 'Assigned to Me missing')
assert(summaryLabels.includes('Visits Today'), 'Visits Today missing')
assert(summaryLabels.includes('Registration Pending'), 'Registration Pending missing')
assert(
  summaryLabels.includes('Participation in Tarbiyati Programme'),
  'Tarbiyati participation missing',
)
assert(
  summaryLabels.includes('Participation in Weekly Ijtema'),
  'Weekly Ijtema participation missing',
)
assert(rukn.kpis.every((kpi) => !kpi.route), 'summary metrics must not be module navigation links')

console.log('[PASS] KC-007.6 Mission Control UX ok')
console.log(
  ' rukn actions:',
  rukn.quickActions.map((action) => `${action.label}→${action.route}`).join(' | '),
)
console.log(
  ' rukn summary:',
  rukn.kpis.map((kpi) => `${kpi.label}=${kpi.value}`).join(' | '),
)
