import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

type OtpBoxesProps = {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  error?: string
}

const LENGTH = 6

export function OtpBoxes({ value, onChange, disabled, error }: OtpBoxesProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.replace(/\D/g, '').slice(0, LENGTH).split('')

  const setDigit = (index: number, digit: string) => {
    const next = Array.from({ length: LENGTH }, (_, i) => digits[i] ?? '')
    next[index] = digit
    onChange(next.join(''))
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigit(index, '')
      return
    }
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, LENGTH)
      onChange(pasted)
      const focusAt = Math.min(pasted.length, LENGTH - 1)
      inputs.current[focusAt]?.focus()
      return
    }
    setDigit(index, cleaned)
    if (index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      setDigit(index - 1, '')
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!text) return
    event.preventDefault()
    onChange(text)
    inputs.current[Math.min(text.length, LENGTH - 1)]?.focus()
  }

  return (
    <div onPaste={handlePaste}>
      <div className="flex justify-center gap-2 sm:gap-3">
        {Array.from({ length: LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node
            }}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`OTP digit ${index + 1}`}
            maxLength={1}
            disabled={disabled}
            value={digits[index] ?? ''}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={[
              'h-14 w-11 rounded-2xl border bg-white text-center text-xl font-semibold text-primary shadow-sm sm:h-16 sm:w-12',
              error ? 'border-red-300' : 'border-[#e5e7de]',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            ].join(' ')}
          />
        ))}
      </div>
      {error ? <p className="mt-3 text-center text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
