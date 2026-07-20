import type { ReactNode } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type ModalFormSectionProps = {
  title: string
  children: ReactNode
}

export function ModalFormSection({ title, children }: ModalFormSectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-border pb-2 text-sm font-semibold text-text-heading">{title}</h3>
      {children}
    </section>
  )
}

type ModalFormGridProps = {
  children: ReactNode
}

/** Two columns on desktop (md+), single column on mobile. */
export function ModalFormGrid({ children }: ModalFormGridProps) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
}

type ModalFormFooterProps = {
  onCancel: () => void
  primaryLabel: string
  primaryType?: 'button' | 'submit'
  onPrimaryClick?: () => void
  primaryDisabled?: boolean
  loading?: boolean
  error?: string
  /** Associates submit button with a form outside the footer. */
  formId?: string
}

export function ModalFormFooter({
  onCancel,
  primaryLabel,
  primaryType = 'button',
  onPrimaryClick,
  primaryDisabled = false,
  loading = false,
  error,
  formId,
}: ModalFormFooterProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <SecondaryButton type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type={primaryType}
          form={formId}
          onClick={() => {
            if (primaryLabel === 'Confirm Connection') {
              void import('@/lib/debug/kc0061ConnectTrace').then(
                ({ connectStepEnter, connectStepExit }) => {
                  const span = connectStepEnter('ui.button.onClick', {
                    primaryLabel,
                    primaryDisabled,
                    loading,
                  })
                  connectStepExit(span, 'ui.button.onClick', { invoked: true })
                },
              )
            }
            onPrimaryClick?.()
          }}
          disabled={primaryDisabled || loading}
          loading={loading}
        >
          {loading ? 'Saving…' : primaryLabel}
        </PrimaryButton>
      </div>
    </div>
  )
}
