import { useAuth } from '@/hooks/useAuth'

/** Returns the authenticated Rukn scope, or null when missing (never use demo fallback). */
export function useRequiredRuknId(): string | null {
  const { user } = useAuth()
  return user?.ruknId ?? null
}
