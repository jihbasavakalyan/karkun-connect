import type { IconName } from '@/design-system/iconNames'

export type IconSize = 'sm' | 'md' | 'lg' | 'xl'

type IconProps = {
  name: IconName
  size?: IconSize
  className?: string
  label?: string
}

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'ds-icon-sm',
  md: 'ds-icon-md',
  lg: 'ds-icon-lg',
  xl: 'ds-icon-xl',
}

/** Stroke-based 24×24 icons — single family, 2px stroke. */
const STROKE_ICONS: Partial<Record<IconName, string>> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z',
  search:
    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 0a3 3 0 1 0 0-6M22 21v-2a4 4 0 0 0-3-3.87',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 0 1 0-8 4 4 0 0 1 0 8Z',
  chart: 'M3 3v18h18M7 16l4-4 4 4 5-6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  check: 'M20 6 9 17l-5-5',
  refresh: 'M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9v-9',
  clipboard:
    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z',
  location: 'M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Zm0-9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z',
  sparkles: 'M12 2l1.2 3.6L17 7l-3.6 1.2L12 12l-1.2-3.6L7 7l3.6-1.2L12 2ZM5 18l.6 1.8L7.5 20l-1.8.6L5 22.4l-.6-1.8L2.5 20l1.8-.6L5 18Zm14 0 .6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6Z',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  export: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Zm0 0 8 6 8-6',
  megaphone:
    'M3 11v2a1 1 0 0 0 1 1h1l5 5v-14l-5 5H4a1 1 0 0 0-1 1Zm12-2 4.5-2.5a1 1 0 0 1 1.5.87v7.26a1 1 0 0 1-1.5.87L15 13',
  settings:
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v.01M12 18h.01',
  'file-text':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M16 13H8M16 17H8M10 9H8',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z',
  calendar:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  warning: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-5v-5l3-3',
  handshake:
    'M11 17a4 4 0 0 1-4-4V9.5a2.5 2.5 0 0 1 5 0V13M7 13V9.5A2.5 2.5 0 0 1 12 7a2.5 2.5 0 0 1 5 2.5V13a4 4 0 0 1-4 4M8 21h8',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z',
  sprout: 'M7 20h10M12 20V10M12 10C12 4 5 2 5 8c0 2 2 2 7 2M12 10c0-6 7-8 7-2 0 2-2 2-7 2',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12Z M4 22v-7',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  'circle-filled': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  smartphone: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 17h.01',
}

const PULSE_CLASS: Partial<Record<IconName, string>> = {
  'pulse-healthy': 'ds-pulse-dot-healthy',
  'pulse-attention': 'ds-pulse-dot-attention',
  'pulse-critical': 'ds-pulse-dot-critical',
}

export function Icon({ name, size = 'md', className = '', label }: IconProps) {
  const pulseClass = PULSE_CLASS[name]

  if (pulseClass) {
    return (
      <span
        className={[pulseClass, SIZE_CLASS[size], className].filter(Boolean).join(' ')}
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? 'img' : undefined}
      />
    )
  }

  const path = STROKE_ICONS[name]
  if (!path) {
    return null
  }

  if (name === 'circle-filled') {
    return (
      <svg
        className={[SIZE_CLASS[size], 'ds-icon', className].filter(Boolean).join(' ')}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? 'img' : undefined}
      >
        <circle cx="12" cy="12" r="5" />
      </svg>
    )
  }

  return (
    <svg
      className={[SIZE_CLASS[size], 'ds-icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <path d={path} />
    </svg>
  )
}
