/**
 * KC-035R1 — Development-only Digital Rafeeq diagnostic overlay.
 * Hidden automatically in production builds (`import.meta.env.PROD`).
 */

import { useEffect, useState } from 'react'
import {
  getPipelineDiagSnapshot,
  subscribePipelineDiag,
  type PipelineDiagSnapshot,
} from './voicePipelineDiag'

export function RafeeqDiagOverlay() {
  const [snap, setSnap] = useState<PipelineDiagSnapshot>(() =>
    getPipelineDiagSnapshot(),
  )

  useEffect(() => subscribePipelineDiag(setSnap), [])

  if (import.meta.env.PROD) return null
  if (!snap.transcript && snap.stages.length === 0) return null

  return (
    <aside
      className="rafeeq-diag-overlay"
      aria-label="Rafeeq pipeline diagnostics"
      data-testid="rafeeq-diag-overlay"
    >
      <p className="rafeeq-diag-title">Rafeeq Diag (DEV)</p>
      <dl className="rafeeq-diag-grid">
        <div>
          <dt>Transcript</dt>
          <dd>{snap.transcript || '—'}</dd>
        </div>
        <div>
          <dt>Intent</dt>
          <dd>{snap.intent || '—'}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>
            {snap.confidence != null
              ? `${snap.confidence.toFixed(2)} (${snap.confidenceBand ?? '—'})`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>{snap.workflow || '—'}</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{snap.action || '—'}</dd>
        </div>
        <div>
          <dt>Execution</dt>
          <dd>{snap.executionResult || '—'}</dd>
        </div>
        <div>
          <dt>Secretary</dt>
          <dd>{snap.secretaryReply || '—'}</dd>
        </div>
        <div>
          <dt>TTS</dt>
          <dd>{snap.ttsStatus}</dd>
        </div>
        {snap.stoppedAt ? (
          <div>
            <dt>Stopped at</dt>
            <dd>{snap.stoppedAt}</dd>
          </div>
        ) : null}
      </dl>
      {snap.stages.length > 0 ? (
        <ul className="rafeeq-diag-stages">
          {snap.stages.map((stage) => (
            <li key={`${stage.stage}-${stage.processingMs}`}>
              {stage.success ? '✓' : '✗'} {stage.stage} ({stage.processingMs}ms)
              {stage.failure ? ` — ${stage.failure}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      <style>{`
        .rafeeq-diag-overlay {
          position: fixed;
          z-index: 99999;
          inset-inline-end: 12px;
          inset-block-end: 12px;
          max-width: min(360px, calc(100vw - 24px));
          max-height: 45vh;
          overflow: auto;
          background: rgba(15, 23, 42, 0.92);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 10px;
          padding: 10px 12px;
          font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          pointer-events: none;
        }
        .rafeeq-diag-title {
          margin: 0 0 8px;
          font-weight: 700;
          color: #93c5fd;
        }
        .rafeeq-diag-grid {
          display: grid;
          gap: 4px;
          margin: 0;
        }
        .rafeeq-diag-grid div {
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 6px;
        }
        .rafeeq-diag-grid dt {
          margin: 0;
          color: #94a3b8;
        }
        .rafeeq-diag-grid dd {
          margin: 0;
          word-break: break-word;
        }
        .rafeeq-diag-stages {
          margin: 8px 0 0;
          padding: 0;
          list-style: none;
          color: #cbd5e1;
        }
      `}</style>
    </aside>
  )
}
