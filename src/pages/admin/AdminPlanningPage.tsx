/**
 * Phase 1 — Admin planning experience.
 * Meqati Mansooba → Objectives + Unit / Scope.
 * Calls getRepositories() directly (TASK-008: no service layer).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import type {
  MeqatiMansooba,
  MeqatiMansoobaStatus,
  PlanningObjective,
  PlanningObjectiveStatus,
  Unit,
  UnitStatus,
} from '@/types/planning.types'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'mb-1 block text-sm font-medium text-text-heading'

function newPlanningId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function isSuccessMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('saved') || lower.includes('created') || lower.includes('updated')
}

function formatRepoError(error: { message?: string } | undefined): string {
  return error?.message?.trim() || 'Unable to save. Please try again.'
}

type MansoobaFormState = {
  name: string
  status: MeqatiMansoobaStatus
  startDate: string
  endDate: string
  primaryUnitId: string
  summary: string
}

type ObjectiveFormState = {
  title: string
  description: string
  status: PlanningObjectiveStatus
  sortOrder: string
}

type UnitFormState = {
  name: string
  status: UnitStatus
  placeAliases: string
}

const emptyMansoobaForm = (): MansoobaFormState => ({
  name: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  primaryUnitId: '',
  summary: '',
})

const emptyObjectiveForm = (): ObjectiveFormState => ({
  title: '',
  description: '',
  status: 'active',
  sortOrder: '',
})

const emptyUnitForm = (): UnitFormState => ({
  name: '',
  status: 'active',
  placeAliases: '',
})

export function AdminPlanningPage() {
  const { user } = useAuth()
  const { run, busy } = useBusyAction()
  const actor = user?.displayName?.trim() || user?.email?.trim() || 'Administrator'

  const [mansoobas, setMansoobas] = useState<MeqatiMansooba[]>([])
  const [objectives, setObjectives] = useState<PlanningObjective[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedMansoobaId, setSelectedMansoobaId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const [mansoobaModal, setMansoobaModal] = useState<'create' | 'edit' | null>(null)
  const [editingMansoobaId, setEditingMansoobaId] = useState<string | null>(null)
  const [mansoobaForm, setMansoobaForm] = useState<MansoobaFormState>(emptyMansoobaForm)

  const [objectiveModal, setObjectiveModal] = useState<'create' | 'edit' | null>(null)
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null)
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormState>(emptyObjectiveForm)

  const [unitModal, setUnitModal] = useState<'create' | 'edit' | null>(null)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm)

  const refresh = useCallback(() => {
    const repos = getRepositories()
    const nextMansoobas = [
      ...unwrapRepository(repos.meqatiMansooba.loadAll(), []),
    ]
    const nextObjectives = [
      ...unwrapRepository(repos.objective.loadAll(), []),
    ]
    const nextUnits = [...unwrapRepository(repos.unit.loadAll(), [])]
    setMansoobas(nextMansoobas)
    setObjectives(nextObjectives)
    setUnits(nextUnits)

    setSelectedMansoobaId((current) => {
      if (current && nextMansoobas.some((row) => row.id === current)) return current
      const active = unwrapRepository(repos.meqatiMansooba.getActive(), undefined)
      if (active) return active.id
      return nextMansoobas[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectedMansooba = useMemo(
    () => mansoobas.find((row) => row.id === selectedMansoobaId) ?? null,
    [mansoobas, selectedMansoobaId],
  )

  const selectedObjectives = useMemo(() => {
    if (!selectedMansoobaId) return []
    return objectives
      .filter((row) => row.mansoobaId === selectedMansoobaId)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
  }, [objectives, selectedMansoobaId])

  const unitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const unit of units) map.set(unit.id, unit.name)
    return map
  }, [units])

  const openCreateMansooba = () => {
    setEditingMansoobaId(null)
    setMansoobaForm(emptyMansoobaForm())
    setMansoobaModal('create')
    setMessage('')
  }

  const openEditMansooba = (row: MeqatiMansooba) => {
    setEditingMansoobaId(row.id)
    setMansoobaForm({
      name: row.name,
      status: row.status,
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
      primaryUnitId: row.primaryUnitId ?? '',
      summary: row.summary ?? '',
    })
    setMansoobaModal('edit')
    setMessage('')
  }

  const saveMansooba = () => {
    void run(
      async () => {
        const name = mansoobaForm.name.trim()
        if (!name) {
          setMessage('Mansooba name is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingMansoobaId
          ? mansoobas.find((row) => row.id === editingMansoobaId)
          : undefined
        const record: MeqatiMansooba = {
          id: existing?.id ?? newPlanningId('mansooba'),
          name,
          status: mansoobaForm.status,
          startDate: mansoobaForm.startDate.trim() || undefined,
          endDate: mansoobaForm.endDate.trim() || undefined,
          primaryUnitId: mansoobaForm.primaryUnitId.trim() || undefined,
          summary: mansoobaForm.summary.trim() || undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().meqatiMansooba.saveDurable(record)
        if (!result.ok) {
          setMessage(formatRepoError(result.error))
          return
        }
        setMansoobaModal(null)
        setSelectedMansoobaId(record.id)
        refresh()
        setMessage(existing ? 'Mansooba updated.' : 'Mansooba created.')
      },
      { key: 'planning.mansooba.save' },
    )
  }

  const openCreateObjective = () => {
    if (!selectedMansoobaId) {
      setMessage('Select or create a Mansooba first.')
      return
    }
    setEditingObjectiveId(null)
    setObjectiveForm(emptyObjectiveForm())
    setObjectiveModal('create')
    setMessage('')
  }

  const openEditObjective = (row: PlanningObjective) => {
    setEditingObjectiveId(row.id)
    setObjectiveForm({
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : '',
    })
    setObjectiveModal('edit')
    setMessage('')
  }

  const saveObjective = () => {
    void run(
      async () => {
        if (!selectedMansoobaId) {
          setMessage('Select a Mansooba first.')
          return
        }
        const title = objectiveForm.title.trim()
        if (!title) {
          setMessage('Objective title is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingObjectiveId
          ? objectives.find((row) => row.id === editingObjectiveId)
          : undefined
        const sortRaw = objectiveForm.sortOrder.trim()
        const sortOrder = sortRaw === '' ? undefined : Number(sortRaw)
        const record: PlanningObjective = {
          id: existing?.id ?? newPlanningId('objective'),
          mansoobaId: selectedMansoobaId,
          title,
          description: objectiveForm.description.trim() || undefined,
          status: objectiveForm.status,
          sortOrder:
            sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
          legacyKey: existing?.legacyKey,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().objective.saveDurable(record)
        if (!result.ok) {
          setMessage(formatRepoError(result.error))
          return
        }
        setObjectiveModal(null)
        refresh()
        setMessage(existing ? 'Objective updated.' : 'Objective created.')
      },
      { key: 'planning.objective.save' },
    )
  }

  const openCreateUnit = () => {
    setEditingUnitId(null)
    setUnitForm(emptyUnitForm())
    setUnitModal('create')
    setMessage('')
  }

  const openEditUnit = (row: Unit) => {
    setEditingUnitId(row.id)
    setUnitForm({
      name: row.name,
      status: row.status,
      placeAliases: (row.placeAliases ?? []).join(', '),
    })
    setUnitModal('edit')
    setMessage('')
  }

  const saveUnit = () => {
    void run(
      async () => {
        const name = unitForm.name.trim()
        if (!name) {
          setMessage('Unit name is required.')
          return
        }
        const now = new Date().toISOString()
        const existing = editingUnitId
          ? units.find((row) => row.id === editingUnitId)
          : undefined
        const aliases = unitForm.placeAliases
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
        const record: Unit = {
          id: existing?.id ?? newPlanningId('unit'),
          name,
          status: unitForm.status,
          placeAliases: aliases.length > 0 ? aliases : undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? actor,
          updatedBy: actor,
        }
        const result = await getRepositories().unit.saveDurable(record)
        if (!result.ok) {
          setMessage(formatRepoError(result.error))
          return
        }
        setUnitModal(null)
        refresh()
        setMessage(existing ? 'Unit updated.' : 'Unit created.')
      },
      { key: 'planning.unit.save' },
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Planning"
        description="Configure Meqati Mansooba, Objectives, and Unit scope. Admin configures — Rukn acts later."
      />

      {message ? (
        <p
          className={`mb-4 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-8">
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Meqati Mansooba</h2>
              <p className="mt-1 text-sm text-secondary">
                Planning root. Objectives belong to the selected Mansooba.
              </p>
            </div>
            <PrimaryButton type="button" onClick={openCreateMansooba}>
              New Mansooba
            </PrimaryButton>
          </div>

          {mansoobas.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">No Mansooba yet. Create the first plan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {mansoobas.map((row) => {
                const selected = row.id === selectedMansoobaId
                return (
                  <li
                    key={row.id}
                    className={`rounded-lg border p-4 ${
                      selected
                        ? 'border-primary bg-primary-muted/40'
                        : 'border-border bg-surface-muted'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedMansoobaId(row.id)}
                      >
                        <p className="font-semibold text-text-heading">{row.name}</p>
                        <p className="mt-1 text-xs text-secondary">
                          {row.status}
                          {row.startDate || row.endDate
                            ? ` · ${row.startDate || '—'} → ${row.endDate || '—'}`
                            : ''}
                          {row.primaryUnitId
                            ? ` · Unit: ${unitNameById.get(row.primaryUnitId) ?? row.primaryUnitId}`
                            : ''}
                        </p>
                        {row.summary ? (
                          <p className="mt-2 text-sm text-secondary">{row.summary}</p>
                        ) : null}
                      </button>
                      <SecondaryButton type="button" onClick={() => openEditMansooba(row)}>
                        Edit
                      </SecondaryButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Objectives</h2>
              <p className="mt-1 text-sm text-secondary">
                {selectedMansooba
                  ? `Under Mansooba: ${selectedMansooba.name}`
                  : 'Select a Mansooba to manage its Objectives.'}
              </p>
            </div>
            <PrimaryButton
              type="button"
              onClick={openCreateObjective}
              disabled={!selectedMansoobaId}
            >
              New Objective
            </PrimaryButton>
          </div>

          {!selectedMansoobaId ? (
            <p className="mt-4 text-sm text-secondary">No Mansooba selected.</p>
          ) : selectedObjectives.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">
              No Objectives for this Mansooba yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedObjectives.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div>
                    <p className="font-semibold text-text-heading">{row.title}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {row.status}
                      {row.sortOrder != null ? ` · order ${row.sortOrder}` : ''}
                    </p>
                    {row.description ? (
                      <p className="mt-2 text-sm text-secondary">{row.description}</p>
                    ) : null}
                  </div>
                  <SecondaryButton type="button" onClick={() => openEditObjective(row)}>
                    Edit
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Unit / Scope</h2>
              <p className="mt-1 text-sm text-secondary">
                Flat scope only (e.g. Basavakalyan). No hierarchy.
              </p>
            </div>
            <PrimaryButton type="button" onClick={openCreateUnit}>
              New Unit
            </PrimaryButton>
          </div>

          {units.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">No Units yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {units.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div>
                    <p className="font-semibold text-text-heading">{row.name}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {row.status}
                      {row.placeAliases?.length
                        ? ` · aliases: ${row.placeAliases.join(', ')}`
                        : ''}
                    </p>
                  </div>
                  <SecondaryButton type="button" onClick={() => openEditUnit(row)}>
                    Edit
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        isOpen={mansoobaModal != null}
        title={mansoobaModal === 'edit' ? 'Edit Mansooba' : 'New Mansooba'}
        onClose={() => setMansoobaModal(null)}
        footer={
          <ModalFormFooter
            onCancel={() => setMansoobaModal(null)}
            primaryLabel={mansoobaModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveMansooba}
            loading={busy}
            primaryDisabled={busy || !mansoobaForm.name.trim()}
          />
        }
      >
        <ModalFormSection title="Details">
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="mansooba-name">
                Name
              </label>
              <input
                id="mansooba-name"
                className={inputClassName}
                value={mansoobaForm.name}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-status">
                Status
              </label>
              <select
                id="mansooba-status"
                className={inputClassName}
                value={mansoobaForm.status}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({
                    ...prev,
                    status: event.target.value as MeqatiMansoobaStatus,
                  }))
                }
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-start">
                Start date
              </label>
              <input
                id="mansooba-start"
                type="date"
                className={inputClassName}
                value={mansoobaForm.startDate}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-end">
                End date
              </label>
              <input
                id="mansooba-end"
                type="date"
                className={inputClassName}
                value={mansoobaForm.endDate}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-unit">
                Primary Unit (optional)
              </label>
              <select
                id="mansooba-unit"
                className={inputClassName}
                value={mansoobaForm.primaryUnitId}
                onChange={(event) =>
                  setMansoobaForm((prev) => ({
                    ...prev,
                    primaryUnitId: event.target.value,
                  }))
                }
              >
                <option value="">—</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="mansooba-summary">
              Summary
            </label>
            <textarea
              id="mansooba-summary"
              className={inputClassName}
              rows={3}
              value={mansoobaForm.summary}
              onChange={(event) =>
                setMansoobaForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={objectiveModal != null}
        title={objectiveModal === 'edit' ? 'Edit Objective' : 'New Objective'}
        onClose={() => setObjectiveModal(null)}
        footer={
          <ModalFormFooter
            onCancel={() => setObjectiveModal(null)}
            primaryLabel={objectiveModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveObjective}
            loading={busy}
            primaryDisabled={busy || !objectiveForm.title.trim() || !selectedMansoobaId}
          />
        }
      >
        <ModalFormSection title="Details">
          <p className="mb-4 text-sm text-secondary">
            Mansooba:{' '}
            <span className="font-medium text-text-heading">
              {selectedMansooba?.name ?? '—'}
            </span>
          </p>
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="objective-title">
                Title
              </label>
              <input
                id="objective-title"
                className={inputClassName}
                value={objectiveForm.title}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="objective-status">
                Status
              </label>
              <select
                id="objective-status"
                className={inputClassName}
                value={objectiveForm.status}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({
                    ...prev,
                    status: event.target.value as PlanningObjectiveStatus,
                  }))
                }
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="objective-order">
                Sort order
              </label>
              <input
                id="objective-order"
                type="number"
                className={inputClassName}
                value={objectiveForm.sortOrder}
                onChange={(event) =>
                  setObjectiveForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              />
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="objective-description">
              Description
            </label>
            <textarea
              id="objective-description"
              className={inputClassName}
              rows={3}
              value={objectiveForm.description}
              onChange={(event) =>
                setObjectiveForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>

      <Modal
        isOpen={unitModal != null}
        title={unitModal === 'edit' ? 'Edit Unit' : 'New Unit'}
        onClose={() => setUnitModal(null)}
        footer={
          <ModalFormFooter
            onCancel={() => setUnitModal(null)}
            primaryLabel={unitModal === 'edit' ? 'Save' : 'Create'}
            onPrimaryClick={saveUnit}
            loading={busy}
            primaryDisabled={busy || !unitForm.name.trim()}
          />
        }
      >
        <ModalFormSection title="Details">
          <ModalFormGrid>
            <div>
              <label className={labelClassName} htmlFor="unit-name">
                Name
              </label>
              <input
                id="unit-name"
                className={inputClassName}
                value={unitForm.name}
                onChange={(event) =>
                  setUnitForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="unit-status">
                Status
              </label>
              <select
                id="unit-status"
                className={inputClassName}
                value={unitForm.status}
                onChange={(event) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    status: event.target.value as UnitStatus,
                  }))
                }
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </ModalFormGrid>
          <div className="mt-4">
            <label className={labelClassName} htmlFor="unit-aliases">
              Place aliases (comma-separated)
            </label>
            <input
              id="unit-aliases"
              className={inputClassName}
              placeholder="Basavakalyan"
              value={unitForm.placeAliases}
              onChange={(event) =>
                setUnitForm((prev) => ({ ...prev, placeAliases: event.target.value }))
              }
            />
          </div>
        </ModalFormSection>
      </Modal>
    </PageShell>
  )
}
