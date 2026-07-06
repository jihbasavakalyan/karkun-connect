import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
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

      <div className="relative z-10 max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-semibold text-text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-secondary hover:bg-surface-muted hover:text-text-heading"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
