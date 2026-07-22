/**
 * KC-0077.2.1 — Editable subject/body composer fields shared by single + bulk composers.
 * Templates are starting points; official playbook rows are never overwritten here.
 */
import { useRef, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { listMailMergeVariablesForAudience } from '@/lib/communication/mailMergeVariables'
import {
  extractTemplateVariables,
  getTemplate,
  listTemplates,
  saveTemplate,
} from '@/services/templateService'
import type { MessageRecipientKind, MessageTemplate } from '@/types/communication'
import { TEMPLATE_CATEGORY_LABELS } from '@/types/communication'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export type ComposerMode = 'official' | 'custom'

type EditableCommunicationComposerFieldsProps = {
  mode: ComposerMode
  onModeChange: (mode: ComposerMode) => void
  templateId: string
  templates: MessageTemplate[]
  onTemplateChange: (templateId: string) => void
  subject: string
  onSubjectChange: (subject: string) => void
  message: string
  onMessageChange: (message: string) => void
  /** When true, body is read-only (Rukn + official template). */
  isBodyLocked: boolean
  audience: MessageRecipientKind | 'all'
  recommendedTemplateId?: string
  roleHint?: 'administrator' | 'rukn'
  /** Called after a custom template is saved so parents can refresh template lists. */
  onCustomTemplateSaved?: (template: MessageTemplate) => void
}

export function EditableCommunicationComposerFields({
  mode,
  onModeChange,
  templateId,
  templates,
  onTemplateChange,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  isBodyLocked,
  audience,
  recommendedTemplateId,
  roleHint = 'administrator',
  onCustomTemplateSaved,
}: EditableCommunicationComposerFieldsProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')
  const [variableAudience, setVariableAudience] = useState<MessageRecipientKind>(
    audience === 'all' ? 'rukn' : audience,
  )

  const selectedTemplate = templates.find((item) => item.id === templateId)
  const canReset =
    Boolean(templateId) &&
    Boolean(selectedTemplate?.isOfficial) &&
    mode === 'official' &&
    !isBodyLocked

  const handleModeChange = (next: ComposerMode) => {
    onModeChange(next)
    setSaveStatus('')
    setSaveError('')
    if (next === 'custom') {
      onTemplateChange('')
      onSubjectChange('')
      onMessageChange('')
      return
    }
    // Official: keep current template selection if any; otherwise leave blank for picker.
  }

  const insertVariable = (key: string) => {
    if (!key || isBodyLocked) return
    const token = `{{${key}}}`
    const el = bodyRef.current
    if (!el) {
      onMessageChange(`${message}${token}`)
      return
    }
    const start = el.selectionStart ?? message.length
    const end = el.selectionEnd ?? message.length
    const next = `${message.slice(0, start)}${token}${message.slice(end)}`
    onMessageChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + token.length
      el.setSelectionRange(caret, caret)
    })
  }

  const handleReset = () => {
    if (!templateId) return
    const official = getTemplate(templateId)
    if (!official?.isOfficial) return
    onSubjectChange(official.subject ?? '')
    onMessageChange(official.body)
    setSaveStatus('Reset to official template.')
    setSaveError('')
  }

  const handleSaveAsNew = () => {
    setSaveStatus('')
    setSaveError('')
    if (isBodyLocked) {
      setSaveError('Official wording is locked for this role.')
      return
    }
    if (!message.trim()) {
      setSaveError('Message body is required to save a template.')
      return
    }
    const suggested =
      selectedTemplate && !selectedTemplate.isOfficial
        ? `${selectedTemplate.name} (copy)`
        : selectedTemplate
          ? `${selectedTemplate.name} (custom)`
          : 'Custom communication'
    const name = window.prompt('Name for the new custom template:', suggested)?.trim()
    if (!name) return

    try {
      const sourceText = `${subject}\n${message}`
      const updatedBy = roleHint === 'administrator' ? 'Administrator' : 'Rukn'
      const saved = saveTemplate(
        {
          name,
          category: 'custom',
          subject: subject.trim() || undefined,
          body: message,
          variables: extractTemplateVariables(sourceText),
          isActive: true,
          isOfficial: false,
          footerMode: roleHint === 'administrator' ? 'official' : 'personal',
          updatedBy,
        },
        updatedBy,
      )
      setSaveStatus(`Saved as custom template: ${saved.name}`)
      onCustomTemplateSaved?.(saved)
      onModeChange('official')
      onTemplateChange(saved.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save template.')
    }
  }

  const variableOptions = listMailMergeVariablesForAudience(
    audience === 'all' ? variableAudience : audience,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Communication mode">
        <SecondaryButton
          type="button"
          className={
            mode === 'official'
              ? 'border-primary bg-primary/10 text-primary'
              : undefined
          }
          onClick={() => handleModeChange('official')}
        >
          Official Template
        </SecondaryButton>
        <SecondaryButton
          type="button"
          className={
            mode === 'custom' ? 'border-primary bg-primary/10 text-primary' : undefined
          }
          onClick={() => handleModeChange('custom')}
        >
          Custom Communication
        </SecondaryButton>
      </div>

      {mode === 'official' ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="editable-composer-template" className="text-sm font-medium text-text-heading">
            Template
          </label>
          <select
            id="editable-composer-template"
            value={templateId}
            onChange={(event) => onTemplateChange(event.target.value)}
            className={selectClassName}
          >
            <option value="">Choose a template…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.id === recommendedTemplateId ? '★ ' : ''}
                {template.name} ({TEMPLATE_CATEGORY_LABELS[template.category]})
                {template.isOfficial ? ' · Official' : ' · Custom'}
              </option>
            ))}
          </select>
          {recommendedTemplateId && templateId === recommendedTemplateId ? (
            <p className="text-xs text-primary">Digital Rafeeq recommendation selected.</p>
          ) : null}
          {roleHint === 'rukn' ? (
            <p className="text-xs text-secondary">
              Official wording is locked. Fill placeholders, preview, then send.
            </p>
          ) : (
            <p className="text-xs text-secondary">
              Official templates load as a starting point. Edit freely before sending — Save as New
              never overwrites the playbook.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-secondary">
          Blank subject and message. Insert mail-merge variables as needed. Uses the same delivery
          engine.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="editable-composer-subject" className="text-sm font-medium text-text-heading">
          Subject
        </label>
        <input
          id="editable-composer-subject"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          dir="auto"
          readOnly={isBodyLocked}
          className={`${selectClassName} ${isBodyLocked ? 'bg-surface-muted' : ''}`}
          placeholder="Optional subject (supports {{variables}})"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="editable-composer-message" className="text-sm font-medium text-text-heading">
            Message {isBodyLocked ? '(read-only official wording)' : ''}
          </label>
          {!isBodyLocked ? (
            <div className="flex flex-wrap items-center gap-2">
              {audience === 'all' ? (
                <select
                  value={variableAudience}
                  onChange={(event) =>
                    setVariableAudience(event.target.value as MessageRecipientKind)
                  }
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                  aria-label="Variable audience"
                >
                  <option value="karkun">Karkun vars</option>
                  <option value="rukn">Rukn vars</option>
                </select>
              ) : null}
              <select
                defaultValue=""
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                onChange={(event) => {
                  const key = event.target.value
                  if (!key) return
                  insertVariable(key)
                  event.target.value = ''
                }}
                aria-label="Insert mail-merge variable"
              >
                <option value="">Insert variable…</option>
                {variableOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label} ({`{{${item.key}}}`})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <textarea
          ref={bodyRef}
          id="editable-composer-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          rows={8}
          dir="auto"
          readOnly={isBodyLocked}
          className={`${selectClassName} ${isBodyLocked ? 'bg-surface-muted' : ''}`}
          placeholder="Type your message… Use {{RuknName}}, {{CampaignName}}, …"
        />
      </div>

      {!isBodyLocked ? (
        <div className="flex flex-wrap gap-2">
          {canReset ? (
            <SecondaryButton type="button" onClick={handleReset}>
              Reset
            </SecondaryButton>
          ) : null}
          <SecondaryButton type="button" onClick={handleSaveAsNew}>
            Save as New Template
          </SecondaryButton>
        </div>
      ) : null}

      {saveStatus ? <p className="text-sm text-green-700">{saveStatus}</p> : null}
      {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
    </div>
  )
}

/** Refresh template list after save (store may have changed). */
export function refreshComposerTemplates(): MessageTemplate[] {
  return listTemplates()
}
