import { SecondaryButton } from '@/components/ui/SecondaryButton'

type KarkunanPaginationProps = {
  currentPage: number
  totalPages: number
  totalRecords: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function KarkunanPagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
}: KarkunanPaginationProps) {
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalRecords)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-secondary">
        Showing {start}–{end} of {totalRecords} Karkunan
      </p>

      <div className="flex items-center gap-2">
        <SecondaryButton
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-2 text-sm"
        >
          Previous
        </SecondaryButton>

        <span className="px-3 text-sm font-medium text-text-heading">
          Page {currentPage} of {totalPages}
        </span>

        <SecondaryButton
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 text-sm"
        >
          Next
        </SecondaryButton>
      </div>
    </div>
  )
}
