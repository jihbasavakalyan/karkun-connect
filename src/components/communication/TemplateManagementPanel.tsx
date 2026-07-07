import { useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { extractTemplateVariables, saveTemplate } from '@/services/templateService'
import { useCommunication } from '@/hooks/useCommunication'
import {
  TEMPLATE_CATEGORY_LABELS,
  type MessageTemplate,
  type TemplateCategory,
} from '@/types/communication'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const CATEGORIES = Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]

export function TemplateManagementPanel() {
  const { templates } = useCommunication()
  const [editing, setEditing] = useState<MessageTemplate | 'new' | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

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
      setBody('')
    }
    setError('')
  }

  const handleSave = () => {
    try {
      saveTemplate({
        id: editing !== 'new' && editing ? editing.id : undefined,
        name,
        category,
        body,
        variables: extractTemplateVariables(body),
        isActive: true,
        updatedBy: 'Administrator',
      })
      setEditing(null)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save template.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          Manage WhatsApp message templates. Administrators can edit all templates — nothing is
          hardcoded in the UI.
        </p>
        <PrimaryButton type="button" onClick={() => openEditor()}>
          New Template
        </PrimaryButton>
      </div>

      <ul className="space-y-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card"
          >
            <div className="min-w-0">
              <p className="font-semibold text-text-heading">{template.name}</p>
              <p className="mt-1 text-xs text-secondary">
                {TEMPLATE_CATEGORY_LABELS[template.category]} · {template.variables.join(', ') || 'No variables'}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-secondary">{template.body}</p>
            </div>
            <SecondaryButton type="button" className="px-3 py-1.5 text-sm" onClick={() => openEditor(template)}>
              Edit
            </SecondaryButton>
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
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium text-text-heading">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className={selectClassName}
                placeholder="Use {{name}}, {{date}}, etc."
              />
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
