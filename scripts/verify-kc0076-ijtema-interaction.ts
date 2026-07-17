/**
 * KC-007.6 — Prove Ijtema attendance selection is stable (no update loop).
 */
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Window } from 'happy-dom'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { AuthContext } from '../src/context/AuthContext'
import type { AuthContextValue } from '../src/types/auth.types'
import { RuknIjtemaAttendancePanel } from '../src/components/home/RuknIjtemaAttendancePanel'
import { assignKarkun } from '../src/lib/assignmentEngine'
import { clearAssignmentStore } from '../src/stores/assignmentStore'
import { ROUTES } from '../src/constants/routes'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

const happy = new Window({ url: 'http://localhost/rukn' })
Object.assign(globalThis, {
  window: happy,
  document: happy.document,
  HTMLElement: happy.HTMLElement,
  HTMLInputElement: happy.HTMLInputElement,
  Node: happy.Node,
  Text: happy.Text,
  MutationObserver: happy.MutationObserver,
  getComputedStyle: happy.getComputedStyle.bind(happy),
  requestAnimationFrame: (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const rukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
assert(Boolean(rukn), 'need male rukn')

clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0
const karkun: KarkunRegistryRecord = {
  id: 'K-IJTEMA-1',
  name: 'Ijtema Test',
  gender: 'Male',
  mobile: '0300123456',
  place: 'Karachi',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'Verification',
  address: '',
  area: '',
  assignedRukn: '',
  assignedRuknId: '',
  assignmentStatus: 'Available',
  campaignStatus: 'not_assigned',
  visitStatus: 'none',
  lastVisit: null,
  commitment: null,
  currentCommitment: '',
  jihAppRegistrationStatus: 'Not Discussed',
  notes: '',
  isArchived: false,
}
MOCK_KARKUN_REGISTRY.push(karkun)
assert(assignKarkun(karkun.id, rukn!.id, 'Administrator').success, 'assign failed')

const mockAuth: AuthContextValue = {
  user: {
    uid: 'probe',
    email: '',
    phone: rukn!.mobile,
    role: 'rukn',
    ruknId: rukn!.id,
    displayName: rukn!.name,
  },
  status: 'authenticated',
  isAuthenticated: true,
  isInitializing: false,
  loginWithEmail: async () => ({ success: false, error: 'probe' }),
  sendOtp: async () => ({ success: false, error: 'probe' }),
  verifyOtp: async () => ({ success: false, error: 'probe' }),
  resendOtp: async () => ({ success: false, error: 'probe' }),
  resetPassword: async () => ({ success: false, error: 'probe' }),
  reauthenticateWithPassword: async () => false,
  logout: async () => undefined,
}

let depthErrors = 0
const originalError = console.error
console.error = (...args: unknown[]) => {
  if (args.map(String).join(' ').includes('Maximum update depth')) depthErrors += 1
}

const rootEl = happy.document.createElement('div')
happy.document.body.appendChild(rootEl)
const root = createRoot(rootEl)

await act(async () => {
  root.render(
    createElement(
      AuthContext.Provider,
      { value: mockAuth },
      createElement(
        MemoryRouter,
        { initialEntries: [ROUTES.RUKN] },
        createElement(RuknIjtemaAttendancePanel, { ruknId: rukn!.id }),
      ),
    ),
  )
  await new Promise((r) => setTimeout(r, 40))
})

const expand = [...happy.document.querySelectorAll('button')].find((node) =>
  (node.textContent ?? '').includes('Record Attendance'),
) as HTMLButtonElement | undefined
assert(Boolean(expand), 'expand control missing')

await act(async () => {
  expand!.click()
  await new Promise((r) => setTimeout(r, 40))
})

const present = [...happy.document.querySelectorAll('input[type="radio"]')].find((node) =>
  (node.parentElement?.textContent ?? '').includes('Present'),
) as HTMLInputElement | undefined
assert(Boolean(present), 'Present radio missing')

await act(async () => {
  present!.click()
  await new Promise((r) => setTimeout(r, 40))
})

assert(present!.checked, 'Present selection must stick after click')
assert(depthErrors === 0, 'Maximum update depth must not occur')

root.unmount()
console.error = originalError
console.log('[PASS] KC-007.6 Ijtema attendance interaction ok')
