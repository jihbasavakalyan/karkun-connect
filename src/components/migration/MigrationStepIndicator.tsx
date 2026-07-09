import { MIGRATION_WIZARD_STEPS, type MigrationWizardStep } from '@/types/dataMigration'

type MigrationStepIndicatorProps = {
  currentStep: MigrationWizardStep
}

export function MigrationStepIndicator({ currentStep }: MigrationStepIndicatorProps) {
  return (
    <nav aria-label="Data migration progress" className="mt-4">
      <ol className="flex flex-wrap gap-2">
        {MIGRATION_WIZARD_STEPS.map((step) => {
          const isActive = step.number === currentStep
          const isComplete = step.number < currentStep

          return (
            <li
              key={step.number}
              className={[
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm',
                isActive
                  ? 'bg-primary text-white'
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
                    ? 'bg-white text-primary'
                    : isComplete
                      ? 'bg-primary text-white'
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
