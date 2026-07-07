import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { ExportFormat } from '@/lib/peopleImportExport'
import type { PersonGender } from '@/types/karkun-registry.types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type KarkunPeopleActionBarProps = {
  onAddMale: () => void
  onAddFemale: () => void
  onAssign: () => void
  onImport: (file: File) => void
  onExport: (format: ExportFormat) => void
}

const menuItemClassName =
  'block w-full rounded-lg px-3 py-2 text-left text-sm text-text-heading hover:bg-surface-muted'

export function KarkunPeopleActionBar({
  onAddMale,
  onAddFemale,
  onAssign,
  onImport,
  onExport,
}: KarkunPeopleActionBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImport(file)
      event.target.value = ''
    }
  }

  const handleAdd = (gender: PersonGender) => {
    if (gender === 'Male') {
      onAddMale()
    } else {
      onAddFemale()
    }
    setAddMenuOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={addMenuRef} className="relative">
        <PrimaryButton
          type="button"
          className="px-4 py-2 text-sm"
          onClick={() => setAddMenuOpen((open) => !open)}
        >
          + Add Karkun
        </PrimaryButton>
        {addMenuOpen && (
          <div className="absolute right-0 z-30 mt-2 min-w-[12rem] rounded-(--radius-card) border border-border bg-surface p-2 shadow-card sm:left-0 sm:right-auto">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
              Add Karkun
            </p>
            <button type="button" className={menuItemClassName} onClick={() => handleAdd('Male')}>
              Male Karkun
            </button>
            <button type="button" className={menuItemClassName} onClick={() => handleAdd('Female')}>
              Female Karkun
            </button>
          </div>
        )}
      </div>

      <SecondaryButton type="button" className="px-4 py-2 text-sm" onClick={onAssign}>
        Connect Karkun
      </SecondaryButton>

      <SecondaryButton
        type="button"
        className="px-4 py-2 text-sm"
        onClick={() => fileInputRef.current?.click()}
      >
        Import
      </SecondaryButton>

      <div ref={moreMenuRef} className="relative">
        <SecondaryButton
          type="button"
          className="px-4 py-2 text-sm"
          onClick={() => setMoreMenuOpen((open) => !open)}
        >
          More {moreMenuOpen ? '▲' : '▼'}
        </SecondaryButton>
        {moreMenuOpen && (
          <div className="absolute right-0 z-30 mt-2 min-w-[10rem] rounded-(--radius-card) border border-border bg-surface p-2 shadow-card">
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                onExport('csv')
                setMoreMenuOpen(false)
              }}
            >
              Export CSV
            </button>
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                onExport('excel')
                setMoreMenuOpen(false)
              }}
            >
              Export Excel
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx,.txt"
        className="hidden"
        aria-label="Import Karkun file"
        onChange={handleImportChange}
      />
    </div>
  )
}
