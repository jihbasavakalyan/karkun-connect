import { useState } from 'react'
import {
  describeConflictPolicy,
  executeMigrationImport,
  exportCurrentDatasetJson,
  exportMigrationDataset,
  listDatasetBackups,
  loadDatasetBackup,
  parseMigrationFile,
  restoreDatasetBackup,
  validateMigrationRows,
} from '@/lib/migration'
import type {
  ConflictResolution,
  MigrationEntityKind,
  MigrationImportPlan,
  MigrationReport,
  MigrationRow,
  MigrationValidationResult,
  MigrationWizardStep,
} from '@/types/dataMigration'
import { MigrationStepIndicator } from '@/components/migration/MigrationStepIndicator'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { GhostButton } from '@/components/ui/GhostButton'
import { Icon } from '@/components/ui/Icon'

const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls'

export function DataMigrationWizard() {
  const [step, setStep] = useState<MigrationWizardStep>(1)
  const [entityKind, setEntityKind] = useState<MigrationEntityKind>('karkun')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<MigrationRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [validation, setValidation] = useState<MigrationValidationResult | null>(null)
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip')
  const [report, setReport] = useState<MigrationReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const backups = listDatasetBackups()

  const resetWizard = () => {
    setStep(1)
    setFileName('')
    setRows([])
    setHeaders([])
    setValidation(null)
    setConflictResolution('skip')
    setReport(null)
    setError('')
  }

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    setError('')
    setIsProcessing(true)
    try {
      const parsed = await parseMigrationFile(file, entityKind)
      setFileName(parsed.fileName)
      setRows(parsed.rows)
      setHeaders(parsed.headers)
      setValidation(null)
      setReport(null)
      setStep(2)
    } catch {
      setError('Could not read the selected file. Check format and UTF-8 encoding.')
    } finally {
      setIsProcessing(false)
    }
  }

  const runValidation = () => {
    const result = validateMigrationRows(rows, headers, entityKind, fileName)
    setValidation(result)
    setStep(3)
  }

  const goToConflicts = () => {
    if (!validation?.canProceed) return
    setStep(validation.conflicts.length > 0 ? 4 : 5)
  }

  const runImport = () => {
    if (!validation) return

    const plan: MigrationImportPlan = {
      entityKind,
      rows,
      conflictResolution,
      validation,
      approvedByUser: true,
    }

    setIsProcessing(true)
    const result = executeMigrationImport(plan)
    setReport(result)
    setIsProcessing(false)
    setStep(6)
  }

  return (
    <section className="ds-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ds-section-title">Data Migration</h2>
          <p className="ds-section-subtitle">
            Import production Rukn or Karkun master data with validation, conflict handling, and
            automatic backup.
          </p>
        </div>
        {step > 1 && step < 6 && (
          <GhostButton type="button" onClick={resetWizard}>
            Start Over
          </GhostButton>
        )}
      </div>

      <MigrationStepIndicator currentStep={step} />

      {error && <p className="ds-banner-error mt-4">{error}</p>}

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <div className="ds-form-field">
            <span className="ds-label">Import type</span>
            <div className="flex flex-wrap gap-2">
              {(['rukn', 'karkun'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    entityKind === kind
                      ? 'border-primary bg-primary-muted text-primary'
                      : 'border-border bg-surface text-secondary'
                  }`}
                  onClick={() => setEntityKind(kind)}
                >
                  {kind === 'rukn' ? 'Rukn Master' : 'Karkun Master'}
                </button>
              ))}
            </div>
          </div>

          <div className="ds-form-field">
            <label htmlFor="migration-file" className="ds-label">
              Select file (CSV or Excel)
            </label>
            <input
              id="migration-file"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="ds-input"
              disabled={isProcessing}
              onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
            />
            <p className="ds-helper">
              UTF-8 CSV or .xlsx. Kannada, Urdu, and English text are supported. Import never runs
              immediately after file selection.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
              <dt className="ds-text-caption">File</dt>
              <dd className="ds-text-label mt-1">{fileName}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
              <dt className="ds-text-caption">Rows detected</dt>
              <dd className="ds-text-label mt-1">{rows.length}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
              <dt className="ds-text-caption">Columns</dt>
              <dd className="ds-text-label mt-1">{headers.join(', ')}</dd>
            </div>
          </dl>

          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="ds-table-cell">Row</th>
                  <th className="ds-table-cell">Name</th>
                  <th className="ds-table-cell">Gender</th>
                  <th className="ds-table-cell">Mobile</th>
                  <th className="ds-table-cell">Place</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row) => (
                  <tr key={row.rowNumber} className="ds-table-row">
                    <td className="ds-table-cell">{row.rowNumber}</td>
                    <td className="ds-table-cell">{row.name}</td>
                    <td className="ds-table-cell">{row.gender || '—'}</td>
                    <td className="ds-table-cell">{row.mobile || '—'}</td>
                    <td className="ds-table-cell">{row.place || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setStep(1)}>
              Back
            </SecondaryButton>
            <PrimaryButton type="button" onClick={runValidation}>
              Continue to Validation
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 3 && validation && (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total rows" value={validation.totalRows} />
            <StatCard label="Valid rows" value={validation.validRows} tone="success" />
            <StatCard label="Errors" value={validation.errors.length} tone="danger" />
            <StatCard label="Warnings" value={validation.warnings.length} tone="warning" />
            <StatCard label="Duplicates" value={validation.conflicts.length} />
            <StatCard label="Blank rows" value={validation.blankRows} />
          </dl>

          {validation.errors.length > 0 && (
            <IssueList title="Errors" issues={validation.errors} />
          )}
          {validation.warnings.length > 0 && (
            <IssueList title="Warnings" issues={validation.warnings.slice(0, 20)} />
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SecondaryButton type="button" onClick={() => setStep(2)}>
              Back
            </SecondaryButton>
            <PrimaryButton type="button" onClick={goToConflicts} disabled={!validation.canProceed}>
              {validation.canProceed ? 'Continue' : 'Fix errors to continue'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 4 && validation && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-secondary">
            {validation.conflicts.length} record(s) match existing {entityKind} data. Choose how to
            handle conflicts before import.
          </p>

          <div className="space-y-2">
            {(
              [
                ['skip', 'Skip duplicates'],
                ['replace', 'Replace existing'],
                ['merge', 'Merge non-conflicting fields'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                  conflictResolution === value
                    ? 'border-primary bg-primary-muted/30'
                    : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="conflict-policy"
                  checked={conflictResolution === value}
                  onChange={() => setConflictResolution(value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-text-heading">{label}</span>
                  <span className="mt-1 block text-sm text-secondary">
                    {describeConflictPolicy(value)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="ds-table-wrap max-h-56 overflow-y-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="ds-table-cell">Row</th>
                  <th className="ds-table-cell">Import</th>
                  <th className="ds-table-cell">Existing</th>
                  <th className="ds-table-cell">Fields</th>
                </tr>
              </thead>
              <tbody>
                {validation.conflicts.slice(0, 15).map((conflict) => (
                  <tr key={conflict.row} className="ds-table-row">
                    <td className="ds-table-cell">{conflict.row}</td>
                    <td className="ds-table-cell">{conflict.name}</td>
                    <td className="ds-table-cell">
                      {conflict.existingName} ({conflict.existingId})
                    </td>
                    <td className="ds-table-cell">
                      {conflict.fieldsToChange.length > 0
                        ? conflict.fieldsToChange.join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setStep(3)}>
              Back
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => setStep(5)}>
              Continue to Import
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 5 && validation && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary-muted/20 p-4 text-sm">
            <p className="font-medium text-text-heading">Ready to import</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary">
              <li>{validation.validRows} valid rows will be processed</li>
              <li>Conflict policy: {describeConflictPolicy(conflictResolution)}</li>
              <li>A timestamped JSON backup is created automatically before import</li>
              <li>Import is rolled back if every row fails</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setStep(validation.conflicts.length ? 4 : 3)}>
              Back
            </SecondaryButton>
            <PrimaryButton type="button" loading={isProcessing} onClick={runImport}>
              Run Import
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 6 && report && (
        <div className="mt-4 space-y-4">
          <div className={report.rolledBack ? 'ds-banner-error' : 'ds-banner-success'}>
            {report.message}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Imported" value={report.imported} tone="success" />
            <StatCard label="Updated" value={report.updated} />
            <StatCard label="Skipped" value={report.skipped} />
            <StatCard label="Duplicates" value={report.duplicates} tone="warning" />
            <StatCard label="Errors" value={report.errors} tone="danger" />
            <StatCard label="Warnings" value={report.warnings} tone="warning" />
            <StatCard label="Duration" value={`${report.durationMs} ms`} />
            <StatCard label="Backup" value={report.backupId ? 'Created' : '—'} />
          </dl>

          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={resetWizard}>
              Import Another File
            </SecondaryButton>
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <h3 className="ds-text-card-title">Backup &amp; Export</h3>
        <p className="mt-1 text-sm text-secondary">
          Export the current dataset or restore from a recent automatic backup.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={exportCurrentDatasetJson}>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="export" size="sm" />
              Export JSON Backup
            </span>
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={() => exportMigrationDataset(['rukn', 'karkun', 'connections', 'campaign'], 'excel')}
          >
            Export Excel Workbook
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={() => exportMigrationDataset(['rukn'], 'csv')}
          >
            Export Rukn CSV
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={() => exportMigrationDataset(['karkun'], 'csv')}
          >
            Export Karkun CSV
          </SecondaryButton>
        </div>

        {backups.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {backups.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span>
                  {entry.label} — {new Date(entry.timestamp).toLocaleString()}
                </span>
                <SecondaryButton
                  type="button"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => {
                    const backup = loadDatasetBackup(entry.id)
                    if (backup) {
                      restoreDatasetBackup(backup)
                      setReport({
                        entityKind,
                        imported: 0,
                        updated: 0,
                        skipped: 0,
                        duplicates: 0,
                        errors: 0,
                        warnings: 0,
                        durationMs: 0,
                        backupId: entry.id,
                        backupTimestamp: entry.timestamp,
                        rolledBack: false,
                        message: 'Dataset restored from backup.',
                      })
                      setStep(6)
                    }
                  }}
                >
                  Restore
                </SecondaryButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-green-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-text-heading'

  return (
    <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
      <dt className="ds-text-caption">{label}</dt>
      <dd className={`ds-text-label mt-1 ${toneClass}`}>{value}</dd>
    </div>
  )
}

function IssueList({
  title,
  issues,
}: {
  title: string
  issues: MigrationValidationResult['issues']
}) {
  return (
    <div>
      <h3 className="font-semibold text-text-heading">{title}</h3>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-secondary">
        {issues.map((issue, index) => (
          <li key={`${issue.row}-${issue.code}-${index}`}>
            Row {issue.row || '—'}: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
