/**
 * Global Digital Rafeeq entry point (KC-007).
 *
 * FAB + voice assistant drawer. Compact dashboard card can dispatch open event.
 */

import { lazy, Suspense, useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { getDigitalRafeeqService } from '@/runtime/service'

const DigitalRafeeqVoiceDrawer = lazy(() =>
  import('../voice/DigitalRafeeqVoiceDrawer').then((module) => ({
    default: module.DigitalRafeeqVoiceDrawer,
  })),
)

export type DigitalRafeeqLauncherRole = 'administrator' | 'rukn'

type DigitalRafeeqLauncherProps = {
  role: DigitalRafeeqLauncherRole
  offsetClassName?: string
}

export const DIGITAL_RAFEEQ_OPEN_EVENT = 'digital-rafeeq:open'

export function openDigitalRafeeqAssistant(): void {
  window.dispatchEvent(new CustomEvent(DIGITAL_RAFEEQ_OPEN_EVENT))
}

function useRuntimeAvailable(enabled: boolean): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setAvailable(false)
      return
    }

    let cancelled = false
    const service = getDigitalRafeeqService()

    void (async () => {
      try {
        await service.initialize()
        if (cancelled) return
        setAvailable(service.isReady())
      } catch {
        if (!cancelled) setAvailable(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return available
}

export function DigitalRafeeqLauncher({
  role,
  offsetClassName = '',
}: DigitalRafeeqLauncherProps) {
  const enabled = getDigitalRafeeqService().isEnabled()
  const available = useRuntimeAvailable(enabled)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      if (enabled && available) setOpen(true)
    }
    window.addEventListener(DIGITAL_RAFEEQ_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(DIGITAL_RAFEEQ_OPEN_EVENT, handleOpen)
  }, [enabled, available])

  if (!enabled || !available) {
    return null
  }

  return (
    <>
      <div className={['digital-rafeeq-fab-root', offsetClassName].filter(Boolean).join(' ')}>
        <button
          type="button"
          className={`digital-rafeeq-fab-trigger ${open ? 'digital-rafeeq-fab-trigger-open' : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? 'Close Digital Rafeeq assistant' : 'Open Digital Rafeeq assistant'}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="digital-rafeeq-fab-icons" aria-hidden="true">
            <Icon name="mic" size="sm" />
            <Icon name="sparkles" size="sm" />
          </span>
        </button>
      </div>

      <Suspense fallback={null}>
        <DigitalRafeeqVoiceDrawer role={role} open={open} onClose={() => setOpen(false)} />
      </Suspense>
    </>
  )
}
