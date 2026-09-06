import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import {
  formatReferringRuknSummary,
  matchReferringRuknQuery,
  type ReferringRuknOption,
} from '@/lib/referringRukn'

type ReferringRuknSearchFieldProps = {
  id: string
  label: string
  value: string
  onChange: (ruknId: string) => void
  options: ReferringRuknOption[]
  selectedFallback?: ReferringRuknOption
  required?: boolean
  disabled?: boolean
  variant?: 'admin' | 'public'
}

export function ReferringRuknSearchField({
  id,
  label,
  value,
  onChange,
  options,
  selectedFallback,
  required = false,
  disabled = false,
  variant = 'admin',
}: ReferringRuknSearchFieldProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const selected =
    options.find((rukn) => rukn.id === value) ??
    (selectedFallback?.id === value ? selectedFallback : undefined)

  const filteredOptions = useMemo(() => {
    return options.filter((rukn) => matchReferringRuknQuery(rukn, query))
  }, [options, query])

  useEffect(() => {
    if (!isOpen || !inputRef.current) return

    const updatePosition = () => {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      const width = Math.max(rect.width, 224)
      const preferredTop = rect.bottom + 4
      const maxHeight = 280
      const spaceBelow = window.innerHeight - preferredTop - 8
      const openUpward = spaceBelow < 160 && rect.top > spaceBelow
      const top = openUpward ? Math.max(8, rect.top - maxHeight - 4) : preferredTop
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8),
      )
      setMenuStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight,
        zIndex: 80,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
      setQuery('')
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (ruknId: string) => {
    onChange(ruknId)
    setIsOpen(false)
    setQuery('')
  }

  const inputClass =
    variant === 'public'
      ? 'w-full rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-[#f3f4ef]'
      : FORM_INPUT_CLASS
  const labelClass =
    variant === 'public' ? 'mb-2 block text-sm font-medium text-slate-800' : FORM_LABEL_CLASS

  const displayValue = isOpen
    ? query
    : selected
      ? formatReferringRuknSummary(selected)
      : value
        ? value
        : ''

  const menu = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          style={menuStyle}
          className="overflow-hidden rounded-lg border border-border bg-surface shadow-card"
        >
          <ul className="max-h-64 overflow-y-auto py-1 text-sm">
            {filteredOptions.map((rukn) => (
              <li key={rukn.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === rukn.id}
                  className={`w-full px-3 py-2 text-left hover:bg-surface-muted ${
                    value === rukn.id
                      ? 'bg-surface-muted font-medium text-primary'
                      : 'text-text-heading'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(rukn.id)}
                >
                  <span className="block">{formatReferringRuknSummary(rukn)}</span>
                  {rukn.mobile ? (
                    <span className="mt-0.5 block text-xs font-normal text-secondary">
                      {rukn.mobile}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-secondary">No matching Rukn / A Rukn.</li>
            ) : null}
          </ul>
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className={inputClass}
        value={displayValue}
        disabled={disabled}
        placeholder="Search by name, ID, or mobile"
        onFocus={() => {
          if (disabled) return
          setIsOpen(true)
          setQuery('')
        }}
        onChange={(event) => {
          setIsOpen(true)
          setQuery(event.target.value)
          if (value) onChange('')
        }}
      />
      <input id={`${id}-value`} type="hidden" value={value} required={required} readOnly />
      {menu}
    </div>
  )
}
