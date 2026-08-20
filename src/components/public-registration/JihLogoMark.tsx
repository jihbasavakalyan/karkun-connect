/** Official Jamaat-e-Islami Hind logo — supplied raster asset, used as-is. */
export const JIH_OFFICIAL_LOGO_SRC = '/branding/jih-official-logo.png'

export function JihLogoMark({ className = '' }: { className?: string }) {
  return (
    <img
      src={JIH_OFFICIAL_LOGO_SRC}
      alt="Jamaat-e-Islami Hind"
      className={['h-auto w-full object-contain', className].filter(Boolean).join(' ')}
    />
  )
}
