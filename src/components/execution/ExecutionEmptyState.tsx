import { EmptyState } from '@/components/ui/EmptyState'

type ExecutionEmptyStateProps = {
  title: string
  message: string
}

export function ExecutionEmptyState({ title, message }: ExecutionEmptyStateProps) {
  return <EmptyState icon="clipboard" title={title} description={message} />
}
