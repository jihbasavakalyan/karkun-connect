/**
 * Global Digital Rafeeq entry point (KC-006 Sprint 6.6).
 *
 * FAB bottom-right. Opens the existing Admin/Rukn assistant panel.
 * Hidden when digitalRafeeq.enabled is false or runtime is unavailable.
 * Voice is a Version 1 placeholder only — no speech recognition.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { AdminAssistantCard } from '@/features/digitalRafeeq/admin/AdminAssistantCard'
import { useAdminAssistant } from '@/features/digitalRafeeq/admin/AdminAssistantHooks'
import { RuknAssistantCard } from '@/features/digitalRafeeq/rukn/RuknAssistantCard'
import { useRuknAssistant } from '@/features/digitalRafeeq/rukn/RuknAssistantHooks'
import { getDigitalRafeeqService } from '@/runtime/service'

export type DigitalRafeeqLauncherRole = 'administrator' | 'rukn'

type DigitalRafeeqLauncherProps = {
  role: DigitalRafeeqLauncherRole
  /** Offset when another FAB shares the corner (e.g. Rukn quick actions). */
  offsetClassName?: string
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

function AdminLauncherPanel() {
  const { loading, viewModel } = useAdminAssistant()
  return <AdminAssistantCard viewModel={viewModel} loading={loading} />
}

function RuknLauncherPanel() {
  const { loading, viewModel } = useRuknAssistant()
  return <RuknAssistantCard viewModel={viewModel} loading={loading} />
}

export function DigitalRafeeqLauncher({
  role,
  offsetClassName = '',
}: DigitalRafeeqLauncherProps) {
  const enabled = getDigitalRafeeqService().isEnabled()
  const available = useRuntimeAvailable(enabled)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!enabled || !available) {
    return null
  }

  return (
    <div
      ref={rootRef}
      className={['digital-rafeeq-fab-root', offsetClassName].filter(Boolean).join(' ')}
    >
      {open && (
        <div
          className="digital-rafeeq-fab-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="digital-rafeeq-fab-sheet-header">
            <div>
              <h2 id={titleId} className="text-base font-semibold text-text-heading">
                Digital Rafeeq
              </h2>
              <p className="text-xs text-secondary">
                {role === 'administrator' ? 'Administrator context' : 'Rukn context'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-secondary hover:bg-surface-muted hover:text-text-heading"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              <Icon name="x" size="sm" />
            </button>
          </div>

          <div className="digital-rafeeq-fab-sheet-body">
            {role === 'administrator' ? <AdminLauncherPanel /> : <RuknLauncherPanel />}
          </div>

          <p className="digital-rafeeq-fab-voice-note">
            Voice input placeholder — speech recognition is not available in Version 1.
          </p>
        </div>
      )}

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
  )
}
