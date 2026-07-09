import { CampaignChecklist } from '@/components/forms/CampaignChecklist'
import { WizardNavigation } from '@/components/forms/WizardNavigation'
import { WizardStepIndicator } from '@/components/forms/WizardStepIndicator'
import {
  StepAssignmentPreview,
  StepCampaignInfo,
  StepCampaignReview,
  StepKarkunan,
  StepLaunchCampaign,
  StepRukn,
} from '@/components/forms/campaign-setup'
import { TOTAL_WIZARD_STEPS } from '@/constants/mockCampaignSetup'
import { useCampaignSetupWizard } from '@/hooks/useCampaignSetupWizard'
import { PageHeader, PageShell } from '@/components/ui'

export function CampaignSetupPage() {
  const { state, dispatch, goNext, goBack, launchCampaign } = useCampaignSetupWizard()

  return (
    <PageShell>
      <PageHeader
        title="Campaign Setup"
        description={`Configure your campaign in ${TOTAL_WIZARD_STEPS} steps before launch.`}
      />

      <div className="mb-6 lg:hidden">
        <CampaignChecklist state={state} />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
        <div>
          <WizardStepIndicator currentStep={state.step} />

          <div className="ds-section sm:p-8">
            {state.step === 1 && <StepCampaignInfo state={state} dispatch={dispatch} />}
            {state.step === 2 && <StepRukn state={state} dispatch={dispatch} />}
            {state.step === 3 && <StepKarkunan state={state} dispatch={dispatch} />}
            {state.step === 4 && <StepAssignmentPreview state={state} />}
            {state.step === 5 && <StepCampaignReview state={state} />}
            {state.step === 6 && (
              <StepLaunchCampaign state={state} onLaunch={launchCampaign} />
            )}

            {state.step < 6 && (
              <WizardNavigation
                currentStep={state.step}
                onBack={goBack}
                onNext={goNext}
                nextLabel={state.step === 5 ? 'Continue to Launch' : 'Continue'}
              />
            )}

            {state.step === 6 && !state.isLaunched && (
              <WizardNavigation
                currentStep={state.step}
                onBack={goBack}
                onNext={goNext}
                showNext={false}
              />
            )}
          </div>
        </div>

        <div className="hidden lg:sticky lg:top-6 lg:block">
          <CampaignChecklist state={state} />
        </div>
      </div>
    </PageShell>
  )
}
