/** Jamaat-e-Islami Hind logo mark only — no organisation wordmark. */
export function JihLogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label="Jamaat-e-Islami Hind"
    >
      <circle cx="48" cy="48" r="46" fill="#1b4332" />
      <circle cx="48" cy="48" r="40" fill="none" stroke="#c99700" strokeWidth="2.2" />
      <path
        d="M48 18c8 10 14 18 14 28 0 10-6 18-14 28-8-10-14-18-14-28 0-10 6-18 14-28z"
        fill="#d8f3dc"
      />
      <path
        d="M32 50c8-2 12-8 16-16 4 8 8 14 16 16-6 4-12 8-16 18-4-10-10-14-16-18z"
        fill="#fbf3d5"
        opacity="0.92"
      />
      <path
        d="M48 34c2.8 4 5 8 5 12s-2.2 8-5 12c-2.8-4-5-8-5-12s2.2-8 5-12z"
        fill="#1b4332"
      />
    </svg>
  )
}
