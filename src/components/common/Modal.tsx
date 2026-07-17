import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'

type ModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** When set, stays pinned below the scrollable body (Cancel / primary actions). */
  footer?: ReactNode
  /** Desktop width; `form` is the standard ~740px layout for edit/add modals. */
  size?: 'form' | 'md' | 'lg'
}

const MODAL_WIDTH_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  form: 'max-w-[740px]',
  md: 'max-w-lg',
  lg: 'max-w-[740px]',
}

export function Modal({ isOpen, title, onClose, children, footer, size = 'form' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-3 sm:items-center sm:p-4"
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
          'max-h-[90vh]',
          MODAL_WIDTH_CLASS[size],
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
          <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
    ,
    document.body,
  )
}
