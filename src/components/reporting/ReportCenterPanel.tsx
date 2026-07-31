import { useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAuth } from '@/hooks/useAuth'
import {
  buildReportPreview,
  defaultKc034Config,
  getReportType,
  KC034_EXECUTIVE_SECTION_ID,
  listEnabledReportPresets,
  listReportTypes,
  listSectionsForReportType,
  type ReportConfig,
  type ReportDateRangeKind,
  type ReportDetailLevel,
  type ReportLanguage,
  type ReportOutputType,
  type ReportScope,
  type ReportTheme,
  type ReportTypeId,
} from '@/lib/reporting/v2'
import { generateConfiguredReport } from '@/lib/reporting/v2/generateConfiguredReport'

const SCOPES: Array<{ id: ReportScope; label: string }> = [
  { id: 'overall_campaign', label: 'Entire Campaign' },
  { id: 'mens_wing', label: 'Men' },
  { id: 'womens_wing', label: 'Women' },
  { id: 'combined', label: 'Combined' },
  { id: 'selected_rukn', label: 'Specific Rukn' },
  { id: 'selected_halqa', label: 'Specific Halqa' },
  { id: 'selected_ward', label: 'Specific Ward' },
  { id: 'individual_rukn', label: 'Specific Individual (Rukn)' },
  { id: 'individual_karkun', label: 'Specific Individual (Karkun)' },
  { id: 'entire_registry', label: 'Entire Registry' },
  { id: 'connected_only', label: 'Connected Only' },
  { id: 'available_only', label: 'Available Only' },
  { id: 'muttafiqeen_only', label: 'Muttafiqeen Only' },
]

const DATE_KINDS: Array<{ id: ReportDateRangeKind; label: string }> = [
  { id: 'snapshot', label: 'Snapshot (now)' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'current_week', label: 'Current Week' },
  { id: 'previous_week', label: 'Previous Week' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'campaign_duration', label: 'Campaign Duration' },
  { id: 'custom_range', label: 'Custom Date Range' },
  { id: 'all_time', label: 'All Time' },
]

const DETAIL_LEVELS: Array<{ id: ReportDetailLevel; label: string; hint: string }> = [
  { id: 'executive', label: 'Executive', hint: 'One-page management density' },
  { id: 'standard', label: 'Standard', hint: 'Current KC-034 equivalent' },
  { id: 'detailed', label: 'Detailed', hint: 'Expanded statistics' },
  { id: 'audit', label: 'Audit', hint: 'Full appendix density' },
]

const OUTPUTS: Array<{ id: ReportOutputType; label: string; enabled: boolean }> = [
  { id: 'pdf', label: 'PDF', enabled: true },
  { id: 'dashboard', label: 'Dashboard', enabled: false },
  { id: 'excel', label: 'Excel', enabled: false },
  { id: 'csv', label: 'CSV', enabled: false },
  { id: 'json', label: 'JSON', enabled: false },
]

function FieldLabel({ children }: { children: string }) {
  return <label className="mb-1 block text-sm font-medium text-secondary">{children}</label>
}

function SelectField<T extends string>(props: {
  label: string
  value: T
  options: Array<{ id: T; label: string; disabled?: boolean }>
  onChange: (value: T) => void
}) {
  return (
    <div>
      <FieldLabel>{props.label}</FieldLabel>
      <select
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.options.map((opt) => (
          <option key={opt.id} value={opt.id} disabled={opt.disabled}>
            {opt.label}
            {opt.disabled ? ' (soon)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * KC-037B — Report Center configuration workspace.
 * Driven by report-type / section / preset registries — no hardcoded section lists.
 */
export function ReportCenterPanel() {
  const { user } = useAuth()
  const [config, setConfig] = useState<ReportConfig>(() => defaultKc034Config())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reportTypes = useMemo(() => listReportTypes(), [])
  const presets = useMemo(() => listEnabledReportPresets(), [])
  const sections = useMemo(
    () => listSectionsForReportType(config.reportType),
    [config.reportType],
  )
  const preview = useMemo(() => buildReportPreview(config), [config])
  const typeDef = getReportType(config.reportType)
  const canGenerate =
    Boolean(typeDef?.available && typeDef.featureFlag) &&
    config.outputType === 'pdf' &&
    preview.diagnostics.ok

  const patch = (partial: Partial<ReportConfig>) => {
    setConfig((prev) => defaultKc034Config({ ...prev, ...partial }))
    setError('')
    setSuccess('')
  }

  const onReportTypeChange = (id: ReportTypeId) => {
    const next = getReportType(id)
    if (!next) return
    const typeSections = listSectionsForReportType(id)
    const defaultSections = next.sectionIds.filter((sid) => {
      const s = typeSections.find((x) => x.id === sid)
      return s?.defaultEnabled || sid === KC034_EXECUTIVE_SECTION_ID
    })
    patch({
      reportType: id,
      scope: next.defaultScope,
      detailLevel: next.defaultDetailLevel,
      outputType: next.defaultOutput,
      enabledSections:
        id === 'executive_campaign'
          ? [KC034_EXECUTIVE_SECTION_ID]
          : defaultSections.length
            ? defaultSections
            : next.sectionIds.slice(0, 1),
      presetId: undefined,
    })
  }

  const toggleSection = (sectionId: string, enabled: boolean, selectable: boolean) => {
    if (!selectable) return
    const set = new Set(config.enabledSections)
    if (enabled) set.add(sectionId)
    else {
      if (sectionId === KC034_EXECUTIVE_SECTION_ID && config.reportType === 'executive_campaign') {
        return
      }
      set.delete(sectionId)
    }
    patch({ enabledSections: [...set] })
  }

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    patch({ ...preset.config, presetId: preset.id })
  }

  const onGenerate = () => {
    setBusy(true)
    setError('')
    setSuccess('')
    void generateConfiguredReport({
      config,
      generatedBy: user?.displayName?.trim() || user?.email || user?.phone || 'منتظم',
    })
      .then(() => {
        setSuccess('Report generated successfully.')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Report generation failed.')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-primary">Presets</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm ${
                  config.presetId === p.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-secondary hover:border-primary/40'
                }`}
                onClick={() => applyPreset(p.id)}
              >
                {p.title}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
          <h2 className="text-base font-semibold text-primary">Configuration</h2>
          <SelectField
            label="Report type"
            value={config.reportType}
            onChange={onReportTypeChange}
            options={reportTypes.map((t) => ({
              id: t.id,
              label: t.title,
              disabled: !t.available || !t.featureFlag,
            }))}
          />
          <SelectField
            label="Scope"
            value={config.scope}
            onChange={(scope) => patch({ scope })}
            options={SCOPES.map((s) => ({ id: s.id, label: s.label }))}
          />
          <SelectField
            label="Date range"
            value={config.dateRange.kind}
            onChange={(kind) =>
              patch({
                dateRange:
                  kind === 'custom_range'
                    ? {
                        kind,
                        startIso: config.dateRange.startIso ?? '',
                        endIso: config.dateRange.endIso ?? '',
                      }
                    : { kind },
              })
            }
            options={DATE_KINDS.map((d) => ({ id: d.id, label: d.label }))}
          />
          {config.dateRange.kind === 'custom_range' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Start date</FieldLabel>
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={config.dateRange.startIso ?? ''}
                  onChange={(e) =>
                    patch({
                      dateRange: {
                        kind: 'custom_range',
                        startIso: e.target.value,
                        endIso: config.dateRange.endIso,
                      },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>End date</FieldLabel>
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={config.dateRange.endIso ?? ''}
                  onChange={(e) =>
                    patch({
                      dateRange: {
                        kind: 'custom_range',
                        startIso: config.dateRange.startIso,
                        endIso: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          <div>
            <FieldLabel>Detail level</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {DETAIL_LEVELS.map((d) => (
                <label
                  key={d.id}
                  className={`flex cursor-pointer flex-col rounded-md border px-3 py-2 text-sm ${
                    config.detailLevel === d.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-primary">
                    <input
                      type="radio"
                      name="detailLevel"
                      checked={config.detailLevel === d.id}
                      onChange={() => patch({ detailLevel: d.id })}
                    />
                    {d.label}
                  </span>
                  <span className="mt-1 text-xs text-secondary">{d.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Output format</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {OUTPUTS.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="radio"
                    name="output"
                    disabled={!o.enabled}
                    checked={config.outputType === o.id}
                    onChange={() => patch({ outputType: o.id })}
                  />
                  {o.label}
                  {!o.enabled ? <span className="text-xs text-secondary">(soon)</span> : null}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Language"
              value={config.language}
              onChange={(language: ReportLanguage) => patch({ language })}
              options={[
                { id: 'ur', label: 'Urdu' },
                { id: 'en', label: 'English' },
                { id: 'bilingual', label: 'Bilingual', disabled: true },
              ]}
            />
            <SelectField
              label="Theme"
              value={config.theme}
              onChange={(theme: ReportTheme) => patch({ theme })}
              options={[
                { id: 'classic_urdu', label: 'Default (Classic Urdu)' },
                { id: 'executive', label: 'Executive' },
                { id: 'minimal', label: 'Minimal' },
                { id: 'default', label: 'Neutral Default' },
              ]}
            />
          </div>

          <div>
            <FieldLabel>Options</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['confidentialWatermark', 'Confidential watermark'],
                  ['showCharts', 'Show charts'],
                  ['showRankings', 'Show rankings'],
                  ['showAppendix', 'Show appendix'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={config.options[key]}
                    onChange={(e) =>
                      patch({
                        options: { ...config.options, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="radio"
                  name="orientation"
                  checked={config.options.orientation === 'portrait'}
                  onChange={() =>
                    patch({ options: { ...config.options, orientation: 'portrait' } })
                  }
                />
                Portrait
              </label>
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="radio"
                  name="orientation"
                  checked={config.options.orientation === 'landscape'}
                  onChange={() =>
                    patch({ options: { ...config.options, orientation: 'landscape' } })
                  }
                />
                Landscape
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-base font-semibold text-primary">Sections</h2>
          <p className="mb-3 text-xs text-secondary">
            Driven by the Section Registry for the selected report type. Planned sections are
            visible but not selectable until implemented.
          </p>
          <ul className="space-y-2">
            {sections.map((section) => {
              const selectable =
                section.featureFlag && section.status === 'active' && Boolean(section.buildModel)
              const checked = config.enabledSections.includes(section.id)
              return (
                <li key={section.id}>
                  <label
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                      selectable ? 'border-border' : 'border-dashed border-border/70 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={!selectable}
                      checked={checked}
                      onChange={(e) => toggleSection(section.id, e.target.checked, selectable)}
                    />
                    <span>
                      <span className="font-medium text-primary">
                        {section.title ?? section.displayName}
                      </span>
                      <span className="mt-0.5 block text-xs text-secondary">
                        {section.description}
                        {!selectable ? ' · Coming soon' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-primary">Preview</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-secondary">Report title</dt>
              <dd className="font-medium text-primary">{preview.reportTitle}</dd>
            </div>
            <div>
              <dt className="text-secondary">Scope</dt>
              <dd className="text-primary">{preview.scopeLabel}</dd>
            </div>
            <div>
              <dt className="text-secondary">Date range</dt>
              <dd className="text-primary">{preview.dateRangeLabel}</dd>
            </div>
            <div>
              <dt className="text-secondary">Output · Language · Detail</dt>
              <dd className="text-primary">
                {preview.outputType} · {preview.language} · {preview.detailLevel}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">Estimated pages</dt>
              <dd className="text-primary">{preview.estimatedPages}</dd>
            </div>
            <div>
              <dt className="text-secondary">Sections included</dt>
              <dd className="text-primary">
                <ul className="mt-1 list-inside list-disc">
                  {preview.sectionsIncluded.map((s) => (
                    <li key={s.id}>
                      {s.title}
                      {s.active ? '' : ' (preview only)'}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-muted/40 p-3 text-xs text-secondary">
            {preview.connectionVsVisitNote}
          </p>
          {preview.diagnostics.errors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-danger">
              {preview.diagnostics.errors.map((e) => (
                <li key={`${e.code}-${e.message}`}>{e.message}</li>
              ))}
            </ul>
          ) : null}
          {preview.diagnostics.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-secondary">
              {preview.diagnostics.warnings.map((w) => (
                <li key={`${w.code}-${w.message}`}>{w.message}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
            <PrimaryButton
              type="button"
              loading={busy}
              disabled={!canGenerate || busy}
              onClick={onGenerate}
            >
              Generate PDF
            </PrimaryButton>
            {!typeDef?.available ? (
              <p className="mt-2 text-xs text-secondary">
                This report type is registered but not available yet.
              </p>
            ) : null}
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            {success ? <p className="mt-2 text-sm text-success">{success}</p> : null}
          </div>
        </section>
      </aside>
    </div>
  )
}
