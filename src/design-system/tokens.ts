/**
 * Karkun Connect Design System — frozen tokens (M6.5).
 * CSS custom properties live in src/index.css @theme.
 * Use these constants for programmatic access and documentation parity.
 */

export const colors = {
  primary: '#1b4332',
  primaryHover: '#2d6a4f',
  primaryLight: '#40916c',
  primaryMuted: '#d8f3dc',
  secondary: '#64748b',
  secondaryLight: '#94a3b8',
  success: '#15803d',
  successSoft: '#f0fdf4',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  info: '#1d4ed8',
  infoSoft: '#eff6ff',
  surface: '#ffffff',
  surfaceMuted: '#f4f5f7',
  background: '#f5f3ef',
  border: '#e2e5ea',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
} as const

/**
 * Authenticated chrome only — Claude institutional language.
 * Deep navy / slate rail + restrained teal accent; feature CTAs keep `colors.primary`.
 */
export const shell = {
  rail: '#0f172a',
  railHover: '#1e293b',
  railBorder: '#334155',
  railText: '#e2e8f0',
  railTextMuted: '#94a3b8',
  /** Restrained teal — secondary emphasis on shell surfaces (not nav current). */
  accentTeal: '#0f766e',
  accentTealSoft: '#ccfbf1',
  current: '#c99700',
  currentFg: '#1a1408',
  canvas: '#f5f3ef',
  ink: '#0f172a',
  attention: '#b4533a',
} as const

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const

export const shadow = {
  card: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
  cardHover: '0 2px 8px -2px rgb(15 23 42 / 0.08)',
  enterprise: '0 8px 24px -12px rgb(15 23 42 / 0.12)',
  /** Kept for legacy class names; prefer border surfaces over glass. */
  glass: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
} as const

export const transition = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '300ms ease',
} as const

export const zIndex = {
  dropdown: 20,
  sticky: 20,
  overlay: 30,
  modal: 40,
  fab: 30,
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const

export const typography = {
  hero: { size: '1.5rem', weight: 700, lineHeight: 1.25 },
  pageTitle: { size: '1.75rem', weight: 600, lineHeight: 1.3 },
  sectionTitle: { size: '1.125rem', weight: 600, lineHeight: 1.35 },
  cardTitle: { size: '1rem', weight: 600, lineHeight: 1.4 },
  body: { size: '0.9375rem', weight: 400, lineHeight: 1.6 },
  secondary: { size: '0.875rem', weight: 400, lineHeight: 1.5 },
  caption: { size: '0.75rem', weight: 500, lineHeight: 1.4 },
  label: { size: '0.875rem', weight: 500, lineHeight: 1.4 },
  button: { size: '0.875rem', weight: 600, lineHeight: 1 },
} as const
