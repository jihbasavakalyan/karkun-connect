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
  form: 'kc-modal-panel-form',
  md: 'kc-modal-panel-md',
  lg: 'kc-modal-panel-lg',
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
    <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button
        type="button"
        className="kc-modal-backdrop"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div className={`kc-modal-panel ${MODAL_WIDTH_CLASS[size]}`}>
        <div className="kc-modal-header">
          <h2 id="modal-title" className="kc-modal-title">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="kc-modal-close" aria-label="Close">
            <Icon name="x" size="md" />
          </button>
        </div>

        <div className="kc-modal-body">{children}</div>

        {footer ? <div className="kc-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
