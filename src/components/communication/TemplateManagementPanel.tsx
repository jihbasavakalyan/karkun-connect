import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  PERSONAL_MESSAGE_FOOTER,
  OFFICIAL_MESSAGE_FOOTER,
} from '@/data/communication/defaultTemplates'
import {
  archiveTemplate,
  composeWhatsAppMessage,
  extractTemplateVariables,
  listTemplates,
  restoreTemplate,
  saveTemplate,
} from '@/services/templateService'
import { subscribeToCommunicationStore } from '@/stores/communicationStore'
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_PLACEHOLDER_KEYS,
  type MessageTemplate,
  type TemplateCategory,
} from '@/types/communication'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const CATEGORIES = Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]

export function TemplateManagementPanel() {
  const [, setVersion] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<MessageTemplate | 'new' | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [previewName, setPreviewName] = useState('احمد')

  useEffect(() => {
    return subscribeToCommunicationStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const templates = listTemplates({ includeArchived: showArchived }).filter((template) =>
    showArchived ? true : template.isActive !== false,
  )

  const openEditor = (template?: MessageTemplate) => {
    if (template) {
      setEditing(template)
      setName(template.name)
      setCategory(template.category)
      setBody(template.body)
    } else {
      setEditing('new')
      setName('')
      setCategory('custom')
      setBody('السلام علیکم {name}\n\n')
    }
    setError('')
  }

  const preview = useMemo(() => {
    if (!body.trim()) return ''
    return composeWhatsAppMessage(
      body,
      {
        name: previewName,
        date: '۲۵ جولائی',
        time: 'بعد از نماز مغرب',
        venue: 'مرکزی مسجد',
        event: 'تربیتی نشست',
        month: 'جولائی',
        campaign: 'کارکن رابطہ مہم',
      },
      'official',
    )
  }, [body, previewName])

  const handleSave = () => {
    try {
      const existing = editing !== 'new' && editing ? editing : undefined
      saveTemplate({
        id: existing?.id,
        name,
        category,
        body,
        variables: extractTemplateVariables(body),
        isActive: existing?.isActive ?? true,
        isOfficial: existing?.isOfficial ?? false,
        footerMode: existing?.footerMode ?? 'personal',
        updatedBy: 'Administrator',
      })
      setEditing(null)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save template.')
    }
  }

  const handleArchive = (template: MessageTemplate) => {
    try {
      if (template.isActive === false) {
        restoreTemplate(template.id)
      } else {
        archiveTemplate(template.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update template.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-secondary">
            Official WhatsApp templates (Version 1). Administrators may create, edit, archive,
            categorize, and preview. Rukn cannot change official wording.
          </p>
          <p className="mt-1 text-xs text-secondary">
            Placeholders: {TEMPLATE_PLACEHOLDER_KEYS.map((key) => `{${key}}`).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Hide archived' : 'Show archived'}
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => openEditor()}>
            New Template
          </PrimaryButton>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-text-heading">Footer policy</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">Personal (Rukn)</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-text-heading">{PERSONAL_MESSAGE_FOOTER}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">Official (Administrator)</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-text-heading">{OFFICIAL_MESSAGE_FOOTER}</pre>
          </div>
        </div>
      </details>

      <ul className="space-y-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card"
          >
            <div className="min-w-0">
              <p className="font-semibold text-text-heading">
                {template.name}
                {template.isOfficial ? (
                  <span className="ml-2 rounded-full bg-primary-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Official
                  </span>
                ) : null}
                {template.isActive === false ? (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                    Archived
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {TEMPLATE_CATEGORY_LABELS[template.category]} ·{' '}
                {template.variables.join(', ') || 'No variables'}
              </p>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-secondary" dir="auto">
                {template.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                type="button"
                className="px-3 py-1.5 text-sm"
                onClick={() => openEditor(template)}
              >
                Edit
              </SecondaryButton>
              <SecondaryButton
                type="button"
                className="px-3 py-1.5 text-sm"
                onClick={() => handleArchive(template)}
              >
                {template.isActive === false ? 'Restore' : 'Archive'}
              </SecondaryButton>
            </div>
          </li>
        ))}
      </ul>

      {editing !== null && (
        <section className="rounded-(--radius-card) border border-primary/30 bg-surface p-4 shadow-card sm:p-6">
          <h3 className="text-lg font-semibold text-text-heading">
            {editing !== 'new' && editing ? 'Edit Template' : 'New Template'}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium text-text-heading">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={selectClassName} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-heading">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className={selectClassName}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {TEMPLATE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-heading">Preview name</label>
              <input
                value={previewName}
                onChange={(e) => setPreviewName(e.target.value)}
                className={selectClassName}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium text-text-heading">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                dir="auto"
                className={selectClassName}
                placeholder="السلام علیکم {name} — use {date}, {time}, {venue}, {event}, {month}, {campaign}"
              />
              <p className="text-xs text-secondary">
                Do not include footer text — footers are appended automatically by role.
              </p>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border bg-surface-muted p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                Preview (Administrator footer)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-heading" dir="auto">
                {preview}
              </p>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton type="button" onClick={handleSave}>
              Save Template
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEditing(null)}>
              Cancel
            </SecondaryButton>
          </div>
        </section>
      )}
    </div>
  )
}
