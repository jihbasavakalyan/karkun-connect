type ExecutionEmptyStateProps = {
  title: string
  message: string
}

export function ExecutionEmptyState({ title, message }: ExecutionEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-muted px-6 py-8 text-center">
      <h3 className="text-base font-semibold text-text-heading">{title}</h3>
      <p className="mt-2 text-sm text-secondary">{message}</p>
    </div>
  )
}
