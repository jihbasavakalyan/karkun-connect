/**
 * KC-0091.1 — Green success toast for durable execution saves (3s auto-dismiss).
 */

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  EXECUTION_SAVE_SUCCESS_EVENT,
  type ExecutionSaveSuccessDetail,
} from '@/lib/executionPersistEvents'

const AUTO_DISMISS_MS = 3000

export function ExecutionSaveToast() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const detail = (event as CustomEvent<ExecutionSaveSuccessDetail>).detail
      if (!detail?.message) return
      setMessage(detail.message)
    }
    window.addEventListener(EXECUTION_SAVE_SUCCESS_EVENT, onSuccess)
    return () => window.removeEventListener(EXECUTION_SAVE_SUCCESS_EVENT, onSuccess)
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [message])

  if (!message) {
    return null
  }

  return (
    <div className="execution-save-toast" role="status" aria-live="polite">
      <Icon name="check" size="sm" className="execution-save-toast-icon" aria-hidden="true" />
      <p className="execution-save-toast-message">{message}</p>
    </div>
  )
}
