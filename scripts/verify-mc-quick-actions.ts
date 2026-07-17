/**
 * KC-007.2 — Mission Control quick action route wiring (no crash / shape check).
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
for (const action of admin.quickActions) {
  assert(Boolean(action.route), `admin action ${action.id} missing route`)
  assert(action.route.startsWith('/'), `admin action ${action.id} route invalid`)
}

const rukn = buildRuknMissionControl('R001', emptyRukn)
const byId = Object.fromEntries(rukn.quickActions.map((action) => [action.id, action]))

assert(byId.connect?.route === ROUTES.RUKN_AVAILABLE_KARKUN, 'Connect route wrong')
assert(byId.connected?.route === ROUTES.RUKN_MY_KARKUN, 'Connected route wrong')
assert(byId.record?.route === ROUTES.RUKN_CAMPAIGN_RECORD, 'Record route wrong')
assert(byId['record-visit']?.label === 'Record Visit', 'Record Visit label missing')
assert(byId['record-visit']?.route === '/rukn/visit/K001', 'Record Visit route wrong')

console.log('[PASS] KC-007.2 Mission Control quick action routes ok')
console.log(
  ' rukn:',
  rukn.quickActions.map((action) => `${action.label}→${action.route}`).join(' | '),
)
