import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  PERSONAL_MESSAGE_FOOTER,
  OFFICIAL_MESSAGE_FOOTER,
} from '@/data/communication/defaultTemplates'
import {
  AUDIENCE_FILTER_OPTIONS,
  filterTemplatesByAudience,
  resolveTemplateAudience,
  type CommunicationAudience,
} from '@/lib/communication/audiencePresentation'
import { listMailMergeVariablesForAudience } from '@/lib/communication/mailMergeVariables'
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
  WORKFLOW_TEMPLATE_SECTIONS,
  type MessageTemplate,
  type TemplateCategory,
} from '@/types/communication'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const CATEGORIES = Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]

export function TemplateManagementPanel() {
  const [, setVersion] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [audienceFilter, setAudienceFilter] = useState<CommunicationAudience | 'all'>('all')
  const [editorAudience, setEditorAudience] = useState<'karkun' | 'rukn'>('karkun')
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

  const filteredTemplates = useMemo(
    () => filterTemplatesByAudience(templates, audienceFilter),
    [templates, audienceFilter],
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

  const renderTemplateList = (items: MessageTemplate[], heading: string, description?: string) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-text-heading">{heading}</h3>
          {description ? <p className="mt-0.5 text-xs text-secondary">{description}</p> : null}
        </div>
        <ul className="space-y-2">
          {items.map((template) => (
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
                  <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                    {resolveTemplateAudience(template) === 'rukn' ? 'Rukn' : 'Karkun'}
                  </span>
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {TEMPLATE_CATEGORY_LABELS[template.category]}
                  {template.subject ? ` · ${template.subject}` : ''}
                  {' · '}
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
      </div>
    )
  }

  const workflowSectionIds = new Set(WORKFLOW_TEMPLATE_SECTIONS.map((section) => section.id))
  const legacyTemplates = filteredTemplates.filter(
    (template) => !workflowSectionIds.has(template.category),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-secondary">
            Custom Communications and legacy playbook entries. Official Communications live in the
            Communication Workspace library — approved language for اقامتِ دین.
          </p>
          <p className="mt-1 text-xs text-secondary">
            Auto variables: {`{{RuknName}}`} · {`{{KarkunWord}}`} · {`{{AssignedKarkunList}}`} ·{' '}
            {TEMPLATE_PLACEHOLDER_KEYS.map((key) => `{${key}}`).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Hide archived' : 'Show archived'}
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => openEditor()}>
            Custom Communication
          </PrimaryButton>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="template-audience" className="text-xs font-medium text-secondary">
            Audience
          </label>
          <select
            id="template-audience"
            value={audienceFilter}
            onChange={(event) =>
              setAudienceFilter(event.target.value as CommunicationAudience | 'all')
            }
            className={selectClassName}
          >
            {AUDIENCE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

      {audienceFilter === 'all' ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold text-text-heading">
              Workflow Communication Playbook
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Supportive Digital Rafeeq tone — encourage, appreciate, never accuse.
            </p>
          </div>
          {WORKFLOW_TEMPLATE_SECTIONS.map((section) =>
            renderTemplateList(
              filteredTemplates.filter((template) => template.category === section.id),
              section.label,
              section.description,
            ),
          )}
          {renderTemplateList(legacyTemplates, 'Legacy templates', 'Earlier KC-006 library (still available).')}
        </div>
      ) : (
        <div className="space-y-8">
          {WORKFLOW_TEMPLATE_SECTIONS.map((section) =>
            renderTemplateList(
              filteredTemplates.filter((template) => template.category === section.id),
              section.label,
              section.description,
            ),
          )}
          {renderTemplateList(
            filteredTemplates.filter((template) => !workflowSectionIds.has(template.category)),
            audienceFilter === 'rukn' ? 'Other Rukn templates' : 'Other Karkun templates',
          )}
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-muted p-6 text-center text-sm text-secondary">
          No templates for this audience filter.
        </p>
      ) : null}

      {editing !== null && (
        <section className="rounded-(--radius-card) border border-primary/30 bg-surface p-4 shadow-card sm:p-6">
          <h3 className="text-lg font-semibold text-text-heading">
            {editing !== 'new' && editing ? 'Edit Custom Communication' : 'Custom Communication'}
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
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className="text-sm font-medium text-text-heading">Body</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="insert-var-audience" className="text-xs text-secondary">
                    Insert Variable
                  </label>
                  <select
                    id="insert-var-audience"
                    value={editorAudience}
                    onChange={(event) =>
                      setEditorAudience(event.target.value as 'karkun' | 'rukn')
                    }
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                  >
                    <option value="karkun">Karkun</option>
                    <option value="rukn">Rukn</option>
                  </select>
                  <select
                    defaultValue=""
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                    onChange={(event) => {
                      const key = event.target.value
                      if (!key) return
                      setBody((current) => `${current}{{${key}}}`)
                      event.target.value = ''
                    }}
                    aria-label="Insert mail-merge variable"
                  >
                    <option value="">Choose variable…</option>
                    {listMailMergeVariablesForAudience(editorAudience).map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label} ({`{{${item.key}}}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                dir="auto"
                className={selectClassName}
                placeholder="السلام علیکم {{KarkunName}} — or legacy {name}, {campaign}"
              />
              <p className="text-xs text-secondary">
                Do not include footer text — footers are appended automatically by role. Unknown
                placeholders become &quot;-&quot; at send time.
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
              Save Communication
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
