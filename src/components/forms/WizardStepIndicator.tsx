import { WIZARD_STEPS } from '@/constants/mockCampaignSetup'
import type { WizardStep } from '@/types/campaign-setup.types'

type WizardStepIndicatorProps = {
  currentStep: WizardStep
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Campaign setup progress" className="mb-8">
      <ol className="flex flex-wrap gap-2 sm:gap-3">
        {WIZARD_STEPS.map((step) => {
          const isActive = step.number === currentStep
          const isComplete = step.number < currentStep

          return (
            <li
              key={step.number}
              className={[
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm',
                isActive
                  ? 'bg-primary text-surface'
                  : isComplete
                    ? 'bg-primary-muted text-primary'
                    : 'bg-surface-muted text-secondary',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={[
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  isActive
                    ? 'bg-surface text-primary'
                    : isComplete
                      ? 'bg-primary text-surface'
                      : 'bg-border text-secondary',
                ].join(' ')}
              >
                {step.number}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
