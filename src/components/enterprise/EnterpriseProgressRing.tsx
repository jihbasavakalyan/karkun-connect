type EnterpriseProgressRingProps = {
  value: number
  label: string
  size?: number
}

export function EnterpriseProgressRing({
  value,
  label,
  size = 120,
}: EnterpriseProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-surface-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary-light transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-text-heading">{clamped}%</span>
        </div>
      </div>
      {label && <span className="text-center text-[10px] font-medium text-secondary">{label}</span>}
    </div>
  )
}
