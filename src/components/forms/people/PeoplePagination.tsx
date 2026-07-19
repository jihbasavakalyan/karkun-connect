import { SecondaryButton } from '@/components/ui/SecondaryButton'

type PeoplePaginationProps = {
  currentPage: number
  totalPages: number
  totalRecords: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PeoplePagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
}: PeoplePaginationProps) {
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalRecords)

  return (
    <div className="list-footer-controls flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-secondary">
        Showing {start}–{end} of {totalRecords}
      </p>
      <div className="flex items-center gap-2">
        <SecondaryButton
          type="button"
          className="px-3 py-2 text-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </SecondaryButton>
        <span className="text-sm text-secondary">
          Page {currentPage} of {totalPages}
        </span>
        <SecondaryButton
          type="button"
          className="px-3 py-2 text-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </SecondaryButton>
      </div>
    </div>
  )
}
