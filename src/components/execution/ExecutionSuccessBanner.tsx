import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type ExecutionSuccessBannerProps = {
  message?: string
}

export function ExecutionSuccessBanner({ message }: ExecutionSuccessBannerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const bannerMessage =
    message ?? (location.state as { successMessage?: string } | null)?.successMessage

  useEffect(() => {
    if (!bannerMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      navigate(location.pathname + location.search, { replace: true, state: null })
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [bannerMessage, location.pathname, location.search, navigate])

  if (!bannerMessage) {
    return null
  }

  return (
    <div
      className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      role="status"
    >
      {bannerMessage}
    </div>
  )
}
