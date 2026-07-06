export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Settings</h1>
        <p className="mt-2 text-secondary">Application preferences and configuration.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">General</h2>
        <p className="mt-2 text-sm text-secondary">
          Settings will be available in a future sprint.
        </p>
      </section>
    </div>
  )
}
