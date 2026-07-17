/**
 * Shared Mission Control progress ring (presentation only).
 */

type McProgressRingProps = {
  value: number
  size?: number
  stroke?: number
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'neutral'
  label?: string
  sublabel?: string
}

const TONE_STROKE: Record<NonNullable<McProgressRingProps['tone']>, string> = {
  green: '#16a34a',
  blue: '#2563eb',
  amber: '#d97706',
  red: '#dc2626',
  purple: '#7c3aed',
  neutral: '#64748b',
}

export function McProgressRing({
  value,
  size = 88,
  stroke = 8,
  tone = 'green',
  label,
  sublabel,
}: McProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="mc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="mc-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="mc-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="mc-ring-center">
        {label ? <span className="mc-ring-label">{label}</span> : <span className="mc-ring-label">{clamped}%</span>}
        {sublabel ? <span className="mc-ring-sub">{sublabel}</span> : null}
      </div>
    </div>
  )
}

export function leaderboardStatus(completionPct: number): {
  tone: 'green' | 'amber' | 'red'
  label: string
  emoji: string
} {
  if (completionPct >= 70) {
    return { tone: 'green', label: 'Excellent', emoji: '🟢' }
  }
  if (completionPct >= 40) {
    return { tone: 'amber', label: 'Needs Attention', emoji: '🟡' }
  }
  return { tone: 'red', label: 'Critical', emoji: '🔴' }
}
