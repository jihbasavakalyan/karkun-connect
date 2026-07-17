import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Window } from 'happy-dom'
import { AuthContext } from '../src/context/AuthContext'
import { markRepositoryHydrationReady } from '../src/repositories/hydrationReady'
import { MissionControlQuickActions } from '../src/components/mission-control/MissionControlQuickActions'
import { ROUTES } from '../src/constants/routes'

const happy = new Window({ url: 'http://localhost/' })
Object.assign(globalThis, {
  window: happy,
  document: happy.document,
  HTMLElement: happy.HTMLElement,
  Node: happy.Node,
  Text: happy.Text,
  requestAnimationFrame: (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
})
markRepositoryHydrationReady()

const auth = {
  user: { uid: 'u', email: '', role: 'rukn' as const, ruknId: 'R001' },
  status: 'authenticated' as const,
  isAuthenticated: true,
  isInitializing: false,
  loginWithEmail: async () => ({ success: false as const, error: '' }),
  sendOtp: async () => ({ success: false as const, error: '' }),
  verifyOtp: async () => ({ success: false as const, error: '' }),
  resendOtp: async () => ({ success: false as const, error: '' }),
  resetPassword: async () => ({ success: false as const, error: '' }),
  reauthenticateWithPassword: async () => false,
  logout: async () => undefined,
}

function Probe() {
  const loc = useLocation()
  const nav = useNavigate()
  ;(globalThis as unknown as { __nav: typeof nav }).__nav = nav
  return createElement(
    'div',
    null,
    createElement('div', { id: 'path' }, loc.pathname),
    createElement(MissionControlQuickActions, {
      actions: [
        { id: 'connect', label: 'Connect', route: ROUTES.RUKN_AVAILABLE_KARKUN },
        { id: 'connected', label: 'Connected', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'record', label: 'Record', route: ROUTES.RUKN_CAMPAIGN_RECORD },
        { id: 'record-visit', label: 'Record Visit', route: '/rukn/visit/K001' },
      ],
    }),
  )
}

const host = happy.document.createElement('div')
happy.document.body.appendChild(host)
const root = createRoot(host)
await act(async () => {
  root.render(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(
        MemoryRouter,
        { initialEntries: ['/rukn'] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '*', element: createElement(Probe) }),
        ),
      ),
    ),
  )
})
await new Promise((r) => setTimeout(r, 50))

const btn = host.querySelector('button') as HTMLButtonElement
const propsKey = Object.keys(btn).find((k) => k.startsWith('__reactProps$'))!
const props = (btn as unknown as Record<string, Record<string, unknown>>)[propsKey]

console.log('before', host.querySelector('#path')?.textContent)
console.log('hasOnClick', typeof props.onClick)

await act(async () => {
  ;(props.onClick as (e: unknown) => void)({
    preventDefault() {},
    stopPropagation() {},
  })
})
await new Promise((r) => setTimeout(r, 50))
console.log('after direct onClick', host.querySelector('#path')?.textContent)

await act(async () => {
  ;(globalThis as unknown as { __nav: (to: string) => void }).__nav('/rukn/my-karkun')
})
await new Promise((r) => setTimeout(r, 50))
console.log('after direct navigate', host.querySelector('#path')?.textContent)
