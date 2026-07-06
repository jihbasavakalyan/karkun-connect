import { useRef } from 'react'
import type { ExportFormat } from '@/lib/peopleImportExport'
import type { PersonKind } from '@/types/people.types'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type ImportExportToolbarProps = {
  kind: PersonKind
  onExport: (format: ExportFormat) => void
  onImport: (file: File) => void
}

export function ImportExportToolbar({ kind, onExport, onImport }: ImportExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImport(file)
      event.target.value = ''
    }
  }

  const label = kind === 'rukn' ? 'Rukn' : 'Karkun'

  return (
    <div className="flex flex-wrap gap-2">
      <SecondaryButton type="button" className="text-sm" onClick={() => onExport('csv')}>
        Export CSV
      </SecondaryButton>
      <SecondaryButton type="button" className="text-sm" onClick={() => onExport('excel')}>
        Export Excel
      </SecondaryButton>
      <SecondaryButton
        type="button"
        className="text-sm"
        onClick={() => fileInputRef.current?.click()}
      >
        Import CSV/Excel
      </SecondaryButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx,.txt"
        className="hidden"
        aria-label={`Import ${label} file`}
        onChange={handleFileChange}
      />
    </div>
  )
}
