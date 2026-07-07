import { updateAutomationRule } from '@/stores/communicationStore'
import { useCommunication } from '@/hooks/useCommunication'
import { AUTOMATION_TRIGGER_LABELS } from '@/types/communication'

export function AutomationRulesPanel() {
  const { automationRules, templates } = useCommunication()

  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? id

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Event-driven automation rules for future sprints. Rules are designed but not scheduled or
        dispatched in Sprint 15.
      </p>

      <ul className="space-y-3">
        {automationRules.map((rule) => (
          <li
            key={rule.id}
            className="rounded-lg border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-heading">{rule.name}</p>
                <p className="mt-1 text-sm text-secondary">{rule.description}</p>
                <dl className="mt-2 grid gap-1 text-xs text-secondary sm:grid-cols-2">
                  <div>
                    <dt className="inline font-medium">Trigger: </dt>
                    <dd className="inline">{AUTOMATION_TRIGGER_LABELS[rule.trigger]}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Template: </dt>
                    <dd className="inline">{templateName(rule.templateId)}</dd>
                  </div>
                  {rule.delayDays !== undefined && (
                    <div>
                      <dt className="inline font-medium">Delay: </dt>
                      <dd className="inline">{rule.delayDays} days</dd>
                    </div>
                  )}
                </dl>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.isEnabled}
                  onChange={(event) =>
                    updateAutomationRule({
                      ...rule,
                      isEnabled: event.target.checked,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="size-4 rounded border-border text-primary"
                />
                <span className="font-medium text-text-heading">Enabled</span>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
