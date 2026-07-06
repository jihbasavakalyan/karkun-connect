import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { TOTAL_WIZARD_STEPS } from '@/constants/mockCampaignSetup'
import type { WizardStep } from '@/types/campaign-setup.types'

type WizardNavigationProps = {
  currentStep: WizardStep
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  showNext?: boolean
}

export function WizardNavigation({
  currentStep,
  onBack,
  onNext,
  nextLabel = 'Continue',
  showNext = true,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === TOTAL_WIZARD_STEPS

  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {!isFirstStep ? (
        <SecondaryButton type="button" onClick={onBack} className="sm:min-w-[120px]">
          Back
        </SecondaryButton>
      ) : (
        <span className="hidden sm:block" />
      )}

      {showNext && !isLastStep && (
        <PrimaryButton type="button" onClick={onNext} className="sm:min-w-[120px]">
          {nextLabel}
        </PrimaryButton>
      )}
    </div>
  )
}
