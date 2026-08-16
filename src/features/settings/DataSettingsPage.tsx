import { useCallback, useEffect, useState } from 'react'
import { useAppServices } from '../../app/use-app-services'
import type { StoragePersistenceStatus } from '../../shared/storage/persistence'
import type { ImportValidationResult } from '../../sync/export/export-schema'

function formatBytes(value: number | null): string {
  if (value === null) {
    return 'Unknown'
  }
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export function DataSettingsPage() {
  const { storagePersistence, exportService } = useAppServices()
  const [status, setStatus] = useState<StoragePersistenceStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportValidationResult | null>(null)

  const refresh = useCallback(async () => {
    const next = await storagePersistence.getStatus()
    setStatus(next)
  }, [storagePersistence])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onRequestPersistent() {
    setBusy(true)
    setMessage(null)
    try {
      const next = await storagePersistence.requestPersistent()
      setStatus(next)
      setMessage(
        next.persisted
          ? 'Persistent storage granted for this origin.'
          : 'Persistent storage was not granted. Export remains important.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function onExport() {
    setBusy(true)
    setMessage(null)
    try {
      const json = await exportService.exportJsonString(true)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      anchor.href = url
      anchor.download = `pwa-learning-english-export-${stamp}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded. API keys are never included.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function onImportFile(file: File | null) {
    setImportPreview(null)
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      const result = exportService.validateImport(raw)
      setImportPreview(result)
      if (result.ok) {
        setMessage(
          `Import valid (preview only): ${result.summary.providerProfileCount} provider profile(s). Destructive restore is deferred past M0.`,
        )
      } else {
        setMessage(`Import invalid: ${result.issues.join('; ')}`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read import file')
    }
  }

  return (
    <div className="page">
      <h1>Data &amp; Storage</h1>
      <p className="lead">
        IndexedDB is the local source of truth. Persistent storage reduces eviction risk,
        but you can still clear site data — keep exports handy.
      </p>

      {message ? <div className="banner info">{message}</div> : null}

      <section className="card stack">
        <h2>Browser storage</h2>
        <div className="status-grid">
          <div className="status-item">
            <strong>API supported</strong>
            <span className="muted">{status ? (status.supported ? 'Yes' : 'No') : '…'}</span>
          </div>
          <div className="status-item">
            <strong>Persistence state</strong>
            <span className="muted">{status?.state ?? '…'}</span>
          </div>
          <div className="status-item">
            <strong>Persisted</strong>
            <span className="muted">
              {status?.persisted === null || status?.persisted === undefined
                ? 'Unknown'
                : status.persisted
                  ? 'Yes'
                  : 'No'}
            </span>
          </div>
          <div className="status-item">
            <strong>Usage / quota</strong>
            <span className="muted">
              {status
                ? `${formatBytes(status.estimate.usageBytes)} / ${formatBytes(status.estimate.quotaBytes)}`
                : '…'}
            </span>
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !status?.supported || status.persisted === true}
            onClick={() => void onRequestPersistent()}
          >
            Request persistent storage
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void refresh()}>
            Refresh status
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Export</h2>
        <p className="muted" style={{ margin: 0 }}>
          Downloads a versioned JSON envelope of non-secret local data (provider profiles
          and app settings). Credentials are excluded by design.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onExport()}>
            Download export
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Import validation (preview)</h2>
        <p className="muted" style={{ margin: 0 }}>
          M0 validates the export format only. Full destructive restore ships in a later
          durability milestone.
        </p>
        <div className="field">
          <label htmlFor="importFile">Choose export JSON</label>
          <input
            id="importFile"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {importPreview ? (
          <pre className="banner info" style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(
              importPreview.ok
                ? { ok: true, summary: importPreview.summary }
                : { ok: false, issues: importPreview.issues },
              null,
              2,
            )}
          </pre>
        ) : null}
      </section>
    </div>
  )
}
