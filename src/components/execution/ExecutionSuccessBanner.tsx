import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type ExecutionSuccessBannerProps = {
  message?: string
}

type SuccessLocationState = {
  successMessage?: string
  nextActionLabel?: string
  nextActionRoute?: string
} | null

export function ExecutionSuccessBanner({ message }: ExecutionSuccessBannerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as SuccessLocationState
  const bannerMessage = message ?? state?.successMessage
  const nextLabel = state?.nextActionLabel
  const nextRoute = state?.nextActionRoute

  useEffect(() => {
    if (!bannerMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      navigate(location.pathname + location.search + location.hash, {
        replace: true,
        state: null,
      })
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [bannerMessage, location.hash, location.pathname, location.search, navigate])

  if (!bannerMessage) {
    return null
  }

  return (
    <div
      className="workflow-success-banner"
      role="status"
    >
      <p className="workflow-success-message">{bannerMessage}</p>
      {nextLabel && nextRoute && nextRoute !== location.pathname + location.hash ? (
        <Link to={nextRoute} className="workflow-success-cta" replace>
          {nextLabel} →
        </Link>
      ) : null}
    </div>
  )
}
