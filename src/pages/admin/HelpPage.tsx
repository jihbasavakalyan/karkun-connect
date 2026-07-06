export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Help</h1>
        <p className="mt-2 text-secondary">Guidance for using Karkun Connect.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Campaign Workflow</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-secondary">
          <li>Set up your campaign under Campaign</li>
          <li>Assign Karkun to Rukn under the Rukn module</li>
          <li>Execute meetings and reports under Execution</li>
          <li>Review progress under Review & Reports</li>
          <li>Track follow-ups under Follow-up & Development</li>
        </ol>
      </section>
    </div>
  )
}
