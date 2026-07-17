/**
 * KC-007.3 — Runtime evidence harness (no app source changes).
 * Renders real Rukn routes with mocked auth and dumps DOM + React fiber chains.
 */
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Window } from 'happy-dom'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'docs', 'kc0073-runtime-evidence')

const happy = new Window({ url: 'http://localhost/', width: 1280, height: 900 })
const { document } = happy
Object.assign(globalThis, {
  window: happy,
  document,
  HTMLElement: happy.HTMLElement,
  HTMLButtonElement: happy.HTMLButtonElement,
  HTMLInputElement: happy.HTMLInputElement,
  Node: happy.Node,
  Text: happy.Text,
  DocumentFragment: (happy as unknown as { DocumentFragment: typeof DocumentFragment }).DocumentFragment,
  MutationObserver: happy.MutationObserver,
  getComputedStyle: happy.getComputedStyle.bind(happy),
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})

import { AuthContext } from '../src/context/AuthContext'
import type { AuthContextValue } from '../src/types/auth.types'
import { markRepositoryHydrationReady } from '../src/repositories/hydrationReady'
import { ROUTES } from '../src/constants/routes'
import { RuknLayout } from '../src/layouts/RuknLayout'
import { RuknHomePage } from '../src/pages/rukn/RuknHomePage'
import { ConnectionJourneyPage } from '../src/pages/rukn/ConnectionJourneyPage'
import { AvailableKarkunPage } from '../src/pages/rukn/AvailableKarkunPage'
import { MyKarkunPage } from '../src/pages/rukn/MyKarkunPage'
import { CampaignRecordPage } from '../src/pages/rukn/CampaignRecordPage'
import { RuntimeProvider } from '../src/runtime/bootstrap'
import { ruknMaster } from '../src/data/ruknMaster'

markRepositoryHydrationReady()

const ruknId = ruknMaster[0]?.id ?? 'R001'

const mockAuth: AuthContextValue = {
  user: {
    uid: 'probe-uid',
    email: '',
    phone: ruknMaster[0]?.mobile,
    role: 'rukn',
    ruknId,
    displayName: ruknMaster[0]?.name,
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

function getFiber(node: Element | null): Record<string, unknown> | null {
  if (!node) return null
  const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
  return key ? ((node as unknown as Record<string, unknown>)[key] as Record<string, unknown>) : null
}

function fiberName(fiber: Record<string, unknown> | null | undefined): string {
  if (!fiber) return '(null)'
  const type = fiber.type as unknown
  if (typeof type === 'string') return type
  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string }
    return fn.displayName || fn.name || 'Anonymous'
  }
  if (type && typeof type === 'object') {
    const t = type as { displayName?: string; render?: { name?: string } }
    return t.displayName || t.render?.name || 'Memo/ForwardRef'
  }
  return 'Unknown'
}

function walkFiber(el: Element | null, limit = 50): string[] {
  const names: string[] = []
  let current: Record<string, unknown> | null | undefined = getFiber(el)
  let i = 0
  while (current && i < limit) {
    const name = fiberName(current)
    if (
      name !== 'Unknown' &&
      name !== 'Anonymous' &&
      !name.includes('Fragment') &&
      name !== 'div' &&
      name !== 'nav' &&
      name !== 'header' &&
      name !== 'button' &&
      name !== 'a' &&
      name !== 'p' &&
      name !== 'span' &&
      name !== 'ul' &&
      name !== 'li' &&
      name !== 'main'
    ) {
      names.push(name)
    }
    current = current.return as Record<string, unknown> | null
    i += 1
  }
  return names
}

function LocationProbe() {
  const location = useLocation()
  return createElement('div', {
    id: 'location-probe',
    'data-pathname': location.pathname,
  })
}

function AuthShell({ children }: { children: ReactNode }) {
  return createElement(
    AuthContext.Provider,
    { value: mockAuth },
    createElement(RuntimeProvider, null, children),
  )
}

function AppTree({ initialPath }: { initialPath: string }) {
  return createElement(
    AuthShell,
    null,
    createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(LocationProbe),
      createElement(
        Routes,
        null,
        createElement(
          Route,
          { path: ROUTES.RUKN, element: createElement(RuknLayout) },
          createElement(Route, { index: true, element: createElement(RuknHomePage) }),
          createElement(Route, {
            path: 'available-karkun',
            element: createElement(AvailableKarkunPage),
          }),
          createElement(Route, { path: 'my-karkun', element: createElement(MyKarkunPage) }),
          createElement(Route, {
            path: 'visit/:karkunId',
            element: createElement(ConnectionJourneyPage),
          }),
          createElement(Route, {
            path: 'campaign-record',
            element: createElement(CampaignRecordPage),
          }),
        ),
        createElement(Route, {
          path: '*',
          element: createElement(Navigate, { to: ROUTES.RUKN, replace: true }),
        }),
      ),
    ),
  )
}

function collectQuickActionEvidence(root: HTMLElement) {
  const quickNav = root.querySelector('.mc-quick-actions, nav[aria-label="Quick actions"]')
  const buttons = Array.from(
    root.querySelectorAll(
      '.mc-quick-actions button, .mc-quick-actions a, nav[aria-label="Quick actions"] button, nav[aria-label="Quick actions"] a',
    ),
  )

  const buttonReports = buttons.map((el) => {
    const btn = el as HTMLButtonElement
    const reactPropsKey = Object.keys(el).find((k) => k.startsWith('__reactProps$'))
    const props = reactPropsKey
      ? ((el as unknown as Record<string, unknown>)[reactPropsKey] as Record<string, unknown>)
      : null
    const onClick = props?.onClick
    return {
      text: (el.textContent || '').trim(),
      tag: el.tagName,
      disabled: Boolean(btn.disabled),
      className: el.className,
      hasOnClickProp: typeof onClick === 'function',
      fiberChain: walkFiber(el),
    }
  })

  const missionEl = Array.from(root.querySelectorAll('p,h1,h2')).find((el) =>
    /Today'?s Mission/i.test(el.textContent || ''),
  )

  const bottomNav = root.querySelector('nav[aria-label="Rukn navigation"]')
  const bottomLinks = Array.from(bottomNav?.querySelectorAll('a') ?? []).map((a) => ({
    text: (a.textContent || '').trim().replace(/\s+/g, ' '),
    href: a.getAttribute('href'),
    fiberChain: walkFiber(a).slice(0, 12),
  }))

  return {
    pathname: root.querySelector('#location-probe')?.getAttribute('data-pathname'),
    hasMcHero: Boolean(root.querySelector('.mc-hero, [aria-label="Rukn Mission Control"]')),
    hasMcQuickActions: Boolean(quickNav),
    hasTodaysMissionCopy: Boolean(missionEl),
    hasAskRafeeq: /Ask Digital Rafeeq|Voice Assistant/i.test(root.innerText),
    missionFiber: walkFiber(missionEl ?? null),
    quickNavFiber: walkFiber(quickNav),
    quickButtons: buttonReports,
    bottomNavLinks: bottomLinks,
    bodyTextSample: root.innerText.slice(0, 1500),
  }
}

function hitTestOverlays(root: HTMLElement, target: Element | null) {
  if (!target) return null
  const rect = target.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const stack: Array<Record<string, unknown>> = []
  // happy-dom may not fully implement elementsFromPoint — fallback walk
  const all = Array.from(root.querySelectorAll('*')) as HTMLElement[]
  for (const el of all) {
    const style = happy.getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const covers =
      r.left <= x && r.right >= x && r.top <= y && r.bottom >= y && r.width > 0 && r.height > 0
    if (!covers) continue
    const pe = style.pointerEvents
    const z = style.zIndex
    const pos = style.position
    if (pe === 'none') continue
    if (pos === 'fixed' || pos === 'absolute' || Number(z) > 0 || el.className.includes('overlay')) {
      stack.push({
        tag: el.tagName,
        className: String(el.className).slice(0, 120),
        pointerEvents: pe,
        zIndex: z,
        position: pos,
        opacity: style.opacity,
      })
    }
  }
  return { x, y, coveringCandidates: stack.slice(0, 30) }
}

async function renderPath(path: string) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(createElement(AppTree, { initialPath: path }))
  await new Promise((r) => setTimeout(r, 100))
  await new Promise((r) => setTimeout(r, 200))

  const evidence = collectQuickActionEvidence(host)
  const connectBtn = Array.from(host.querySelectorAll('button,a')).find(
    (el) => (el.textContent || '').trim() === 'Connect' && el.className.includes('mc-quick'),
  )
  const clickTrace: Record<string, unknown> = { attempted: false }

  if (connectBtn) {
    clickTrace.attempted = true
    const stages: string[] = []
    const onPointerDown = () => stages.push('pointerdown')
    const onClickCapture = () => stages.push('click-capture')
    const onClickBubble = () => stages.push('click-bubble')
    connectBtn.addEventListener('pointerdown', onPointerDown)
    connectBtn.addEventListener('click', onClickCapture, true)
    connectBtn.addEventListener('click', onClickBubble)

    const before = host.querySelector('#location-probe')?.getAttribute('data-pathname')
    ;(connectBtn as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 50))
    const after = host.querySelector('#location-probe')?.getAttribute('data-pathname')

    clickTrace.stages = stages
    clickTrace.beforePath = before
    clickTrace.afterPath = after
    clickTrace.navigated = before !== after
    clickTrace.overlays = hitTestOverlays(host, connectBtn)

    connectBtn.removeEventListener('pointerdown', onPointerDown)
    connectBtn.removeEventListener('click', onClickCapture, true)
    connectBtn.removeEventListener('click', onClickBubble)
  } else {
    // Any visible "Connect" (bottom nav or elsewhere)
    const anyConnect = Array.from(host.querySelectorAll('a,button')).find((el) =>
      /^\s*Connect\s*$/m.test((el.textContent || '').replace(/\s+/g, ' ').trim()) ||
      /Connect/.test(el.textContent || '') && el.closest('nav[aria-label="Rukn navigation"]'),
    )
    clickTrace.note = 'No .mc-quick-action Connect button mounted'
    clickTrace.anyConnectInBottomNav = Boolean(
      host.querySelector('nav[aria-label="Rukn navigation"] a[href="/rukn/available-karkun"]'),
    )
    clickTrace.overlaysAtHeroArea = hitTestOverlays(
      host,
      host.querySelector('.mc-hero') || host.querySelector('main') || host,
    )
    void anyConnect
  }

  const snapshot = {
    path,
    evidence,
    clickTrace,
  }

  root.unmount()
  host.remove()
  return snapshot
}

await mkdir(OUT, { recursive: true })

const home = await renderPath('/rukn')
const visit = await renderPath('/rukn/visit/K001')
const visitLiteral = await renderPath('/rukn/visit/:id')

const report = {
  title: 'KC-007.3 Runtime Click Investigation',
  ruknIdUsed: ruknId,
  comparison: {
    homeHasMcQuickActions: home.evidence.hasMcQuickActions,
    visitHasMcQuickActions: visit.evidence.hasMcQuickActions,
    visitLiteralHasMcQuickActions: visitLiteral.evidence.hasMcQuickActions,
    homeHasTodaysMission: home.evidence.hasTodaysMissionCopy,
    visitHasTodaysMission: visit.evidence.hasTodaysMissionCopy,
  },
  home,
  visit,
  visitLiteral,
  conclusionHints: {
    ifVisitLacksMcQuick:
      'ConnectionJourneyPage does not mount MissionControlQuickActions at runtime in this harness.',
    ifHomeClickNavigates: 'MissionControlQuickActions onClick→navigate works when mounted on Home.',
  },
}

await writeFile(join(OUT, 'evidence.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
