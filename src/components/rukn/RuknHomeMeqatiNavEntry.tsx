import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/** Compact Home entry — details live on the Meeqati Mansooba destination. */
export function RuknHomeMeqatiNavEntry() {
  return (
    <Link
      to={ROUTES.RUKN_MEQATI_MANSOOBA}
      className="rukn-home-nav-entry"
      aria-label="Meeqati Mansooba, میقاتی ذمہ داری"
    >
      <span className="rukn-home-nav-entry-ur" dir="rtl" lang="ur">
        میقاتی منصوبہ
      </span>
      <span className="rukn-home-nav-entry-en">Meeqati Mansooba</span>
      <span className="rukn-home-nav-entry-hint">میقاتی ذمہ داری</span>
    </Link>
  )
}
