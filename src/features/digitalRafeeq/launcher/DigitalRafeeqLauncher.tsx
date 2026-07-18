/**
 * Global Digital Rafeeq entry point (KC-007 / KC-027F).
 *
 * FAB is always available when enabled. The voice drawer chunk, runtime, and
 * automation hooks mount only after the user opens the assistant.
 */

import { Suspense, useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { lazyWithChunkReload } from '@/lib/lazyWithChunkReload'
import { getDigitalRafeeqService } from '@/runtime/service'

const DigitalRafeeqVoiceDrawer = lazyWithChunkReload(() =>
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

export function DigitalRafeeqLauncher({
  role,
  offsetClassName = '',
}: DigitalRafeeqLauncherProps) {
  const enabled = getDigitalRafeeqService().isEnabled()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      if (enabled) setOpen(true)
    }
    window.addEventListener(DIGITAL_RAFEEQ_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(DIGITAL_RAFEEQ_OPEN_EVENT, handleOpen)
  }, [enabled])

  if (!enabled) {
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

      {open ? (
        <Suspense fallback={null}>
          <DigitalRafeeqVoiceDrawer role={role} open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  )
}
