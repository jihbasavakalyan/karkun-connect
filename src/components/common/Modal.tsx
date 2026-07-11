import { useEffect, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

type ModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** When set, stays pinned below the scrollable body (Cancel / primary actions). */
  footer?: ReactNode
  /** Widen modal for denser selection UIs (e.g. connection picker). */
  size?: 'md' | 'lg'
}

export function Modal({ isOpen, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-text-heading/40"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden rounded-(--radius-card) border border-border bg-surface shadow-card',
          'max-h-[min(92svh,40rem)]',
          size === 'lg' ? 'max-w-xl' : 'max-w-lg',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 id="modal-title" className="text-xl font-semibold text-text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-secondary hover:bg-surface-muted hover:text-text-heading"
            aria-label="Close"
          >
            <Icon name="x" size="md" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
