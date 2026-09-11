import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/**
 * Compact Home entry for Jamaat-wide Meeqati Mansooba.
 * Year/status figures and شعبہ-wise tables live on the dedicated page.
 */
export function RuknHomeMeqatiMansooba() {
  return (
    <section
      className="rukn-home-card rukn-org-card"
      aria-labelledby="rukn-home-meqati-mansooba-title"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-meqati-mansooba-title" className="rukn-home-card-title">
          میقاتی منصوبہ
        </h2>
        <p className="rukn-home-card-sub">Meeqati Mansooba — Jamaat-wide plan</p>
      </header>

      <p className="rukn-home-card-sub">
        جماعت بھر کی میقاتی منصوبہ معلومات الگ صفحے پر دستیاب ہیں۔
      </p>

      <p className="rukn-org-links">
        <Link to={ROUTES.RUKN_MEQATI_MANSOOBA}>میقاتی منصوبہ</Link>
      </p>
    </section>
  )
}
